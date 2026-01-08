import { useEffect, useState, useCallback } from 'react';
import { Bell, Calendar, MessageSquare, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import type { Notification, Appointment } from '../types';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeMeeting, setActiveMeeting] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);

  const checkActiveMeeting = useCallback(async () => {
    if (!user) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('host_id', user.id)
      .lte('start_time', now)
      .gt('end_time', now)
      .maybeSingle();
    
    if (data) setActiveMeeting(data as Appointment);
    else setActiveMeeting(null);
  }, [user]);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Fetch Notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (notifs) setNotifications(notifs as Notification[]);

    await checkActiveMeeting();
    setLoading(false);
  }, [user, checkActiveMeeting]);

  useEffect(() => {
    if (!user) return;

    // eslint-disable-next-line
    fetchData();

    // Realtime subscription
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `recipient_id=eq.${user.id}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();

    const interval = setInterval(checkActiveMeeting, 60000); // Check meeting every minute

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [user, fetchData, checkActiveMeeting]);

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando notificações...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
        <Bell className="h-6 w-6 text-amber-600" />
        </div>
        <div>
        <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
        <p className="text-gray-500">Suas notificações e alertas</p>
        </div>
      </div>

      {/* Active Meeting Alert */}
      {activeMeeting && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 animate-pulse">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-xl">
                    <Clock className="h-6 w-6 text-red-600" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-red-900">Em Reunião Agora</h3>
                    <p className="text-red-700 mt-1">
                        Você está no horário do agendamento: <strong>{activeMeeting.title}</strong>
                    </p>
                    <p className="text-sm text-red-500 mt-2">
                        Até {format(new Date(activeMeeting.end_time), 'HH:mm')}
                    </p>
                </div>
            </div>
        </div>
      )}
      
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {notifications.length === 0 && !activeMeeting ? (
             <div className="p-12 text-center">
                <Bell className="h-12 w-12 text-gray-200 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Tudo limpo!</h3>
                <p className="text-gray-500">Você não tem novas notificações.</p>
             </div>
        ) : (
            <div className="divide-y divide-gray-100">
                {notifications.map((notif) => (
                    <div 
                        key={notif.id} 
                        className={cn("p-5 flex gap-4 transition-colors", notif.read ? "bg-white" : "bg-blue-50/50")}
                        onClick={() => markAsRead(notif.id)}
                    >
                        <div className={cn("mt-1 h-10 w-10 rounded-full flex items-center justify-center shrink-0", 
                            notif.type === 'appointment' ? "bg-purple-100 text-purple-600" :
                            notif.type === 'message' ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
                        )}>
                            {notif.type === 'appointment' ? <Calendar className="h-5 w-5" /> : 
                             notif.type === 'message' ? <MessageSquare className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h3 className={cn("font-semibold text-gray-900", !notif.read && "text-blue-900")}>{notif.title}</h3>
                                <span className="text-xs text-gray-400">{format(new Date(notif.created_at), 'dd/MM HH:mm')}</span>
                            </div>
                            <p className="text-gray-600 mt-1 text-sm">{notif.content}</p>
                        </div>
                        {!notif.read && (
                            <div className="shrink-0 self-center">
                                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
