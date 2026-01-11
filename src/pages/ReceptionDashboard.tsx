import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Employee, Appointment } from '../types';
import { Loader2, Search, SlidersHorizontal, MapPin, X, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { Modal } from '../components/Layout/Modal';
import { AppointmentForm } from '../components/Forms/AppointmentForm';
import { format, parseISO } from 'date-fns';

export default function ReceptionDashboard() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleTargetEmployee, setScheduleTargetEmployee] = useState<Employee | null>(null);
  const [busyEmployeeIds, setBusyEmployeeIds] = useState<Set<string>>(new Set());
  const [selectedEmployeeAppointments, setSelectedEmployeeAppointments] = useState<Appointment[]>([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>(undefined);

  const fetchEmployees = async () => {
    // 1. Fetch Employees
    const { data: emps, error } = await supabase
      .from('employees')
      .select('*, departments(name)')
      .order('full_name');
    
    if (error || !emps) {
      setLoading(false);
      return;
    }

    setEmployees(emps as any);

    // 2. Fetch Active Appointments (NOW)
    const now = new Date().toISOString();
    const { data: activeAppts } = await supabase
      .from('appointments')
      .select('host_id')
      .lte('start_time', now)
      .gt('end_time', now);
    
    if (activeAppts) {
      const busyIds = new Set(activeAppts.map(a => a.host_id));
      setBusyEmployeeIds(busyIds);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();

    // Refresh status every minute to keep "current status" accurate
    const interval = setInterval(fetchEmployees, 60000);

    // Realtime subscription
    const channel = supabase
      .channel('public:employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => {
        fetchEmployees(); 
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        fetchEmployees();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch appointments when selected employee changes
  useEffect(() => {
    if (selectedEmployee) {
        setLoadingAppts(true);
        const today = new Date().toISOString().split('T')[0];
        supabase
            .from('appointments')
            .select('*')
            .eq('host_id', selectedEmployee.id)
            .gte('start_time', `${today}T00:00:00`)
            .lte('start_time', `${today}T23:59:59`)
            .order('start_time')
            .then(({ data, error }) => {
                if (!error && data) {
                    setSelectedEmployeeAppointments(data as any);
                }
                setLoadingAppts(false);
            });
    } else {
        setSelectedEmployeeAppointments([]);
    }
  }, [selectedEmployee]);

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(filter.toLowerCase()) ||
    (emp as any).departments?.name?.toLowerCase().includes(filter.toLowerCase())
  );

  const getComputedStatus = (emp: Employee) => {
    // If has active appointment, override status to BUSY
    if (busyEmployeeIds.has(emp.id)) {
      return 'busy';
    }
    return emp.status;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'available': return 'bg-green-100 text-green-700 border-green-200';
      case 'busy': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'meeting': return 'bg-red-100 text-red-700 border-red-200';
      case 'out_of_office': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  const getStatusLabel = (status: string) => {
      switch(status) {
      case 'available': return 'Disponível';
      case 'busy': return 'Ocupado';
      case 'meeting': return 'Em Reunião';
      case 'out_of_office': return 'Ausente';
      default: return status;
    }
  }

  if (loading) {
     return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-blue-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* ... (Search bar section remains same) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Visão Geral</h1>
          <p className="text-gray-500">Acompanhe o status da equipe em tempo real</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input 
              type="text"
              placeholder="Buscar funcionário..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button className="h-12 w-12 flex items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm text-gray-700 active:bg-gray-50">
            <SlidersHorizontal className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 md:gap-6">
        {filteredEmployees.map((emp) => {
          const status = getComputedStatus(emp);
          return (
            <div 
              key={emp.id} 
              onClick={() => setSelectedEmployee(emp)}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 active:scale-[0.98] transition-all touch-manipulation cursor-pointer hover:shadow-md hover:border-blue-100"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {emp.photo_url ? <img src={emp.photo_url} className="h-full w-full object-cover" /> : <span className="text-xl font-bold text-gray-400">{emp.full_name.charAt(0)}</span>}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 leading-tight mb-1">{emp.full_name}</h3>
                    <p className="text-sm text-gray-500">{(emp as any).departments?.name || 'Geral'}</p>
                  </div>
                </div>
              </div>
              
              <div className={cn("px-4 py-2 rounded-xl text-sm font-semibold border inline-flex items-center gap-2", getStatusColor(status))}>
                <span className="relative flex h-3 w-3">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", status === 'available' ? 'bg-green-400' : 'bg-transparent')}></span>
                  <span className={cn("relative inline-flex rounded-full h-3 w-3", status === 'available' ? 'bg-green-500' : 'bg-current')}></span>
                </span>
                {getStatusLabel(status)}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center text-sm text-gray-500">
                <MapPin className="h-4 w-4 mr-2" />
                <span>Escritório Central</span>
              </div>
            </div>
          );
        })}
        {/* ... (Empty state) */}
      </div>

      {/* Employee Details Modal / Drawer */}
      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedEmployee(null)} />
          
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-10 fade-in duration-200 mt-4 md:mt-0 max-h-[85vh] md:max-h-[90vh] flex flex-col">
            <div className="p-6 md:p-8 overflow-y-auto flex-1">
               <div className="flex justify-between items-start mb-6">
                  <div className="flex gap-4">
                     <div className="h-20 w-20 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden text-2xl font-bold text-gray-400">
                        {selectedEmployee.photo_url ? <img src={selectedEmployee.photo_url} className="h-full w-full object-cover" /> : selectedEmployee.full_name.charAt(0)}
                     </div>
                     <div>
                        <h2 className="text-2xl font-bold text-gray-900">{selectedEmployee.full_name}</h2>
                        <p className="text-gray-500">{(selectedEmployee as any).departments?.name || 'Departamento Geral'}</p>
                        <div className={cn("mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex border", getStatusColor(getComputedStatus(selectedEmployee)))}>
                           {getStatusLabel(getComputedStatus(selectedEmployee))}
                        </div>
                     </div>
                  </div>
                  <button 
                    onClick={() => setSelectedEmployee(null)}
                    className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                  >
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
               </div>

               <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                     <CalendarIcon className="h-5 w-5 text-blue-600" />
                     Próximos Compromissos
                  </h3>
                  
                   <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 max-h-60 overflow-y-auto">
                     {loadingAppts ? (
                        <div className="flex justify-center p-4"><Loader2 className="animate-spin text-blue-600" /></div>
                     ) : selectedEmployeeAppointments.length > 0 ? (
                        selectedEmployeeAppointments.map(apt => (
                            <div 
                                key={apt.id} 
                                onClick={() => { 
                                    setEditingAppointment(apt); 
                                    setScheduleTargetEmployee(selectedEmployee); 
                                    setShowScheduleModal(true); 
                                }}
                                className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0 cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors"
                            >
                                <div className="flex flex-col items-center justify-center h-12 w-12 bg-white rounded-lg border border-gray-200 shadow-sm shrink-0">
                                <span className="text-xs font-bold text-gray-400 uppercase">Hoje</span>
                                <span className="text-sm font-bold text-gray-900">{format(parseISO(apt.start_time), 'HH:mm')}</span>
                                </div>
                                <div>
                                <p className="font-medium text-gray-900 line-clamp-1">{apt.title}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> 
                                    {format(parseISO(apt.start_time), 'HH:mm')} - {format(parseISO(apt.end_time), 'HH:mm')}
                                </p>
                                </div>
                            </div>
                        ))
                     ) : (
                        <p className="text-center text-sm text-gray-400 py-4">Nenhum compromisso hoje.</p>
                     )}
                   </div>
                  
                  <button onClick={() => { setScheduleTargetEmployee(selectedEmployee); setShowScheduleModal(true); }} className="w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg active:scale-[0.98] transition-transform shadow-lg shadow-blue-600/20">
                     Agendar Reunião
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal for Receptionist */}
      <Modal 
        isOpen={showScheduleModal} 
        onClose={() => {
          setShowScheduleModal(false);
          setScheduleTargetEmployee(null);
          setEditingAppointment(undefined);
        }}
        title={editingAppointment ? "Editar Agendamento" : `Agendar para ${scheduleTargetEmployee?.full_name || 'Funcionário'}`}
      >
        <AppointmentForm 
          initialDate={new Date()}
          targetEmployeeId={scheduleTargetEmployee?.id}
          editingAppointment={editingAppointment}
          onSuccess={() => {
            setShowScheduleModal(false);
            setScheduleTargetEmployee(null);
            setEditingAppointment(undefined);
            setSelectedEmployee(null); // Close details to refresh or keep open? If keep, need to re-fetch.
            // Refreshing main list is automatic via realtime, but details list needs explicit refresh if we keep modal open.
            // For simplicity, closing details modal too (lines 246 original)
          }}
          onCancel={() => {
            setShowScheduleModal(false);
            setScheduleTargetEmployee(null);
            setEditingAppointment(undefined);
          }}
        />
      </Modal>
    </div>
  );
}

