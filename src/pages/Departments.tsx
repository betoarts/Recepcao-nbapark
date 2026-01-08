
import { useState, useEffect, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Department } from '../types';
import { 
  Building2, 
  Plus, 
  Pencil, 
  Trash2, 
  Users, 
  Loader2, 
  X, 
  Search,
  AlertTriangle
} from 'lucide-react';

interface DepartmentWithCount extends Department {
  employee_count?: number;
}

export default function Departments() {
  const { employee } = useAuth();
  const [departments, setDepartments] = useState<DepartmentWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    
    // Fetch departments
    const { data: depts, error } = await supabase
      .from('departments')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching departments:', error);
      setLoading(false);
      return;
    }

    // Fetch employee counts per department
    const { data: employees } = await supabase
      .from('employees')
      .select('department_id');
    
    const counts: Record<string, number> = {};
    employees?.forEach(emp => {
      if (emp.department_id) {
        counts[emp.department_id] = (counts[emp.department_id] || 0) + 1;
      }
    });

    const deptsWithCounts = depts?.map(dept => ({
      ...dept,
      employee_count: counts[dept.id] || 0
    })) || [];

    setDepartments(deptsWithCounts);
    setLoading(false);
  };

  const handleDelete = async (dept: Department) => {
    setActionLoading(true);
    
    // First unassign employees from this department
    await supabase
      .from('employees')
      .update({ department_id: null })
      .eq('department_id', dept.id);
    
    // Then delete department
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', dept.id);
    
    if (!error) {
      setDepartments(prev => prev.filter(d => d.id !== dept.id));
    }
    
    setActionLoading(false);
    setDeleteConfirm(null);
  };

  const filteredDepts = departments.filter(dept =>
    dept.name.toLowerCase().includes(filter.toLowerCase())
  );

  const canManage = employee?.role === 'admin' || employee?.role === 'receptionist';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700 flex items-center justify-center shadow-lg">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Departamentos</h1>
            <p className="text-gray-500">Gerencie os departamentos da empresa</p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditingDept(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-600/20"
          >
            <Plus className="h-5 w-5" />
            Novo Departamento
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar departamentos..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full h-12 pl-12 pr-4 rounded-xl border-gray-200 bg-white shadow-sm focus:border-purple-500 focus:ring-purple-500"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Total Departamentos</p>
          <p className="text-2xl font-bold text-gray-900">{departments.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Funcionários Alocados</p>
          <p className="text-2xl font-bold text-purple-600">
            {departments.reduce((acc, d) => acc + (d.employee_count || 0), 0)}
          </p>
        </div>
      </div>

      {/* Department List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        ) : filteredDepts.length === 0 ? (
          <div className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter ? 'Nenhum departamento encontrado' : 'Nenhum departamento cadastrado'}
            </h3>
            <p className="text-gray-500">
              {filter ? 'Tente outra busca' : 'Clique em "Novo Departamento" para começar'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredDepts.map((dept) => (
              <div 
                key={dept.id} 
                className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Users className="h-4 w-4" />
                      <span>{dept.employee_count || 0} funcionário{dept.employee_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                
                {canManage && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setEditingDept(dept); setShowModal(true); }}
                      className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(dept)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <DepartmentModal
          department={editingDept}
          onClose={() => { setShowModal(false); setEditingDept(null); }}
          onSuccess={() => { setShowModal(false); setEditingDept(null); fetchDepartments(); }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Excluir Departamento</h3>
                <p className="text-gray-500">{deleteConfirm.name}</p>
              </div>
            </div>
            
            <p className="text-gray-600 mb-6">
              Os funcionários deste departamento serão desvinculados, mas não excluídos. Esta ação não pode ser desfeita.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={actionLoading}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading}
                className="flex-1 py-3 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Department Create/Edit Modal
function DepartmentModal({
  department,
  onClose,
  onSuccess
}: {
  department: Department | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(department?.name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (department) {
        // Update
        const { error } = await supabase
          .from('departments')
          .update({ name })
          .eq('id', department.id);
        
        if (error) throw error;
      } else {
        // Create
        const { error } = await supabase
          .from('departments')
          .insert({ name });
        
        if (error) throw error;
      }
      
      onSuccess();
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erro ao salvar departamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {department ? 'Editar Departamento' : 'Novo Departamento'}
            </h2>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Departamento</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-4 rounded-xl border-gray-200 focus:border-purple-500 focus:ring-purple-500"
              placeholder="Ex: Marketing, TI, RH..."
            />
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
              className="flex-1 py-3 px-4 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {department ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
