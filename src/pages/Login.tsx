
import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Building2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { cn } from '../lib/utils';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { logoUrl } = useSettings();

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Check account status immediately
      const { data: emp } = await supabase
        .from('employees')
        .select('account_status')
        .eq('id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (emp && (emp.account_status === 'blocked' || emp.account_status === 'paused')) {
        await supabase.auth.signOut();
        setError('Sua conta está suspensa ou bloqueada. Contate o administrador.');
        setLoading(false);
        return;
      }

      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
        <div className="text-center mb-8 flex flex-col items-center">
          <div className="h-16 w-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20 mb-4 overflow-hidden">
             {logoUrl ? (
                 <img src={logoUrl} alt="Logo" className="w-full h-full object-contain bg-white" />
             ) : (
                 <Building2 className="h-8 w-8 text-white" />
             )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Recepção Corporate</h1>
          <p className="text-gray-500">Faça login para continuar</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="email">
              Email Corporativo
            </label>
            <div>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full h-14 px-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg"
                placeholder="nome@empresa.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="password">
              Senha
            </label>
            <div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full h-14 px-4 rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-lg"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all active:scale-[0.98]",
              loading && "opacity-75 cursor-not-allowed"
            )}
          >
            {loading ? (
              <Loader2 className="animate-spin h-6 w-6" />
            ) : (
              "Entrar no Sistema"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
