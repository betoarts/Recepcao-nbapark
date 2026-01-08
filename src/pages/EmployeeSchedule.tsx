
import { useState, useEffect, useCallback } from 'react';
import { TouchCalendar } from '../components/Calendar/TouchCalendar';
import { Modal } from '../components/Layout/Modal';
import { AppointmentForm } from '../components/Forms/AppointmentForm';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, Clock, Video, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Appointment } from '../types';

export default function EmployeeSchedule() {
  const { user } = useAuth();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const fetchAppointments = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch all for now, optimize later for date range
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('host_id', user.id)
        .order('start_time', { ascending: true });

    if (!error && data) {
        setAppointments(data as Appointment[]);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchAppointments();
  }, [fetchAppointments]);

  const dailyAppointments = appointments.filter(apt => {
      if (!date) return false;
      const aptDate = parseISO(apt.start_time);
      return aptDate.getDate() === date.getDate() &&
             aptDate.getMonth() === date.getMonth() &&
             aptDate.getFullYear() === date.getFullYear();
  });

  const handleSuccess = () => {
      setIsModalOpen(false);
      fetchAppointments();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8 h-[calc(100vh-8rem)]">
      {/* Calendar Section */}
      <div className="w-full lg:w-[440px] flex-shrink-0">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Agenda</h1>
        <TouchCalendar 
          date={date} 
          onSelect={setDate} 
          className="w-full"
        />
        
        <div className="mt-6 bg-blue-50 p-4 rounded-2xl border border-blue-100 hidden lg:block">
           <h3 className="font-bold text-blue-900 mb-2">Resumo</h3>
           <p className="text-sm text-blue-700">
               {appointments.length > 0 
                ? `Você tem ${appointments.length} compromissos totais.`
                : 'Sua agenda está vazia.'}
           </p>
        </div>
      </div>

      {/* Daily Schedule Section */}
      <div className="flex-1 flex flex-col min-h-0 bg-white/50 rounded-3xl border border-gray-100 backdrop-blur-sm p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
             <h2 className="text-2xl font-bold text-gray-900 capitalize">
                {date ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR }) : 'Selecione uma data'}
             </h2>
             <p className="text-gray-500">{dailyAppointments.length} compromissos hoje</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="h-12 w-12 sm:h-auto sm:w-auto sm:px-6 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
          >
             <Plus className="h-6 w-6 sm:mr-2" />
             <span className="hidden sm:inline font-bold">Novo Agendamento</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
           {loading ? (
             <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-600" /></div>
           ) : dailyAppointments.length === 0 ? (
              <div className="py-12 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
                    <CalendarIcon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">Sem compromissos</h3>
                <p className="text-gray-500">Toque em "Novo Agendamento" para adicionar.</p>
              </div>
           ) : (
             dailyAppointments.map((apt) => {
                 const startTime = format(parseISO(apt.start_time), 'HH:mm');
                 const endTime = format(parseISO(apt.end_time), 'HH:mm');
                 return (
                    <div 
                        key={apt.id} 
                        onClick={() => { setEditingAppointment(apt); setIsModalOpen(true); }}
                        className="group flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                    >
                        <div className="flex flex-col items-center justify-center w-16 text-gray-900">
                        <span className="text-lg font-bold">{startTime}</span>
                        <span className="text-xs text-gray-400">{endTime}</span>
                        </div>
                        
                        <div className="w-1 rounded-full bg-blue-200 group-hover:bg-blue-500 transition-colors" />
                        
                        <div className="flex-1 py-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{apt.title}</h3>
                        <div className="flex items-center gap-3">
                            <span className={cn(
                                "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold capitalize",
                                apt.type === 'internal' ? "bg-purple-100 text-purple-700" : 
                                apt.type === 'external' ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-700"
                            )}>
                                {apt.type === 'internal' ? 'Interno' : apt.type === 'external' ? 'Externo' : 'Pessoal'}
                            </span>
                            {apt.type === 'internal' && <span className="text-xs text-gray-400 flex items-center"><Video className="h-3 w-3 mr-1"/> Online</span>}
                            {apt.guest_name && (
                                <span className="text-xs text-gray-500">
                                    com {apt.guest_name}
                                </span>
                            )}
                        </div>
                        </div>
                    </div>
                 );
             })
           )}
           
           {dailyAppointments.length > 0 && (
                <div className="py-8 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-3">
                        <Clock className="h-6 w-6" />
                    </div>
                    <p className="text-gray-500 font-medium">Fim da agenda por hoje</p>
                </div>
           )}
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingAppointment(undefined); }}
        title={editingAppointment ? "Editar Agendamento" : "Novo Agendamento"}
      >
          <AppointmentForm 
            initialDate={date} 
            editingAppointment={editingAppointment}
            onSuccess={() => {
              handleSuccess();
              setEditingAppointment(undefined);
            }}
            onCancel={() => { setIsModalOpen(false); setEditingAppointment(undefined); }} 
          />
      </Modal>
    </div>
  );
}

function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><rect height="18" rx="2" ry="2" width="18" x="3" y="4"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
    )
}
