import { NavLink } from 'react-router-dom';
import { 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  Shield,
  Star,
  TrendingUp,
  DollarSign,
  Brain,
  Building2,
  CreditCard,
  Activity,
  Search,
  Calculator,
  PieChart,
  BarChart4,
  Target,
  Zap,
  Network,
  Plus
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export const Sidebar = () => {
  const { user } = useAuth();
  const { canView, isAdmin, isFranchisee, isClient } = usePermissions();

  const menuItems = [
    {
      icon: BarChart3,
      label: 'Dashboard',
      path: '/dashboard',
      permission: 'view_dashboard',
      roles: ['admin', 'franchisee', 'client']
    },
    {
      icon: FileText,
      label: 'Extrato de Lançamentos', // ALTERADO DE "Conciliações"
      path: '/extrato-lancamentos',
      permission: 'view_reports',
      roles: ['admin', 'franchisee', 'client']
    },
    {
      icon: TrendingUp,
      label: 'DRE',
      path: '/dre',
      permission: 'view_reports',
      roles: ['admin', 'franchisee', 'client']
    },
    {
      icon: DollarSign,
      label: 'DFC',
      path: '/dfc',
      permission: 'view_reports',
      roles: ['admin', 'franchisee', 'client']
    },
    {
      icon: CreditCard,
      label: 'Fluxo de Caixa',
      path: '/cashflow',
      permission: 'view_reports',
      roles: ['admin', 'franchisee', 'client']
    },
    {
      icon: Users,
      label: 'Clientes',
      path: '/clientes',
      permission: 'view_clients',
      roles: ['admin', 'franchisee'] // SOMENTE ADMIN E FRANQUEADOS
    },
    {
      icon: Building2,
      label: 'Franqueados',
      path: '/franqueados',
      permission: 'view_franchisees',
      roles: ['admin'] // SOMENTE ADMIN
    },
    {
      icon: Shield,
      label: 'NOC',
      path: '/noc',
      permission: 'view_noc',
      roles: ['admin', 'franchisee']
    },
    {
      icon: Activity,
      label: 'Métricas',
      path: '/metrics',
      permission: 'view_noc',
      roles: ['admin', 'franchisee']
    },
    {
      icon: Search,
      label: 'Análises Avançadas',
      path: '/analises',
      permission: 'view_analysis',
      roles: ['admin', 'franchisee']
    },
    {
      icon: Calculator,
      label: 'Análise BPO Financeiro',
      path: '/analise-bpo',
      permission: 'view_bpo_analysis',
      roles: ['admin', 'franchisee']
    },
    {
      icon: PieChart,
      label: 'Dashboard NOC',
      path: '/noc-dashboard',
      permission: 'view_noc',
      roles: ['admin', 'franchisee']
    },
    {
      icon: Brain,
      label: 'IA Avançada',
      path: '/ia-config',
      permission: 'view_ai',
      roles: ['admin'] // SOMENTE ADMIN
    },
    {
      icon: Settings,
      label: 'Configurações',
      path: '/configuracoes',
      permission: 'view_settings',
      roles: ['admin', 'franchisee', 'client']
    }
  ];

  // Filtrar itens baseado nas permissões do usuário
  const filteredItems = menuItems.filter(item => {
    // Verificar se o usuário tem o role necessário
    if (!user || !item.roles.includes(user.role)) {
      return false;
    }
    
    // Verificar se tem a permissão específica
    if (item.permission && !canView(item.permission)) {
      return false;
    }
    
    return true;
  });

  const getRoleLabel = () => {
    if (isAdmin()) return 'Administrador';
    if (isFranchisee()) return 'Franqueado';
    if (isClient()) return 'Cliente';
    return 'Usuário';
  };

  return (
    <div className="w-64 bg-white dark:bg-gray-800 shadow-lg border-r border-gray-200 dark:border-gray-700 h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              iFin App
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {getRoleLabel()}
            </p>
          </div>
        </div>
        
        {user && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email}
            </p>
            {user.companyCnpj && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                CNPJ: {user.companyCnpj}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 dark:from-purple-900 dark:to-blue-900 dark:text-purple-300 border border-purple-200 dark:border-purple-700'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:translate-x-1'
                }`
              }
            >
              <item.icon className="w-5 h-5 mr-3 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
              
              {/* Badge para novos recursos */}
              {item.label === 'IA Avançada' && (
                <span className="ml-auto bg-gradient-to-r from-purple-500 to-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  NEW
                </span>
              )}
            </NavLink>
          ))}
        </div>
        
        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-4 mb-3">
            Ações Rápidas
          </h3>
          <div className="space-y-1">
            <button className="w-full flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Plus className="w-4 h-4 mr-3" />
              Novo Relatório
            </button>
            <button className="w-full flex items-center px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <TrendingUp className="w-4 h-4 mr-3" />
              Ver Analytics
            </button>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Versão 2.0.0</span>
          <div className="flex items-center space-x-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};
