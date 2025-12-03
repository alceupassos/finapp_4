import { Card, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Badge, Button, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react';
import { Users, TrendingUp, DollarSign, Star, Plus, Eye, Edit, Building, Calendar } from 'lucide-react';
import { usePermissions } from '../hooks/usePermissions';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import { CompanyFilter } from './CompanyFilter';

export const FranchiseeClientDashboard = () => {
  const { isFranchisee } = usePermissions();
  const { selectedCompany, viewMode } = useCompanyFilter();

  if (!isFranchisee()) {
    return (
      <div className="flex items-center justify-center h-64">
        <Card className="p-6 text-center">
          <Building className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">Acesso Restrito</h3>
          <p className="text-gray-600 mt-2">Esta área é exclusiva para franqueados.</p>
        </Card>
      </div>
    );
  }

  const clients = [
    {
      id: 1,
      name: "Empresa ABC Ltda",
      cnpj: "12.345.678/0001-90",
      status: "active",
      lastAccess: "2024-01-15",
      revenue: "R$ 45.000",
      plan: "Enterprise",
      reportsGenerated: 234,
      satisfaction: 4.8,
      franchiseeId: "F001",
      joinDate: "2023-06-15",
      nextPayment: "2024-02-15"
    },
    {
      id: 2,
      name: "Indústria XYZ S.A.",
      cnpj: "98.765.432/0001-10",
      status: "trial",
      lastAccess: "2024-01-14",
      revenue: "R$ 12.000",
      plan: "Startup",
      reportsGenerated: 45,
      satisfaction: 4.5,
      franchiseeId: "F001",
      joinDate: "2024-01-01",
      nextPayment: "2024-01-31"
    },
    {
      id: 3,
      name: "Comércio Silva Ltda",
      cnpj: "11.223.344/0001-55",
      status: "active",
      lastAccess: "2024-01-13",
      revenue: "R$ 28.500",
      plan: "Professional",
      reportsGenerated: 156,
      satisfaction: 4.6,
      franchiseeId: "F001",
      joinDate: "2023-09-20",
      nextPayment: "2024-02-20"
    },
    {
      id: 4,
      name: "Serviços Modernos S.A.",
      cnpj: "44.556.677/0001-88",
      status: "active",
      lastAccess: "2024-01-12",
      revenue: "R$ 65.000",
      plan: "Enterprise Plus",
      reportsGenerated: 298,
      satisfaction: 4.9,
      franchiseeId: "F001",
      joinDate: "2023-04-10",
      nextPayment: "2024-02-10"
    }
  ];

  const myClients = clients.filter(client => client.franchiseeId === "F001");

  const monthlyRevenue = myClients.reduce((sum, client) => {
    const revenue = parseFloat(client.revenue.replace(/[R$\s.]/g, '').replace(',', '.'));
    return sum + revenue;
  }, 0);

  const activeClients = myClients.filter(client => client.status === 'active').length;
  const trialClients = myClients.filter(client => client.status === 'trial').length;
  const avgSatisfaction = myClients.reduce((sum, client) => sum + client.satisfaction, 0) / myClients.length;

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

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'Enterprise Plus': return 'purple';
      case 'Enterprise': return 'blue';
      case 'Professional': return 'green';
      case 'Startup': return 'yellow';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Building className="w-8 h-8 mr-3 text-blue-600" />
            Meus Clientes
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Gestão completa dos clientes do seu franqueado
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Button icon={Plus} className="bg-blue-600 hover:bg-blue-700">
            Novo Cliente
          </Button>
          <Button icon={TrendingUp} variant="secondary">
            Relatórios
          </Button>
        </div>
      </div>

      {/* Company Filter */}
      <CompanyFilter />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Clientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{myClients.length}</p>
              <p className="text-xs text-green-600">+2 este mês</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Ativos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeClients}</p>
              <p className="text-xs text-green-600">{Math.round((activeClients / myClients.length) * 100)}% do total</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Receita Mensal</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                R$ {monthlyRevenue.toLocaleString('pt-BR')}
              </p>
              <p className="text-xs text-green-600">+12% este mês</p>
            </div>
          </div>
        </Card>
        
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-gray-800 dark:to-gray-700">
          <div className="flex items-center">
            <Star className="w-8 h-8 text-yellow-600" />
            <div className="ml-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">Satisfação Média</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{avgSatisfaction.toFixed(1)}/5</p>
              <p className="text-xs text-green-600">Excelente</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Abas de Gerenciamento */}
      <TabGroup>
        <TabList className="flex space-x-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
          <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-blue-900">
            <Users className="w-4 h-4 inline mr-2" />
            Meus Clientes
          </Tab>
          <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-blue-900">
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Performance
          </Tab>
          <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-blue-900">
            <DollarSign className="w-4 h-4 inline mr-2" />
            Financeiro
          </Tab>
          <Tab className="w-full rounded-lg py-2.5 text-sm font-medium leading-5 text-blue-700 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 data-[selected]:bg-white data-[selected]:shadow data-[selected]:text-blue-900">
            <Calendar className="w-4 h-4 inline mr-2" />
            Vencimentos
          </Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Lista de Clientes</h3>
                <div className="flex space-x-2">
                  <Button icon={Plus} size="sm" className="bg-blue-600 hover:bg-blue-700">
                    Adicionar
                  </Button>
                  <Button size="sm" variant="secondary">
                    Exportar
                  </Button>
                </div>
              </div>
              
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Empresa</TableHeaderCell>
                    <TableHeaderCell>CNPJ</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Plano</TableHeaderCell>
                    <TableHeaderCell>Receita</TableHeaderCell>
                    <TableHeaderCell>Relatórios</TableHeaderCell>
                    <TableHeaderCell>Satisfação</TableHeaderCell>
                    <TableHeaderCell>Último Acesso</TableHeaderCell>
                    <TableHeaderCell>Ações</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.cnpj}</TableCell>
                      <TableCell>
                        <Badge color={getStatusColor(client.status)}>
                          {getStatusLabel(client.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge color={getPlanColor(client.plan)} size="sm">
                          {client.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-green-600">{client.revenue}</TableCell>
                      <TableCell>
                        <Badge color="blue" size="sm">
                          {client.reportsGenerated}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          {client.satisfaction}/5.0
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">{client.lastAccess}</span>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold mb-4">Performance por Cliente</h3>
                
                <div className="space-y-3">
                  {myClients.slice(0, 5).map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.reportsGenerated} relatórios</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-green-600">{client.revenue}</p>
                        <p className="text-xs text-gray-500">
                          <Star className="w-3 h-3 inline mr-1" />
                          {client.satisfaction}/5
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
              
              <Card>
                <h3 className="text-lg font-semibold mb-4">Estatísticas de Uso</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span>Total Relatórios Gerados</span>
                    <span className="font-bold text-blue-600">
                      {myClients.reduce((sum, client) => sum + client.reportsGenerated, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span>Taxa de Retenção</span>
                    <span className="font-bold text-green-600">{Math.round((activeClients / myClients.length) * 100)}%</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span>Clientes em Trial</span>
                    <span className="font-bold text-yellow-600">{trialClients}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span>Satisfação Média</span>
                    <span className="font-bold text-purple-600">{avgSatisfaction.toFixed(1)}/5</span>
                  </div>
                </div>
              </Card>
            </div>
          </TabPanel>
          
          <TabPanel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold mb-4">Resumo Financeiro</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span>Receita Total</span>
                    <span className="font-bold text-green-600">R$ {monthlyRevenue.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span>Comissão (20%)</span>
                    <span className="font-bold text-blue-600">R$ {(monthlyRevenue * 0.2).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span>Lucro Estimado</span>
                    <span className="font-bold text-purple-600">R$ {(monthlyRevenue * 0.8).toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span>Custos Operacionais</span>
                    <span className="font-bold text-yellow-600">R$ {(monthlyRevenue * 0.1).toLocaleString('pt-BR')}</span>
                  </div>
                </div>
              </Card>
              
              <Card>
                <h3 className="text-lg font-semibold mb-4">Performance Financeira</h3>
                
                <div className="space-y-3">
                  {myClients.slice(0, 5).map((client) => (
                    <div key={client.id} className="flex items-center justify-between p-2 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{client.name}</p>
                        <p className="text-xs text-gray-500">{client.plan}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-sm text-green-600">{client.revenue}</p>
                        <p className="text-xs text-gray-500">Comissão: {client.revenue.replace('R$', 'R$ ' + (parseFloat(client.revenue.replace(/[R$\s.]/g, '').replace(',', '.')) * 0.2).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, "."))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabPanel>
          
          <TabPanel>
            <Card>
              <h3 className="text-lg font-semibold mb-4">Próximos Vencimentos</h3>
              
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Cliente</TableHeaderCell>
                    <TableHeaderCell>Plano</TableHeaderCell>
                    <TableHeaderCell>Valor</TableHeaderCell>
                    <TableHeaderCell>Vencimento</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Ações</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {myClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge color={getPlanColor(client.plan)} size="sm">
                          {client.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-green-600">{client.revenue}</TableCell>
                      <TableCell>
                        <span className="text-sm">{client.nextPayment}</span>
                      </TableCell>
                      <TableCell>
                        <Badge color={client.status === 'active' ? 'green' : 'yellow'} size="sm">
                          {client.status === 'active' ? 'Pago' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button size="xs" variant="secondary">
                            Cobrar
                          </Button>
                          <Button size="xs" variant="secondary">
                            Renegociar
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabPanel>
        </TabPanels>
      </TabGroup>
    </div>
  );
};