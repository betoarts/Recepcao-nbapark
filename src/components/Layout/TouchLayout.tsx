

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { 
  LogOut, 
  LayoutGrid, 
  Calendar, 
  Users, 
  UserCircle,
  Settings,
  Bell,
  HelpCircle,
  Building2,
  Shield,
  MessageSquare
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  roles?: string[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

export default function TouchLayout() {
  const { signOut, employee } = useAuth();
  const { logoUrl } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Navigation sections organized by category
  const navSections: NavSection[] = [
    {
      title: 'Principal',
      items: [
        { label: 'Início', icon: LayoutGrid, path: '/', roles: ['receptionist', 'employee', 'admin'] },
        { label: 'Minha Agenda', icon: Calendar, path: '/schedule', roles: ['employee', 'receptionist', 'admin'] },
        { label: 'Chat', icon: MessageSquare, path: '/chat', roles: ['employee', 'receptionist', 'admin'] },
      ]
    },
    {
      title: 'Gestão',
      items: [
        { label: 'Funcionários', icon: Users, path: '/employees', roles: ['receptionist', 'admin'] },
        { label: 'Departamentos', icon: Building2, path: '/departments', roles: ['receptionist', 'admin'] },
      ]
    },
    {
      title: 'Configurações',
      items: [
        { label: 'Meu Perfil', icon: UserCircle, path: '/profile', roles: ['employee', 'receptionist', 'admin'] },
        { label: 'Notificações', icon: Bell, path: '/notifications', roles: ['employee', 'receptionist', 'admin'] },
        { label: 'Ajuda', icon: HelpCircle, path: '/help', roles: ['employee', 'receptionist', 'admin'] },
      ]
    },
    {
      title: 'Administração',
      items: [
        { label: 'Painel Admin', icon: Shield, path: '/sudo', roles: ['admin'] },
      ]
    }
  ];

  // Flat list for mobile nav (simplified)
  const mobileNavItems: NavItem[] = [
    { label: 'Início', icon: LayoutGrid, path: '/', roles: ['receptionist', 'employee'] },
    { label: 'Agenda', icon: Calendar, path: '/schedule', roles: ['employee', 'receptionist'] },
    { label: 'Perfil', icon: UserCircle, path: '/profile', roles: ['employee', 'receptionist'] },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/dashboard';
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden flex-col md:flex-row">
      {/* Sidebar - Desktop/Tablet */}
      <aside className="hidden md:flex w-20 lg:w-72 bg-white border-r border-gray-200 flex-col shadow-sm z-10 transition-all duration-300">
        {/* Logo */}
        <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-gray-100">
          <div className="h-11 w-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shrink-0 shadow-lg shadow-blue-600/20 overflow-hidden">
            {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain bg-white" />
            ) : (
                <span>NP</span>
            )}
          </div>
          <div className="hidden lg:block ml-3">
            <span className="font-bold text-gray-900 text-lg">NBA Park</span>
            <p className="text-xs text-gray-500">Recepção</p>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          {navSections.map((section, sectionIndex) => {
            // Show items if: no role restriction OR employee has matching role OR employee is loading (show all)
            const filteredItems = section.items.filter(item => {
              if (!item.roles) return true; // No role restriction
              if (!employee) return true; // Show all while loading
              return item.roles.includes(employee.role);
            });
            
            if (filteredItems.length === 0) return null;

            return (
              <div key={sectionIndex} className="mb-6">
                {section.title && (
                  <h3 className="hidden lg:block px-4 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={cn(
                        "w-full flex items-center justify-center lg:justify-start p-3 lg:px-4 rounded-xl transition-all duration-200 group touch-manipulation",
                        isActive(item.path)
                          ? "bg-blue-50 text-blue-600 shadow-sm border border-blue-100"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 active:scale-95"
                      )}
                    >
                      <item.icon className={cn(
                        "h-6 w-6 lg:h-5 lg:w-5", 
                        isActive(item.path) ? "text-blue-600" : "text-gray-400 group-hover:text-gray-600"
                      )} />
                      <span className="hidden lg:block ml-3 font-medium">{item.label}</span>
                      {isActive(item.path) && (
                        <div className="hidden lg:block ml-auto h-2 w-2 rounded-full bg-blue-600"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center justify-center lg:justify-start w-full px-2 py-3 rounded-xl hover:bg-white transition-colors group"
          >
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-white shadow-sm">
              {employee?.photo_url 
                ? <img src={employee.photo_url} alt="" className="h-full w-full object-cover" /> 
                : <span className="text-gray-600 font-bold">{employee?.full_name?.charAt(0) || 'U'}</span>
              }
            </div>
            <div className="hidden lg:block ml-3 overflow-hidden text-left">
              <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {employee?.full_name || 'Usuário'}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">
                {employee?.role === 'receptionist' ? 'Recepcionista' : 'Funcionário'}
              </p>
            </div>
            <Settings className="hidden lg:block ml-auto h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </button>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center lg:justify-start p-3 mt-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors active:scale-95"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden lg:block ml-3 font-medium">Sair</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative w-full h-full pb-20 md:pb-0 bg-gray-50/50">
        <div className="h-full w-full p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 pb-safe">
        <div className="flex justify-around items-center h-16 sm:h-20 px-2">
          {mobileNavItems.filter(item => !item.roles || !employee || item.roles.includes(employee.role)).map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center h-full active:scale-95 transition-all rounded-xl mx-1",
                isActive(item.path) 
                  ? "text-blue-600 bg-blue-50" 
                  : "text-gray-400"
              )}
            >
              <item.icon className={cn(
                "h-6 w-6 sm:h-7 sm:w-7 mb-1", 
                isActive(item.path) && "fill-current"
              )} />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={handleSignOut}
            className="flex-1 flex flex-col items-center justify-center h-full text-red-500 active:scale-95 transition-transform mx-1"
          >
            <LogOut className="h-6 w-6 sm:h-7 sm:w-7 mb-1" />
            <span className="text-[10px] sm:text-xs font-medium">Sair</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
