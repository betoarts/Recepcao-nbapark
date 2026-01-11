
import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Calendar, Clock, User, AlignLeft, Users, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import type { Employee, Appointment } from '../../types';

interface AppointmentFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialDate?: Date;
  targetEmployeeId?: string;
  editingAppointment?: Appointment;
}

type AppointmentType = 'internal' | 'external' | 'personal';

export function AppointmentForm({ onSuccess, onCancel, initialDate, targetEmployeeId, editingAppointment }: AppointmentFormProps) {
  const { user, employee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Employee list for receptionist
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const [title, setTitle] = useState(editingAppointment?.title || '');
  const [date, setDate] = useState(
    editingAppointment 
    ? new Date(editingAppointment.start_time).toISOString().split('T')[0] 
    : initialDate ? initialDate.toISOString().split('T')[0] : ''
  );
  const [startTime, setStartTime] = useState(() => {
    if (editingAppointment) {
      return new Date(editingAppointment.start_time).toTimeString().substring(0, 5);
    }
    // Use current time rounded to next 15 minutes
    const now = new Date();
    const minutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes, 0, 0);
    return now.toTimeString().substring(0, 5);
  });
  const [endTime, setEndTime] = useState(() => {
    if (editingAppointment) {
      return new Date(editingAppointment.end_time).toTimeString().substring(0, 5);
    }
    // Use current time + 1 hour rounded to next 15 minutes
    const now = new Date();
    const minutes = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes, 0, 0);
    now.setHours(now.getHours() + 1);
    return now.toTimeString().substring(0, 5);
  });
  const [type, setType] = useState<AppointmentType>(editingAppointment?.type || 'internal');
  const [guestName, setGuestName] = useState(editingAppointment?.guest_name || '');
  const [description, setDescription] = useState(editingAppointment?.description || '');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    editingAppointment?.host_id || targetEmployeeId || ''
  );

  const isReceptionist = employee?.role === 'receptionist';

  // Fetch employees if receptionist
  useEffect(() => {
    if (isReceptionist) {
      setLoadingEmployees(true);
      supabase
        .from('employees')
        .select('id, full_name, email')
        .order('full_name')
        .then(({ data, error }) => {
          if (!error && data) {
            setEmployees(data as Employee[]);
            // Only pre-select first employee if creating new appointment AND no target specified
            if (!editingAppointment && !targetEmployeeId && data.length > 0) {
              setSelectedEmployeeId(data[0].id);
            }
          }
          setLoadingEmployees(false);
        });
    }
  }, [isReceptionist, targetEmployeeId, editingAppointment]);

  // Set target employee when prop changes
  useEffect(() => {
    if (targetEmployeeId) {
      setSelectedEmployeeId(targetEmployeeId);
    }
  }, [targetEmployeeId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Determine host_id: for receptionists, use selected employee; otherwise, logged-in user
    const hostId = isReceptionist ? selectedEmployeeId : user.id;
    
    if (!hostId) {
      setError("Selecione um funcionário para o agendamento.");
      return;
    }

    setLoading(true);
    setError(null);

    // Combine date/time
    const startDateTime = new Date(`${date}T${startTime}:00`);
    const endDateTime = new Date(`${date}T${endTime}:00`);

    // Validation
    if (endDateTime <= startDateTime) {
        setError("O horário de término deve ser após o horário de início.");
        setLoading(false);
        return;
    }

    // Conflict Detection
    try {
        let query = supabase
            .from('appointments')
            .select('id')
            .eq('host_id', hostId)
            .lt('start_time', endDateTime.toISOString())
            .gt('end_time', startDateTime.toISOString());
            
        if (editingAppointment) {
            query = query.neq('id', editingAppointment.id);
        }

        const { data: conflicts, error: conflictError } = await query;

        if (conflictError) throw conflictError;

        if (conflicts && conflicts.length > 0) {
            setError("Este funcionário já possui um agendamento neste horário.");
            setLoading(false);
            return;
        }

        let savedAppointmentId = editingAppointment?.id;

        if (editingAppointment) {
            // Update
            const { error: updateError } = await supabase
                .from('appointments')
                .update({
                    host_id: hostId,
                    title,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    type,
                    guest_name: type === 'external' ? guestName : null,
                    description: description || null
                })
                .eq('id', editingAppointment.id);
                
            if (updateError) throw updateError;
        } else {
            // Insert
            const { data: newApt, error: insertError } = await supabase
                .from('appointments')
                .insert({
                    created_by: user.id,
                    host_id: hostId,
                    title,
                    start_time: startDateTime.toISOString(),
                    end_time: endDateTime.toISOString(),
                    type,
                    guest_name: type === 'external' ? guestName : null,
                    description: description || null
                })
                .select()
                .single();

            if (insertError) throw insertError;
            savedAppointmentId = newApt.id;

            // Notify receptionists if an employee (non-receptionist) creates an appointment
            if (!isReceptionist) {
                // Get all receptionists
                const { data: receptionists } = await supabase
                    .from('employees')
                    .select('id')
                    .eq('role', 'receptionist');
                
                if (receptionists && receptionists.length > 0) {
                    const notifications = receptionists.map(r => ({
                        recipient_id: r.id,
                        type: 'appointment',
                        title: 'Nova Reunião Agendada',
                        content: `${employee?.full_name || 'Funcionário'} agendou "${title}" para ${format(startDateTime, 'dd/MM HH:mm')}`,
                        read: false
                    }));
                    
                    await supabase.from('notifications').insert(notifications);
                }
            }
        }

        // Trigger Webhook if Receptionist and new appointment (or always? Request implied "when created")
        // User asked for "webhook ... for all appointments made by receptionist"
        // I'll trigger on both create and update for robustness, or usually just create? 
        // "agendamentos feito pela recepcionista" suggests creation. I'll stick to creation for now, OR valid savedID available.
        // Actually, let's trigger for both to be safe, as "done by receptionist" encompasses updates too technically.
        // But commonly webhooks are for 'new' things. I will trigger for both if savedAppointmentId exists.
        
        if (isReceptionist && savedAppointmentId) {
             // Non-blocking call
             supabase.functions.invoke('send-appointment-webhook', {
                 body: { appointment_id: savedAppointmentId }
             }).then(({ error }) => {
                 if (error) console.error('Webhook trigger failed:', error);
                 else console.log('Webhook triggered successfully');
             });
        }

        onSuccess();
    } catch (err: any) {
        console.error('Error saving appointment:', err);
        setError("Erro ao salvar agendamento. Tente novamente.");
    } finally {
        setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!editingAppointment) return;
    if (!window.confirm("Tem certeza que deseja excluir este agendamento?")) return;

    setLoading(true);
    try {
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', editingAppointment.id);
            
        if (error) throw error;
        onSuccess();
    } catch (err) {
        console.error("Error deleting:", err);
        setError("Erro ao excluir agendamento.");
        setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
            {error}
            </div>
        )}

      {/* Employee Selector - Only for Receptionists */}
      {isReceptionist && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
          <div className="relative">
            <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              required
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              disabled={loadingEmployees || !!targetEmployeeId}
              className={cn(
                "block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white",
                (loadingEmployees || targetEmployeeId) && "opacity-75 cursor-not-allowed"
              )}
            >
              {loadingEmployees ? (
                <option>Carregando...</option>
              ) : (
                employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.email})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Título do Compromisso</label>
        <div className="relative">
            <AlignLeft className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white transition-colors"
            placeholder="Ex: Reunião de Projeto"
            />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                />
            </div>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
                value={type}
                onChange={(e) => setType(e.target.value as AppointmentType)}
                className="block w-full h-12 px-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
            >
                <option value="internal">Interno</option>
                <option value="external">Externo (Cliente)</option>
                <option value="personal">Pessoal</option>
            </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Início</label>
            <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                />
            </div>
        </div>
         <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Término</label>
             <div className="relative">
                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                />
            </div>
        </div>
      </div>

      {type === 'external' && (
         <div className="animate-in fade-in slide-in-from-top-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Visitante / Cliente</label>
            <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                type="text"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white"
                placeholder="Nome do cliente"
                />
            </div>
         </div>
      )}

      {/* Notas / Observações */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Observações</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="block w-full px-4 py-3 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white resize-none"
          placeholder="Adicione informações adicionais sobre o compromisso..."
        />
      </div>

      <div className="flex gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 px-4 border border-gray-200 rounded-xl shadow-sm text-lg font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 uppercase tracking-wide"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "flex-1 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 active:scale-[0.98] transition-transform uppercase tracking-wide",
            loading && "opacity-75 cursor-not-allowed"
          )}
        >
          {loading ? <Loader2 className="animate-spin h-6 w-6" /> : (editingAppointment ? "Salvar" : "Agendar")}
        </button>
        
        {editingAppointment && (
             <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-3 border border-red-200 text-red-600 rounded-xl hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors"
                title="Excluir Agendamento"
            >
                <Trash2 className="h-6 w-6" />
            </button>
        )}
      </div>
    </form>
  );
}
