
import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import type { Employee, Department } from '../types';
import { 
  Loader2, 
  UserPlus, 
  Trash2, 
  Ban, 
  Pause, 
  Play, 
  Search, 
  Shield, 
  X,
  AlertTriangle,
  CheckCircle,
  Upload,
  Building2,
  Globe
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

export default function Admin() {
  const { employee, loading: authLoading } = useAuth();
  const { logoUrl, webhookUrl, webhookFields, refreshSettings } = useSettings();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; userId: string; userName: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Webhook State
  const [localWebhookUrl, setLocalWebhookUrl] = useState('');
  const [localWebhookFields, setLocalWebhookFields] = useState<string[]>([]);
  const [savingWebhook, setSavingWebhook] = useState(false);

  useEffect(() => {
    if (webhookUrl) setLocalWebhookUrl(webhookUrl);
    if (webhookFields) setLocalWebhookFields(webhookFields);
  }, [webhookUrl, webhookFields]);

  const handleSaveWebhook = async () => {
    setSavingWebhook(true);
    try {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ 
                id: 1, 
                webhook_url: localWebhookUrl, 
                webhook_fields: localWebhookFields 
            });
        
        if (error) throw error;
        
        await refreshSettings();
        alert('Configuração de Webhook salva com sucesso!');
    } catch (error) {
        console.error('Error saving webhook:', error);
        alert('Erro ao salvar configuração.');
    } finally {
        setSavingWebhook(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione uma imagem válida.');
        return;
    }

    setUploadingLogo(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `app-logo-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`; // Using avatars/ folder for simplicity

        // Upload
        const { error: uploadError } = await supabase.storage
            .from('employee-photos')
            .upload(filePath, file, { cacheControl: '3600', upsert: true });

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('employee-photos')
            .getPublicUrl(filePath);

        // Update Settings
        const { error: dbError } = await supabase
            .from('app_settings')
            .upsert({ id: 1, logo_url: publicUrl });

        if (dbError) throw dbError;

        await refreshSettings();
        alert('Logomarca atualizada com sucesso!');
    } catch (err) {
        console.error('Error uploading logo:', err);
        alert('Erro ao atualizar logomarca.');
    } finally {
        setUploadingLogo(false);
    }
  };

  const handleTestWebhook = async () => {
    setSavingWebhook(true);
    try {
        // 1. Get latest appointment
        const { data: latestApt } = await supabase
            .from('appointments')
            .select('id')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (!latestApt) {
            alert('Crie pelo menos um agendamento para testar.');
            return;
        }

        // 2. Invoke Function
        const { data, error } = await supabase.functions.invoke('send-appointment-webhook', {
            body: { appointment_id: latestApt.id }
        });

        console.log('Webhook response:', { data, error });

        if (error) throw error;
        
        // Check if the function returned an error in the response body
        if (data && typeof data === 'object' && 'error' in data) {
            throw new Error(data.error as string);
        }

        alert('Webhook de teste enviado com sucesso!');
    } catch (error: unknown) {
        console.error('Test webhook failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        alert('Falha no teste: ' + errorMessage);
    } finally {
        setSavingWebhook(false);
    }
  };

  // Check if user is admin
  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!employee || employee.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [empRes, deptRes] = await Promise.all([
      supabase.from('employees').select('*').order('full_name'),
      supabase.from('departments').select('*').order('name')
    ]);
    
    if (empRes.data) setEmployees(empRes.data);
    if (deptRes.data) setDepartments(deptRes.data);
    setLoading(false);
  };

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'blocked' | 'paused') => {
    setActionLoading(true);
    const { error } = await supabase
      .from('employees')
      .update({ account_status: newStatus })
      .eq('id', userId);
    
    if (error) {
      console.error('Error updating status:', error);
      alert('Erro ao atualizar status: ' + error.message);
    }
    
    if (!error) {
      setEmployees(prev => prev.map(emp => 
        emp.id === userId ? { ...emp, account_status: newStatus } : emp
      ));
    }
    setActionLoading(false);
    setConfirmAction(null);
  };

  const handleDeleteUser = async (userId: string) => {
    setActionLoading(true);
    
    try {
      // First, delete all appointments where this user is host or creator
      await supabase
        .from('appointments')
        .delete()
        .or(`host_id.eq.${userId},created_by.eq.${userId}`);
      
      // Then delete from employees table
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
      
      setEmployees(prev => prev.filter(emp => emp.id !== userId));
    } catch (err) {
      console.error('Error deleting user:', err);
      alert('Erro ao excluir usuário. Verifique o console para mais detalhes.');
    }
    
    setActionLoading(false);
    setConfirmAction(null);
  };

  const filteredEmployees = employees.filter(emp => 
    emp.full_name.toLowerCase().includes(filter.toLowerCase()) ||
    emp.email.toLowerCase().includes(filter.toLowerCase())
  );

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'blocked':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-xs font-medium flex items-center gap-1"><Ban className="h-3 w-3" />Bloqueado</span>;
      case 'paused':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-medium flex items-center gap-1"><Pause className="h-3 w-3" />Pausado</span>;
      default:
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" />Ativo</span>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium">Admin</span>;
      case 'receptionist':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">Recepcionista</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium">Funcionário</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
            <p className="text-gray-500">Gerenciamento completo de usuários</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
        >
          <UserPlus className="h-5 w-5" />
          Novo Usuário
        </button>
      </div>

      {/* App Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
            <div className="h-20 w-20 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center p-2 overflow-hidden">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" /> : <Building2 className="h-8 w-8 text-gray-300" />}
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-900">Personalização</h3>
                <p className="text-gray-500 text-sm">Logomarca da aplicação (tela de login e menu interno)</p>
            </div>
        </div>
        <div>
            <label className={cn(
                "flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg cursor-pointer transition-colors font-medium",
                uploadingLogo && "opacity-50 cursor-not-allowed"
            )}>
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Alterar Logo
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
            </label>
        </div>
      </div>

      {/* Webhook Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                <Globe className="h-6 w-6 text-blue-600" />
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-900">Integrações (Webhook)</h3>
                <p className="text-gray-500 text-sm">Configure o envio automático de agendamentos</p>
            </div>
        </div>
        
        <div className="space-y-4 pt-4 border-t border-gray-100">
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL do Webhook (POST)</label>
                <input 
                    type="url" 
                    placeholder="https://seu-webhook.com/endpoint"
                    className="w-full h-10 px-3 rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                    value={localWebhookUrl || ''}
                    onChange={(e) => setLocalWebhookUrl(e.target.value)}
                />
             </div>

             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Campos a enviar</label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {['Data da Visita', 'Nome do Visitante', 'Nome do Funcionário', 'Email do Funcionário', 'Telefone do Funcionário', 'Tipo de Visita', 'Observações'].map((field) => (
                        <label key={field} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                             <input 
                                type="checkbox"
                                checked={localWebhookFields.includes(field)}
                                onChange={(e) => {
                                    if (e.target.checked) setLocalWebhookFields([...localWebhookFields, field]);
                                    else setLocalWebhookFields(localWebhookFields.filter(f => f !== field));
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                             />
                             <span className="text-sm text-gray-700">{field}</span>
                        </label>
                    ))}
                </div>
             </div>

             <div className="flex justify-end gap-3">
                <button 
                    onClick={handleTestWebhook}
                    disabled={savingWebhook}
                    className="px-4 py-2 border border-blue-200 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors disabled:opacity-50"
                >
                    Testar Envio
                </button>
                <button 
                    onClick={handleSaveWebhook}
                    disabled={savingWebhook}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                    {savingWebhook ? 'Salvando...' : 'Salvar Configuração'}
                </button>
             </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nome ou email..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full h-12 pl-12 pr-4 rounded-xl border-gray-200 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Total Usuários</p>
          <p className="text-2xl font-bold text-gray-900">{employees.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Ativos</p>
          <p className="text-2xl font-bold text-green-600">{employees.filter(e => !e.account_status || e.account_status === 'active').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Bloqueados</p>
          <p className="text-2xl font-bold text-red-600">{employees.filter(e => e.account_status === 'blocked').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Pausados</p>
          <p className="text-2xl font-bold text-yellow-600">{employees.filter(e => e.account_status === 'paused').length}</p>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Usuário</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Função</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {emp.photo_url 
                            ? <img src={emp.photo_url} alt="" className="h-full w-full object-cover" />
                            : <span className="text-gray-500 font-bold">{emp.full_name?.charAt(0)}</span>
                          }
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{emp.full_name}</p>
                          <p className="text-sm text-gray-500">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getRoleBadge(emp.role)}</td>
                    <td className="px-6 py-4">{getStatusBadge(emp.account_status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {emp.account_status === 'active' || !emp.account_status ? (
                          <>
                            <button
                              onClick={() => setConfirmAction({ type: 'pause', userId: emp.id, userName: emp.full_name })}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Pausar"
                            >
                              <Pause className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setConfirmAction({ type: 'block', userId: emp.id, userName: emp.full_name })}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Bloquear"
                            >
                              <Ban className="h-5 w-5" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(emp.id, 'active')}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Ativar"
                          >
                            <Play className="h-5 w-5" />
                          </button>
                        )}
                        {emp.role !== 'admin' && (
                          <button
                            onClick={() => setConfirmAction({ type: 'delete', userId: emp.id, userName: emp.full_name })}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Action Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center",
                confirmAction.type === 'delete' ? "bg-red-100" : confirmAction.type === 'block' ? "bg-red-100" : "bg-yellow-100"
              )}>
                <AlertTriangle className={cn(
                  "h-6 w-6",
                  confirmAction.type === 'delete' || confirmAction.type === 'block' ? "text-red-600" : "text-yellow-600"
                )} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {confirmAction.type === 'delete' ? 'Excluir Usuário' : 
                   confirmAction.type === 'block' ? 'Bloquear Usuário' : 'Pausar Usuário'}
                </h3>
                <p className="text-gray-500">{confirmAction.userName}</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              {confirmAction.type === 'delete' 
                ? 'Esta ação é irreversível. Todos os dados do usuário serão perdidos.'
                : confirmAction.type === 'block'
                ? 'O usuário não poderá acessar o sistema enquanto estiver bloqueado.'
                : 'O usuário não poderá acessar o sistema enquanto estiver pausado.'}
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmAction.type === 'delete') {
                    handleDeleteUser(confirmAction.userId);
                  } else if (confirmAction.type === 'block') {
                    handleStatusChange(confirmAction.userId, 'blocked');
                  } else {
                    handleStatusChange(confirmAction.userId, 'paused');
                  }
                }}
                disabled={actionLoading}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2",
                  confirmAction.type === 'delete' || confirmAction.type === 'block'
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-yellow-500 hover:bg-yellow-600"
                )}
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={() => { setShowCreateModal(false); fetchData(); }}
          departments={departments}
        />
      )}
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({ 
  onClose, 
  onSuccess,
  departments 
}: { 
  onClose: () => void; 
  onSuccess: () => void;
  departments: Department[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'employee' | 'receptionist' | 'admin'>('employee');
  const [departmentId, setDepartmentId] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, role }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário');

      // Create employee record
      const { error: empError } = await supabase.from('employees').insert({
        id: authData.user.id,
        full_name: fullName,
        email,
        role,
        department_id: departmentId || null,
        account_status: 'active',
        status: 'available'
      });

      if (empError) throw empError;

      onSuccess();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Novo Usuário</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Nome do usuário"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              placeholder="email@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              placeholder="Mínimo 6 caracteres"
              minLength={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'employee' | 'receptionist' | 'admin')}
                className="w-full h-12 px-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="employee">Funcionário</option>
                <option value="receptionist">Recepcionista</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">Nenhum</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar Usuário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
