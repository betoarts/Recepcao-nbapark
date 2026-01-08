
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'employee' | 'receptionist'>('employee');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Sign Up
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (authData.user) {
      // 2. Create Employee Profile
      const { error: profileError } = await supabase
        .from('employees')
        .insert({
          id: authData.user.id,
          full_name: fullName,
          email: email,
          role: role,
          status: 'available'
        });

      if (profileError) {
        setError("Account created but profile failed: " + profileError.message);
        setLoading(false);
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cadastro Inicial</h1>
          <p className="text-gray-500">Crie sua conta no sistema</p>
        </div>

        {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
            {error}
            </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="block w-full h-12 px-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Seu Nome"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full h-12 px-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
              className="block w-full h-12 px-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
            <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="block w-full h-12 px-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 bg-white"
            >
                <option value="employee">Funcionário</option>
                <option value="receptionist">Recepcionista</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all active:scale-[0.98] mt-4",
              loading && "opacity-75 cursor-not-allowed"
            )}
          >
            {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Criar Conta"}
          </button>
          
          <div className="text-center mt-4">
              <Link to="/login" className="text-blue-600 hover:text-blue-800 font-medium">Já tenho conta</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
