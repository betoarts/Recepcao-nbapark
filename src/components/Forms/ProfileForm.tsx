
import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Camera, User, Phone, Mail, Briefcase, Building2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Department, UserRole } from '../../types';

interface ProfileFormProps {
  onSuccess?: () => void;
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const { user, employee, refreshEmployee } = useAuth();
  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Departments list
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDepts, setLoadingDepts] = useState(true);

  // Form fields
  const [fullName, setFullName] = useState(employee?.full_name || '');
  const [phone, setPhone] = useState(employee?.phone || '');
  const [email, setEmail] = useState(employee?.email || '');
  const [departmentId, setDepartmentId] = useState(employee?.department_id || '');
  const [role, setRole] = useState<UserRole>(employee?.role || 'employee');
  const [photoUrl, setPhotoUrl] = useState(employee?.photo_url || '');

  // Fetch departments
  useEffect(() => {
    supabase
      .from('departments')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (!error && data) {
          setDepartments(data);
        }
        setLoadingDepts(false);
      });
  }, []);

  // Update form when employee data changes
  useEffect(() => {
    if (employee) {
      setFullName(employee.full_name || '');
      setPhone(employee.phone || '');
      setEmail(employee.email || '');
      setDepartmentId(employee.department_id || '');
      setRole(employee.role || 'employee');
      setPhotoUrl(employee.photo_url || '');
    }
  }, [employee]);

  // Handle photo upload
  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione uma imagem válida.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('employee-photos')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('employee-photos')
        .getPublicUrl(filePath);

      setPhotoUrl(publicUrl);
    } catch (err: unknown) {
      console.error('Error uploading photo:', err);
      setError('Erro ao enviar foto. Tente novamente.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('employees')
        .update({
          full_name: fullName,
          phone: phone || null,
          email,
          department_id: departmentId || null,
          role,
          photo_url: photoUrl || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setSuccess(true);
      await refreshEmployee();
      
      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err: unknown) {
      console.error('Error updating profile:', err);
      setError('Erro ao salvar perfil. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Meu Perfil</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm font-medium border border-green-100 mb-6">
          Perfil atualizado com sucesso!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photo Upload */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-28 w-28 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
              {photoUrl ? (
                <img src={photoUrl} alt="Foto" className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12 text-gray-400" />
              )}
            </div>
            
            <label className={cn(
              "absolute bottom-0 right-0 h-10 w-10 rounded-full bg-blue-600 text-white flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors shadow-lg",
              uploadingPhoto && "opacity-75 cursor-not-allowed"
            )}>
              {uploadingPhoto ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="sr-only"
              />
            </label>
          </div>
          <p className="text-sm text-gray-500">Clique no ícone para alterar a foto</p>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white transition-colors"
              placeholder="Seu nome completo"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white transition-colors"
              placeholder="(11) 99999-9999"
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white transition-colors"
              placeholder="seu.email@empresa.com"
            />
          </div>
        </div>

        {/* Department & Role */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                disabled={loadingDepts}
                className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white appearance-none"
              >
                <option value="">Selecione...</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
            <div className="relative">
              <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="block w-full h-12 pl-12 pr-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-gray-50/50 focus:bg-white appearance-none"
              >
                <option value="employee">Funcionário</option>
                <option value="receptionist">Recepcionista</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || uploadingPhoto}
          className={cn(
            "w-full py-4 rounded-xl bg-blue-600 text-white font-bold text-lg active:scale-[0.98] transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2",
            (loading || uploadingPhoto) && "opacity-75 cursor-not-allowed"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Perfil"
          )}
        </button>
      </form>
    </div>
  );
}
