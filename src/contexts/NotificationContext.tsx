import { useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageSquare, Calendar, Bell } from 'lucide-react';
import { NotificationContext } from './NotificationContextDef';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, employee } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lastCheckedMeetingsRef = useRef<Set<string>>(new Set());
  const sentRemindersRef = useRef<Set<string>>(new Set());
  const startedMeetingsRef = useRef<Set<string>>(new Set());

  // Check for started and ended meetings (for receptionists)
  useEffect(() => {
    if (!user || employee?.role !== 'receptionist') return;

    const checkMeetings = async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Find meetings that STARTED in the last 5 minutes
      const { data: startedMeetings } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          start_time,
          host:employees!host_id (id, full_name)
        `)
        .gte('start_time', fiveMinutesAgo.toISOString())
        .lte('start_time', now.toISOString());

      // Find meetings that ENDED in the last 5 minutes
      const { data: endedMeetings } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          end_time,
          host:employees!host_id (id, full_name)
        `)
        .gte('end_time', fiveMinutesAgo.toISOString())
        .lte('end_time', now.toISOString());

      // Process STARTED meetings
      if (startedMeetings) {
        for (const meeting of startedMeetings) {
          const startKey = `start-${meeting.id}`;
          if (!startedMeetingsRef.current.has(startKey)) {
            startedMeetingsRef.current.add(startKey);
            const hostName = (meeting.host as { id: string; full_name: string }[] | null)?.[0]?.full_name || 'Funcionário';
            
            // Save to notifications table
            await supabase.from('notifications').insert({
              recipient_id: user.id,
              type: 'appointment',
              title: 'Reunião Iniciada',
              content: `"${meeting.title}" de ${hostName} começou agora.`,
              related_id: meeting.id,
              read: false
            });
            
            toast.info('Reunião Iniciada', {
              description: `"${meeting.title}" de ${hostName} começou agora.`,
              icon: <Calendar className="h-4 w-4 text-green-600" />,
            });
          }
        }
      }

      // Process ENDED meetings  
      if (endedMeetings) {
        for (const meeting of endedMeetings) {
          const endKey = `end-${meeting.id}`;
          if (!lastCheckedMeetingsRef.current.has(endKey)) {
            lastCheckedMeetingsRef.current.add(endKey);
            const hostName = (meeting.host as { id: string; full_name: string }[] | null)?.[0]?.full_name || 'Funcionário';
            
            // Save to notifications table
            await supabase.from('notifications').insert({
              recipient_id: user.id,
              type: 'appointment',
              title: 'Reunião Encerrada',
              content: `"${meeting.title}" de ${hostName} terminou.`,
              related_id: meeting.id,
              read: false
            });
            
            toast.info('Reunião Encerrada', {
              description: `"${meeting.title}" de ${hostName} terminou.`,
              icon: <Bell className="h-4 w-4 text-amber-600" />,
            });
          }
        }
      }
      
      // Clean old entries periodically
      if (lastCheckedMeetingsRef.current.size > 100) {
        lastCheckedMeetingsRef.current.clear();
      }
      if (startedMeetingsRef.current.size > 100) {
        startedMeetingsRef.current.clear();
      }
    };

    // Check every minute
    const interval = setInterval(checkMeetings, 60000);
    // Initial check
    checkMeetings();

    return () => clearInterval(interval);
  }, [user, employee?.role]);

  // Send 30-minute reminder webhooks (for receptionists)
  useEffect(() => {
    if (!user || employee?.role !== 'receptionist') return;

    const sendUpcomingReminders = async () => {
      const now = new Date();
      const in25Minutes = new Date(now.getTime() + 25 * 60 * 1000);
      const in35Minutes = new Date(now.getTime() + 35 * 60 * 1000);
      
      // Find meetings starting in 25-35 minutes window (captures ~30 min mark)
      const { data: upcomingMeetings } = await supabase
        .from('appointments')
        .select('id, title')
        .gte('start_time', in25Minutes.toISOString())
        .lte('start_time', in35Minutes.toISOString());

      if (upcomingMeetings) {
        for (const meeting of upcomingMeetings) {
          // Only send if we haven't already sent for this meeting
          if (!sentRemindersRef.current.has(meeting.id)) {
            sentRemindersRef.current.add(meeting.id);
            
            // Trigger webhook
            supabase.functions.invoke('send-appointment-webhook', {
              body: { appointment_id: meeting.id }
            }).then(({ error }) => {
              if (error) {
                console.error('30-min reminder webhook failed:', error);
              } else {
                console.log('30-min reminder sent for:', meeting.title);
                toast.success('Lembrete enviado', {
                  description: `Lembrete de 30min enviado para "${meeting.title}"`,
                });
              }
            });
          }
        }
      }

      // Clean old entries periodically
      if (sentRemindersRef.current.size > 200) {
        sentRemindersRef.current.clear();
      }
    };

    // Check every 5 minutes
    const interval = setInterval(sendUpcomingReminders, 5 * 60 * 1000);
    // Initial check
    sendUpcomingReminders();

    return () => clearInterval(interval);
  }, [user, employee?.role]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages addressed to the current user
    const channel = supabase
      .channel('global_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${user.id}`,
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // Only notify if NOT on the chat page
          // Or if on chat page but maybe not chatting with THIS user? (Simple version: just check /chat)
          // User requested: "only if she is not on the chat page"
          if (!location.pathname.startsWith('/chat')) {
             
             // Fetch sender name for better UX
             let senderName = 'Alguém';
             const { data: sender } = await supabase
                .from('employees')
                .select('full_name')
                .eq('id', newMessage.sender_id)
                .single();
            
             if (sender) senderName = sender.full_name;

             toast.message(`Nova mensagem de ${senderName}`, {
                description: newMessage.content,
                icon: <MessageSquare className="h-4 w-4 text-blue-600" />,
                action: {
                    label: 'Ver',
                    onClick: () => navigate('/chat')
                },
             });
          }
        }
      )
      // Also subscribe to notifications table for receptionists
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as { title: string; content: string; type: string };
          toast.info(notif.title, {
            description: notif.content,
            icon: <Calendar className="h-4 w-4 text-purple-600" />,
            action: {
              label: 'Ver',
              onClick: () => navigate('/notifications')
            },
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, location.pathname, navigate]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}
