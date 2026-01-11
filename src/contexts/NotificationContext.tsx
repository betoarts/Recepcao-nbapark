import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageSquare, Calendar, Bell } from 'lucide-react';

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
        endedMeetings.forEach((meeting: any) => {
          // Only alert if we haven't already alerted for this meeting
          if (!lastCheckedMeetingsRef.current.has(meeting.id)) {
            lastCheckedMeetingsRef.current.add(meeting.id);
            toast.info(`Reunião Encerrada`, {
              description: `"${meeting.title}" de ${meeting.host?.full_name || 'Funcionário'} terminou.`,
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
