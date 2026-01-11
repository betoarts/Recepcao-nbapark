import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Appointment, Employee } from '../types';
import { format, parseISO, startOfDay, endOfDay } from 'date-fns';
import { Loader2, Calendar, Search, User, Clock, Filter, X, Send, FileText, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Modal } from '../components/Layout/Modal';
import { AppointmentForm } from '../components/Forms/AppointmentForm';

interface AppointmentWithHost extends Appointment {
  host?: Pick<Employee, 'full_name' | 'photo_url' | 'email' | 'phone'>;
}

export default function AllAppointments() {
  const [appointments, setAppointments] = useState<AppointmentWithHost[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentWithHost | null>(null);
  const [sendingWebhook, setSendingWebhook] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    
    const startISO = startOfDay(new Date(startDate)).toISOString();
    const endISO = endOfDay(new Date(endDate)).toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        host:employees!host_id (
          full_name,
          photo_url,
          email,
          phone
        )
      `)
      .gte('start_time', startISO)
      .lte('start_time', endISO)
      .order('start_time', { ascending: true });

    if (!error && data) {
      setAppointments(data as AppointmentWithHost[]);
    }
    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSendWebhook = async () => {
    if (!selectedAppointment) return;
    
    setSendingWebhook(true);
    try {
      const { error } = await supabase.functions.invoke('send-appointment-webhook', {
        body: { appointment_id: selectedAppointment.id }
      });
      
      if (error) throw error;
      
      toast.success('Webhook enviado com sucesso!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar webhook';
      toast.error(message);
    } finally {
      setSendingWebhook(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    const search = searchFilter.toLowerCase();
    return (
      apt.title?.toLowerCase().includes(search) ||
      apt.guest_name?.toLowerCase().includes(search) ||
      apt.host?.full_name?.toLowerCase().includes(search)
    );
  });

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'internal': return 'Interno';
      case 'external': return 'Externo';
      case 'personal': return 'Pessoal';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'internal': return 'bg-blue-100 text-blue-700';
      case 'external': return 'bg-purple-100 text-purple-700';
      case 'personal': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Todas as Reuniões</h1>
          <p className="text-gray-500">Consulte todos os agendamentos por data</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Date Range */}
          <div className="flex items-center gap-2 flex-1">
            <Filter className="h-5 w-5 text-gray-400 hidden md:block" />
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 flex-1">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <span className="text-gray-400 hidden md:block self-end pb-3">até</span>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="flex-1 md:max-w-xs">
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Título, visitante ou funcionário..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>{filteredAppointments.length} agendamentos encontrados</span>
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhum agendamento encontrado</p>
            <p className="text-sm">Tente ajustar os filtros de data</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Título</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Funcionário</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Visitante</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredAppointments.map((apt) => (
                  <tr 
                    key={apt.id} 
                    onClick={() => setSelectedAppointment(apt)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {format(parseISO(apt.start_time), 'dd/MM/yyyy')}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(parseISO(apt.start_time), 'HH:mm')} - {format(parseISO(apt.end_time), 'HH:mm')}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-medium text-gray-900 line-clamp-1">{apt.title}</p>
                      {apt.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">{apt.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                          {apt.host?.photo_url ? (
                            <img src={apt.host.photo_url} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        <span className="text-gray-900">{apt.host?.full_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-700">
                      {apt.guest_name || '-'}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("px-2 py-1 rounded-lg text-xs font-medium", getTypeColor(apt.type))}>
                        {getTypeLabel(apt.type)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Appointment Details Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedAppointment(null)} />
          
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-10 fade-in duration-200 mt-4 md:mt-0 max-h-[85vh] flex flex-col">
            <div className="p-6 overflow-y-auto flex-1">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedAppointment.title}</h2>
                  <p className="text-gray-500 flex items-center gap-2 mt-1">
                    <Calendar className="h-4 w-4" />
                    {format(parseISO(selectedAppointment.start_time), 'dd/MM/yyyy')}
                    <span className="mx-1">•</span>
                    <Clock className="h-4 w-4" />
                    {format(parseISO(selectedAppointment.start_time), 'HH:mm')} - {format(parseISO(selectedAppointment.end_time), 'HH:mm')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedAppointment(null)}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Type Badge */}
              <div className="mb-6">
                <span className={cn("px-3 py-1.5 rounded-full text-sm font-medium", getTypeColor(selectedAppointment.type))}>
                  {getTypeLabel(selectedAppointment.type)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-4">
                {/* Host */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-2">Funcionário</p>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                      {selectedAppointment.host?.photo_url ? (
                        <img src={selectedAppointment.host.photo_url} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedAppointment.host?.full_name}</p>
                      {selectedAppointment.host?.email && (
                        <p className="text-sm text-gray-500">{selectedAppointment.host.email}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Guest */}
                {selectedAppointment.guest_name && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">Visitante</p>
                    <p className="font-semibold text-gray-900">{selectedAppointment.guest_name}</p>
                  </div>
                )}

                {/* Notes */}
                {selectedAppointment.description && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1">
                      <FileText className="h-3 w-3" /> Observações
                    </p>
                    <p className="text-gray-700">{selectedAppointment.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <Pencil className="h-5 w-5" />
                Editar
              </button>
              <button
                onClick={handleSendWebhook}
                disabled={sendingWebhook}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                {sendingWebhook ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Enviar Lembrete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="Editar Agendamento"
      >
        <AppointmentForm
          editingAppointment={selectedAppointment as Appointment}
          initialDate={selectedAppointment ? new Date(selectedAppointment.start_time) : undefined}
          onSuccess={() => {
            setIsEditing(false);
            setSelectedAppointment(null);
            fetchAppointments();
            toast.success('Agendamento atualizado!');
          }}
          onCancel={() => setIsEditing(false)}
        />
      </Modal>
    </div>
  );
}
