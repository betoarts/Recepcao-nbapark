
import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

interface NotificationContextType {}

const NotificationContext = createContext<NotificationContextType>({});

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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
