import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageSquare, Calendar, Bell } from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface NotificationContextType {}

const NotificationContext = createContext<NotificationContextType>({});

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, employee } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lastCheckedMeetingsRef = useRef<Set<string>>(new Set());
  const sentRemindersRef = useRef<Set<string>>(new Set());

  // Check for ended meetings (for receptionists)
  useEffect(() => {
    if (!user || employee?.role !== 'receptionist') return;

    const checkEndedMeetings = async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      
      // Find meetings that ended in the last 5 minutes
      const { data: endedMeetings } = await supabase
        .from('appointments')
        .select(`
          id,
          title,
          end_time,
          host:employees!host_id (full_name)
        `)
        .gte('end_time', fiveMinutesAgo.toISOString())
        .lte('end_time', now.toISOString());

      if (endedMeetings) {
        endedMeetings.forEach((meeting) => {
          // Only alert if we haven't already alerted for this meeting
          if (!lastCheckedMeetingsRef.current.has(meeting.id)) {
            lastCheckedMeetingsRef.current.add(meeting.id);
            toast.info(`Reunião Encerrada`, {
              description: `"${meeting.title}" de ${(meeting.host as { full_name: string }[] | null)?.[0]?.full_name || 'Funcionário'} terminou.`,
              icon: <Bell className="h-4 w-4 text-amber-600" />,
            });
          }
        });
      }
      
      // Clean old entries (older than 10 minutes)
      if (lastCheckedMeetingsRef.current.size > 100) {
        lastCheckedMeetingsRef.current.clear();
      }
    };

    // Check every minute
    const interval = setInterval(checkEndedMeetings, 60000);
    // Initial check
    checkEndedMeetings();

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
