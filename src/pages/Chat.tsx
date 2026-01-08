
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { usePresence } from '../contexts/PresenceContext';
import type { Employee, Message } from '../types';
import { Loader2, Search, Send, User, ArrowLeft, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export default function Chat() {
  const { user } = useAuth();
  const { onlineUsers } = usePresence();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedContact, setSelectedContact] = useState<Employee | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [contactMeeting, setContactMeeting] = useState<any | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const checkContactStatus = async () => {
    if (!selectedContact) {
        setContactMeeting(null);
        return;
    }

    const now = new Date().toISOString();
    const { data } = await supabase
      .from('appointments')
      .select('*')
      .eq('host_id', selectedContact.id)
      .lte('start_time', now)
      .gt('end_time', now)
      .maybeSingle();
    
    setContactMeeting(data);
  };

  useEffect(() => {
    checkContactStatus();
    const interval = setInterval(checkContactStatus, 60000);
    return () => clearInterval(interval);
  }, [selectedContact]);

  const scrollToBottom = () => {
    setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Fetch Employees (Contacts)
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('employees')
        .select('*')
        .neq('id', user.id) // Don't show self
        .eq('account_status', 'active')
        .order('full_name');
        
      if (data) setEmployees(data as any);
      setLoading(false);
    };

    fetchEmployees();
  }, [user]);

  // Fetch Messages when contact selected
  useEffect(() => {
    if (!user || !selectedContact) return;
    
    setLoadingMessages(true);
    
    // Initial fetch
    supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .or(`sender_id.eq.${selectedContact.id},recipient_id.eq.${selectedContact.id}`)
        .order('created_at', { ascending: true })
        .then(({ data }) => {
            // Filter strictly for conversation between user and contact
            const conversation = data?.filter(m => 
                (m.sender_id === user.id && m.recipient_id === selectedContact.id) ||
                (m.sender_id === selectedContact.id && m.recipient_id === user.id)
            ) || [];
            
            setMessages(conversation as any);
            setLoadingMessages(false);
            scrollToBottom();
        });

    // Subscribe to new messages
    const channel = supabase
        .channel(`chat:${selectedContact.id}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'messages'
        }, (payload) => {
            const newMsg = payload.new as Message;
            // Check if message belongs to this conversation
            if (
                (newMsg.sender_id === user.id && newMsg.recipient_id === selectedContact.id) ||
                (newMsg.sender_id === selectedContact.id && newMsg.recipient_id === user.id)
            ) {
                setMessages(prev => {
                    // Prevent duplicates if we already added it manually
                    if (prev.some(m => m.id === newMsg.id)) return prev;
                    return [...prev, newMsg];
                });
                scrollToBottom();
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
  }, [user, selectedContact]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !user || !selectedContact) return;

    const content = inputText.trim();
    setInputText(''); // Optimistic clear

    const { data, error } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: selectedContact.id,
        content: content,
        read: false
    })
    .select()
    .single();

    if (data) {
        setMessages(prev => [...prev, data as Message]);
        scrollToBottom();
    }

    if (error) {
        console.error('Error sending message:', error);
        alert('Erro ao enviar mensagem');
    }
  };

  if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Contact List */}
        <div className={cn(
            "w-full md:w-80 border-r border-gray-100 bg-gray-50 flex flex-col transition-all duration-300",
            selectedContact ? "hidden md:flex" : "flex"
        )}>
            <div className="p-4 border-b border-gray-100 bg-white">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Mensagens</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Buscar contatos..." 
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                    />
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {employees.map(emp => (
                    <button
                        key={emp.id}
                        onClick={() => setSelectedContact(emp)}
                        className={cn(
                            "w-full text-left p-3 rounded-xl flex items-center gap-3 transition-colors",
                            selectedContact?.id === emp.id ? "bg-blue-100 text-blue-900" : "hover:bg-gray-100 text-gray-700"
                        )}
                    >
                        <div className="h-10 w-10 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {emp.photo_url ? <img src={emp.photo_url} className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-gray-400" />}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold truncate">{emp.full_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className={cn("h-2 w-2 rounded-full", onlineUsers.has(emp.id) ? 'bg-green-500' : 'bg-gray-300')} />
                                <span className="text-xs text-gray-500 capitalize">{onlineUsers.has(emp.id) ? 'Online' : 'Offline'}</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>

        {/* Chat Area */}
        {selectedContact ? (
            <div className="flex-1 flex flex-col bg-white">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center gap-3 bg-white z-10">
                    <button onClick={() => setSelectedContact(null)} className="md:hidden p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="h-6 w-6 text-gray-500" />
                    </button>
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                        {selectedContact.photo_url ? <img src={selectedContact.photo_url} className="h-full w-full object-cover" /> : <User className="h-5 w-5 text-gray-500" />}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">{selectedContact.full_name}</h3>
                        {onlineUsers.has(selectedContact.id) ? (
                            <p className="text-xs text-green-600 flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                                Online agora
                            </p>
                        ) : (
                            <p className="text-xs text-gray-400">Offline</p>
                        )}
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                    {loadingMessages ? (
                        <div className="flex justify-center p-8"><Loader2 className="animate-spin text-gray-400" /></div>
                    ) : messages.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p>Nenhuma mensagem ainda.</p>
                            <p className="text-sm">Envie um "Olá" para começar!</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const isMe = msg.sender_id === user?.id;
                            return (
                                <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                                    <div className={cn(
                                        "max-w-[75%] px-4 py-2.5 rounded-2xl shadow-sm text-sm break-words",
                                        isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-100 rounded-bl-none"
                                    )}>
                                        <p>{msg.content}</p>
                                        <p className={cn("text-[10px] mt-1 text-right opacity-70", isMe ? "text-blue-100" : "text-gray-400")}>
                                            {format(new Date(msg.created_at), 'HH:mm')}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Meeting Alert */}
                {contactMeeting && (
                    <div className="bg-amber-50 px-4 py-2 border-t border-amber-100 flex items-center gap-2">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-medium text-amber-800">
                            {selectedContact?.full_name} está ocupado em uma reunião até {format(new Date(contactMeeting.end_time), 'HH:mm')}.
                        </span>
                    </div>
                )}

                {/* Input */}
                <div className="p-4 bg-white border-t border-gray-100">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            className="flex-1 px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-100 rounded-xl transition-all outline-none"
                        />
                        <button 
                            type="submit"
                            disabled={!inputText.trim()}
                            className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        ) : (
            <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-gray-50 text-gray-400">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <MessageSquare className="h-10 w-10 text-gray-300" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-1">Suas Mensagens</h3>
                <p>Selecione um contato para iniciar uma conversa.</p>
            </div>
        )}
    </div>
  );
}
