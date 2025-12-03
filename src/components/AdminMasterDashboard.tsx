import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, Button, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { Users, Building2, TrendingUp, DollarSign, Star, Shield, Eye, Edit, Plus, Brain, Settings } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import { CompanyFilter } from './CompanyFilter';
import AISettingsPanel from './AISettingsPanel';

export const AdminMasterDashboard = () => {
  const { isAdmin } = usePermissions();
  const { selectedCompany, viewMode } = useCompanyFilter();

  if (!isAdmin()) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Acesso Restrito</h3>
          <p className="text-gray-600 mt-2">Esta área é exclusiva para administradores.</p>
        </Card>
      </div>
    );
  }

  const franchisees = [
    {
      id: 1,
      name: "Franqueado Alpha",
      cnpj: "11.111.111/0001-11",
      status: "active",
      clients: 15,
      revenue: "R$ 25.000",
      commission: "R$ 5.000",
      satisfaction: 4.7,
      joinedDate: "2023-03-15",
      lastActivity: "2024-01-15 14:30"
    },
    {
      id: 2,
      name: "Franqueado Beta",
      cnpj: "22.222.222/0002-22",
      status: "active",
      clients: 8,
      revenue: "R$ 12.000",
      commission: "R$ 2.400",
      satisfaction: 4.5,
      joinedDate: "2023-06-20",
      lastActivity: "2024-01-14 09:15"
    },
    {
      id: 3,
      name: "Franqueado Gamma",
      cnpj: "33.333.333/0003-33",
      status: "trial",
      clients: 3,
      revenue: "R$ 3.500",
      commission: "R$ 700",
      satisfaction: 4.2,
      joinedDate: "2024-01-01",
      lastActivity: "2024-01-13 16:45"
    }
  ];

  const topClients = [
    {
      id: 1,
      name: "Mega Corp S.A.",
      franchisee: "Franqueado Alpha",
      revenue: "R$ 125.000",
      plan: "Enterprise Plus",
      satisfaction: 4.9,
      lastReport: "2024-01-15",
      status: "active"
    },
    {
      id: 2,
      name: "Tech Solutions Ltda",
      franchisee: "Franqueado Alpha",
      revenue: "R$ 85.000",
      plan: "Enterprise",
      satisfaction: 4.7,
      lastReport: "2024-01-14",
      status: "active"
    },
    {
      id: 3,
      name: "Comércio Varejo S.A.",
      franchisee: "Franqueado Beta",
      revenue: "R$ 45.000",
      plan: "Professional",
      satisfaction: 4.5,
      lastReport: "2024-01-13",
      status: "active"
    }
  ];

  const recentActivities = [
    {
      id: 1,
      user: "João Silva",
      action: "Gerou relatório DRE",
      target: "Mega Corp S.A.",
      timestamp: "2024-01-15 15:30",
      type: "report"
    },
    {
      id: 2,
      user: "Maria Santos",
      action: "Criou novo cliente",
      target: "Nova Empresa Ltda",
      timestamp: "2024-01-15 14:15",
      type: "create"
    },
    {
      id: 3,
      user: "Pedro Oliveira",
      action: "Atualizou configurações",
      target: "Franqueado Beta",
      timestamp: "2024-01-15 13:45",
      type: "update"
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'trial': return 'yellow';
      case 'inactive': return 'red';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'trial': return 'Trial';
      case 'inactive': return 'Inativo';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Shield className="w-8 h-8 mr-3 text-purple-600" />
            Painel Administrativo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestão completa de franqueados, clientes e operações
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button icon={Plus} className="bg-purple-600 hover:bg-purple-700">
            Novo Franqueado
          </Button>
          <Button icon={TrendingUp} variant="secondary">
            Relatórios
          </Button>
        </div>
      </div>

      {/* Company Filter */}
      <CompanyFilter />

      {/* KPIs Gerais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Franqueados</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{franchisees.length}</p>
              <p className="text-xs text-green-600">+2 este mês</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Clientes Totais</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {franchisees.reduce((sum, f) => sum + f.clients, 0)}
              </p>
              <p className="text-xs text-green-600">+8% este mês</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Receita Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">R$ 156.890</p>
              <p className="text-xs text-green-600">+15% este mês</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center">
            <Star className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Satisfação Geral</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4.7/5</p>
              <p className="text-xs text-green-600">+0.3 este mês</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Abas de Gerenciamento */}
      <TabGroup>
        <TabList className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-purple-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-purple-400 focus:outline-none focus:ring-2 data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-purple-900">
            <Building2 className="w-4 h-4 inline mr-2" />
            Franqueados
          </Tab>
          <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-purple-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-purple-400 focus:outline-none focus:ring-2 data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-purple-900">
            <Users className="w-4 h-4 inline mr-2" />
            Clientes
          </Tab>
          <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-purple-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-purple-400 focus:outline-none focus:ring-2 data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-purple-900">
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Atividades
          </Tab>
          <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-purple-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-purple-400 focus:outline-none focus:ring-2 data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-purple-900">
            <DollarSign className="w-4 h-4 inline mr-2" />
            Financeiro
          </Tab>
          <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-purple-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-purple-400 focus:outline-none focus:ring-2 data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-purple-900">
            <Brain className="w-4 h-4 inline mr-2" />
            IA Avançada
          </Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Gestão de Franqueados</h3>
                <Button icon={Plus} size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Adicionar
                </Button>
              </div>
              
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Franqueado</TableHeaderCell>
                    <TableHeaderCell>CNPJ</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Clientes</TableHeaderCell>
                    <TableHeaderCell>Receita</TableHeaderCell>
                    <TableHeaderCell>Comissão</TableHeaderCell>
                    <TableHeaderCell>Satisfação</TableHeaderCell>
                    <TableHeaderCell>Última Atividade</TableHeaderCell>
                    <TableHeaderCell>Ações</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {franchisees.map((franchisee) => (
                    <TableRow key={franchisee.id}>
                      <TableCell className="font-medium">{franchisee.name}</TableCell>
                      <TableCell>{franchisee.cnpj}</TableCell>
                      <TableCell>
                        <Badge color={getStatusColor(franchisee.status)}>
                          {getStatusLabel(franchisee.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge color="blue" size="sm">
                          {franchisee.clients} clientes
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-green-600">{franchisee.revenue}</TableCell>
                      <TableCell className="font-medium text-purple-600">{franchisee.commission}</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          {franchisee.satisfaction}/5.0
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">{franchisee.lastActivity}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="xs" icon={Eye} variant="secondary">
                            Ver
                          </Button>
                          <Button size="xs" icon={Edit} variant="secondary">
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabPanel>
          
          <TabPanel>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Gestão de Clientes</h3>
                <Button icon={Plus} size="sm" className="bg-blue-600 hover:bg-blue-700">
                  Adicionar
                </Button>
              </div>
              
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Cliente</TableHeaderCell>
                    <TableHeaderCell>Franqueado</TableHeaderCell>
                    <TableHeaderCell>Receita</TableHeaderCell>
                    <TableHeaderCell>Plano</TableHeaderCell>
                    <TableHeaderCell>Satisfação</TableHeaderCell>
                    <TableHeaderCell>Último Relatório</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Ações</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.franchisee}</TableCell>
                      <TableCell className="font-medium text-green-600">{client.revenue}</TableCell>
                      <TableCell>
                        <Badge color="purple" size="sm">
                          {client.plan}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          {client.satisfaction}/5.0
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">{client.lastReport}</span>
                      </TableCell>
                      <TableCell>
                        <Badge color="green" size="sm">
                          Ativo
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="xs" icon={Eye} variant="secondary">
                            Ver
                          </Button>
                          <Button size="xs" icon={Edit} variant="secondary">
                            Editar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabPanel>
          
          <TabPanel>
            <Card>
              <h3 className="text-lg font-semibold mb-4">Atividades Recentes</h3>
              
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Usuário</TableHeaderCell>
                    <TableHeaderCell>Ação</TableHeaderCell>
                    <TableHeaderCell>Alvo</TableHeaderCell>
                    <TableHeaderCell>Data/Hora</TableHeaderCell>
                    <TableHeaderCell>Tipo</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentActivities.map((activity) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.user}</TableCell>
                      <TableCell>{activity.action}</TableCell>
                      <TableCell className="font-medium">{activity.target}</TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">{activity.timestamp}</span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          color={
                            activity.type === 'report' ? 'blue' :
                            activity.type === 'create' ? 'green' :
                            activity.type === 'update' ? 'yellow' : 'gray'
                          }
                          size="sm"
                        >
                          {activity.type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabPanel>
          
          <TabPanel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span>Receita Total</span>
                    <span className="font-bold text-green-600">R$ 156.890</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span>Comissões Pagas</span>
                    <span className="font-bold text-blue-600">R$ 31.378</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span>Lucro Líquido</span>
                    <span className="font-bold text-purple-600">R$ 125.512</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span>Custos Operacionais</span>
                    <span className="font-bold text-yellow-600">R$ 18.500</span>
                  </div>
                </div>
              </Card>
              
              <Card>
                <h3 className="text-lg font-semibold mb-4">Performance por Franqueado</h3>
                
                <div className="space-y-3">
                  {franchisees.map((franchisee) => (
                    <div key={franchisee.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{franchisee.name}</p>
                        <p className="text-xs text-gray-500">{franchisee.clients} clientes</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-green-600">{franchisee.revenue}</p>
                        <p className="text-xs text-gray-500">{franchisee.commission}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabPanel>
          
          <TabPanel>
            <AISettingsPanel />
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
};