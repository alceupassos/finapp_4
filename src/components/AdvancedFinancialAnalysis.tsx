import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Badge, Grid, BarChart, LineChart, DonutChart, AreaChart, Metric, ProgressBar, Table, TableHead, TableRow, TableHeaderCell, TableBody, TableCell, Button, Select, SelectItem, NumberInput } from '@tremor/react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Building2, 
  Calendar,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Calculator,
  FileText,
  Eye,
  Settings,
  Search
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import { CompanyFilter } from './CompanyFilter';

interface FinancialMetric {
  name: string;
  value: number;
  previousValue: number;
  target: number;
  unit: string;
  category: 'revenue' | 'cost' | 'profitability' | 'efficiency' | 'growth';
}

interface FilterOptions {
  timeRange: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
  franchisee: string;
  client: string;
  serviceType: string;
  costCenter: string;
  billingType: 'hourly' | 'fixed' | 'performance' | 'mixed';
  analysisType: 'detailed' | 'summary' | 'comparative' | 'trend';
  includeProjections: boolean;
  includeBenchmarks: boolean;
}

interface BPOService {
  id: string;
  name: string;
  type: 'accounting' | 'payroll' | 'tax' | 'audit' | 'consulting' | 'compliance';
  revenue: number;
  cost: number;
  margin: number;
  clients: number;
  hours: number;
  efficiency: number;
}

const generateFinancialData = (days: number) => {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      revenue: 50000 + Math.random() * 20000,
      cost: 35000 + Math.random() * 10000,
      profit: 15000 + Math.random() * 15000,
      clients: 45 + Math.floor(Math.random() * 10),
      hours: 800 + Math.floor(Math.random() * 200)
    });
  }
  
  return data;
};

const bpoServices: BPOService[] = [
  {
    id: '1',
    name: 'Contabilidade Completa',
    type: 'accounting',
    revenue: 125000,
    cost: 87500,
    margin: 30,
    clients: 25,
    hours: 320,
    efficiency: 85
  },
  {
    id: '2',
    name: 'Folha de Pagamento',
    type: 'payroll',
    revenue: 89000,
    cost: 53400,
    margin: 40,
    clients: 18,
    hours: 180,
    efficiency: 92
  },
  {
    id: '3',
    name: 'Consultoria Tributária',
    type: 'tax',
    revenue: 156000,
    cost: 109200,
    margin: 30,
    clients: 12,
    hours: 240,
    efficiency: 78
  },
  {
    id: '4',
    name: 'Auditoria Interna',
    type: 'audit',
    revenue: 234000,
    cost: 140400,
    margin: 40,
    clients: 8,
    hours: 480,
    efficiency: 88
  },
  {
    id: '5',
    name: 'Conformidade Regulatória',
    type: 'compliance',
    revenue: 178000,
    cost: 124600,
    margin: 30,
    clients: 15,
    hours: 360,
    efficiency: 82
  }
];

export default function AdvancedFinancialAnalysis() {
  const { selectedCompany, viewMode } = useCompanyFilter();
  
  const [filters, setFilters] = useState<FilterOptions>({
    timeRange: 'monthly',
    franchisee: 'all',
    client: 'all',
    serviceType: 'all',
    costCenter: 'all',
    billingType: 'mixed',
    analysisType: 'detailed',
    includeProjections: true,
    includeBenchmarks: true
  });

  const [financialData, setFinancialData] = useState(generateFinancialData(30));
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['revenue', 'profit', 'margin']);
  const [isLoading, setIsLoading] = useState(false);

  const metrics: FinancialMetric[] = [
    {
      name: 'Receita Total',
      value: 782000,
      previousValue: 745000,
      target: 800000,
      unit: 'R$',
      category: 'revenue'
    },
    {
      name: 'Margem de Lucro',
      value: 35.2,
      previousValue: 32.8,
      target: 38,
      unit: '%',
      category: 'profitability'
    },
    {
      name: 'Custo Operacional',
      value: 506360,
      previousValue: 500140,
      target: 480000,
      unit: 'R$',
      category: 'cost'
    },
    {
      name: 'Clientes Ativos',
      value: 83,
      previousValue: 78,
      target: 90,
      unit: 'clientes',
      category: 'growth'
    },
    {
      name: 'Eficiência Operacional',
      value: 85,
      previousValue: 82,
      target: 88,
      unit: '%',
      category: 'efficiency'
    },
    {
      name: 'Ticket Médio',
      value: 9422,
      previousValue: 9551,
      target: 10000,
      unit: 'R$',
      category: 'revenue'
    }
  ];

  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setIsLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setFinancialData(generateFinancialData(filters.timeRange === 'daily' ? 7 : filters.timeRange === 'weekly' ? 4 : 30));
      setIsLoading(false);
    }, 1000);
  };

  const exportData = () => {
    // Simulate data export
    const event = new CustomEvent('showToast', {
      detail: { message: 'Dados exportados com sucesso!', type: 'success' }
    });
    window.dispatchEvent(event);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'revenue': return 'text-green-600 bg-green-100';
      case 'cost': return 'text-red-600 bg-red-100';
      case 'profitability': return 'text-blue-600 bg-blue-100';
      case 'efficiency': return 'text-purple-600 bg-purple-100';
      case 'growth': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const calculateVariation = (current: number, previous: number) => {
    return ((current - previous) / previous * 100).toFixed(1);
  };

  const calculateAchievement = (current: number, target: number) => {
    return Math.min(100, (current / target) * 100);
  };

  // Helper function to filter data by selected company
  const getFilteredData = () => {
    if (viewMode === 'single' && selectedCompany) {
      // Filter data for selected company (simulate company-specific data)
      return financialData.map(item => ({
        ...item,
        revenue: item.revenue * (0.3 + Math.random() * 0.4), // Simulate company-specific revenue
        cost: item.cost * (0.25 + Math.random() * 0.35),
        profit: item.profit * (0.2 + Math.random() * 0.6),
        clients: Math.floor(item.clients * (0.1 + Math.random() * 0.3))
      }));
    }
    return financialData;
  };

  // Helper function to get company-specific metrics
  const getFilteredMetrics = () => {
    const filteredData = getFilteredData();
    const totalRevenue = filteredData.reduce((sum, item) => sum + item.revenue, 0);
    const totalCost = filteredData.reduce((sum, item) => sum + item.cost, 0);
    const totalProfit = filteredData.reduce((sum, item) => sum + item.profit, 0);
    const avgClients = Math.floor(filteredData.reduce((sum, item) => sum + item.clients, 0) / filteredData.length);

    return metrics.map(metric => {
      let adjustedValue = metric.value;
      let adjustedPrevious = metric.previousValue;
      
      if (viewMode === 'single' && selectedCompany) {
        // Adjust metrics based on company selection
        const adjustmentFactor = 0.3 + Math.random() * 0.4;
        adjustedValue = metric.value * adjustmentFactor;
        adjustedPrevious = metric.previousValue * adjustmentFactor;
      }
      
      return {
        ...metric,
        value: adjustedValue,
        previousValue: adjustedPrevious
      };
    });
  };

  // Helper function to filter services by company
  const getFilteredServices = () => {
    if (viewMode === 'single' && selectedCompany) {
      // Filter services for selected company (simulate company-specific services)
      return bpoServices.map(service => ({
        ...service,
        revenue: service.revenue * (0.2 + Math.random() * 0.6),
        cost: service.cost * (0.25 + Math.random() * 0.5),
        margin: service.margin + (Math.random() - 0.5) * 10,
        clients: Math.floor(service.clients * (0.1 + Math.random() * 0.4))
      }));
    }
    return bpoServices;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 p-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <Title className="text-2xl font-bold text-gray-900 dark:text-white">
              Análise Financeira Avançada - BPO
            </Title>
            <Text className="text-gray-600 dark:text-gray-400">
              Análise especializada em gestão de serviços financeiros terceirizados
            </Text>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            icon={RefreshCw}
            variant="secondary"
            size="sm"
            onClick={() => handleFilterChange('timeRange', filters.timeRange)}
            loading={isLoading}
          >
            Atualizar
          </Button>
          <Button
            icon={Download}
            variant="secondary"
            size="sm"
            onClick={exportData}
          >
            Exportar
          </Button>
        </div>
      </div>

      {/* Company Filter */}
      <CompanyFilter />

      {/* Advanced Filters */}
      <Card className="dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-lg font-semibold text-gray-900 dark:text-white">
            Filtros Avançados
          </Title>
          <Badge color="blue" size="sm">Especialista BPO</Badge>
        </div>
        
        <Grid numItems={1} numItemsSm={2} numItemsLg={4} className="gap-4">
          <div>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Período de Análise
            </Text>
            <Select
              value={filters.timeRange}
              onValueChange={(value) => handleFilterChange('timeRange', value)}
            >
              <SelectItem value="daily">Diário</SelectItem>
              <SelectItem value="weekly">Semanal</SelectItem>
              <SelectItem value="monthly">Mensal</SelectItem>
              <SelectItem value="quarterly">Trimestral</SelectItem>
              <SelectItem value="yearly">Anual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </Select>
          </div>

          <div>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Franqueado
            </Text>
            <Select
              value={filters.franchisee}
              onValueChange={(value) => handleFilterChange('franchisee', value)}
            >
              <SelectItem value="all">Todos os Franqueados</SelectItem>
              <SelectItem value="alpha">Franqueado Alpha</SelectItem>
              <SelectItem value="beta">Franqueado Beta</SelectItem>
              <SelectItem value="gamma">Franqueado Gamma</SelectItem>
            </Select>
          </div>

          <div>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Serviço
            </Text>
            <Select
              value={filters.serviceType}
              onValueChange={(value) => handleFilterChange('serviceType', value)}
            >
              <SelectItem value="all">Todos os Serviços</SelectItem>
              <SelectItem value="accounting">Contabilidade</SelectItem>
              <SelectItem value="payroll">Folha de Pagamento</SelectItem>
              <SelectItem value="tax">Tributária</SelectItem>
              <SelectItem value="audit">Auditoria</SelectItem>
              <SelectItem value="compliance">Conformidade</SelectItem>
            </Select>
          </div>

          <div>
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo de Cobrança
            </Text>
            <Select
              value={filters.billingType}
              onValueChange={(value) => handleFilterChange('billingType', value)}
            >
              <SelectItem value="all">Todas as Formas</SelectItem>
              <SelectItem value="hourly">Por Hora</SelectItem>
              <SelectItem value="fixed">Valor Fixo</SelectItem>
              <SelectItem value="performance">Por Performance</SelectItem>
              <SelectItem value="mixed">Mista</SelectItem>
            </Select>
          </div>
        </Grid>

        <div className="flex items-center space-x-4 mt-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="projections"
              checked={filters.includeProjections}
              onChange={(e) => handleFilterChange('includeProjections', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="projections" className="text-sm text-gray-700 dark:text-gray-300">
              Incluir Projeções
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="benchmarks"
              checked={filters.includeBenchmarks}
              onChange={(e) => handleFilterChange('includeBenchmarks', e.target.checked)}
              className="rounded border-gray-300"
            />
            <label htmlFor="benchmarks" className="text-sm text-gray-700 dark:text-gray-300">
              Incluir Benchmarks
            </label>
          </div>
        </div>
      </Card>

      {/* Key Financial Metrics */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-4">
        {getFilteredMetrics().map((metric, index) => {
          const variation = calculateVariation(metric.value, metric.previousValue);
          const achievement = calculateAchievement(metric.value, metric.target);
          const isPositive = parseFloat(variation) > 0;
          
          return (
            <Card key={index} className="dark:bg-gray-800">
              <div className="flex items-center justify-between mb-3">
                <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {metric.name}
                </Text>
                <Badge size="sm" className={getCategoryColor(metric.category)}>
                  {metric.category === 'revenue' ? 'Receita' :
                   metric.category === 'cost' ? 'Custo' :
                   metric.category === 'profitability' ? 'Lucro' :
                   metric.category === 'efficiency' ? 'Eficiência' : 'Crescimento'}
                </Badge>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Metric className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metric.unit === 'R$' ? 'R$ ' : ''}
                    {metric.value.toLocaleString('pt-BR')}
                    {metric.unit !== 'R$' && metric.unit !== 'clientes' ? ` ${metric.unit}` : ''}
                  </Metric>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <div className={`flex items-center space-x-1 text-xs ${
                      isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      <span>{isPositive ? '+' : ''}{variation}%</span>
                    </div>
                    <Text className="text-xs text-gray-500">vs. período anterior</Text>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Meta: {metric.target.toLocaleString('pt-BR')}</span>
                    <span>{achievement.toFixed(1)}%</span>
                  </div>
                  <ProgressBar value={achievement} color={achievement >= 100 ? 'green' : achievement >= 80 ? 'yellow' : 'red'} />
                </div>
              </div>
            </Card>
          );
        })}
      </Grid>

      {/* Service Performance Analysis */}
      <Card className="dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-lg font-semibold text-gray-900 dark:text-white">
            Análise por Serviço BPO
          </Title>
          <Badge color="purple" size="sm">Especializado</Badge>
        </div>
        
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Serviço</TableHeaderCell>
              <TableHeaderCell>Tipo</TableHeaderCell>
              <TableHeaderCell>Receita</TableHeaderCell>
              <TableHeaderCell>Custo</TableHeaderCell>
              <TableHeaderCell>Margem</TableHeaderCell>
              <TableHeaderCell>Clientes</TableHeaderCell>
              <TableHeaderCell>Horas</TableHeaderCell>
              <TableHeaderCell>Eficiência</TableHeaderCell>
              <TableHeaderCell>Ações</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {getFilteredServices().map((service) => (
              <TableRow key={service.id}>
                <TableCell className="font-medium">{service.name}</TableCell>
                <TableCell>
                  <Badge size="sm" color={
                    service.type === 'accounting' ? 'blue' :
                    service.type === 'payroll' ? 'green' :
                    service.type === 'tax' ? 'purple' :
                    service.type === 'audit' ? 'orange' : 'red'
                  }>
                    {service.type === 'accounting' ? 'Contábil' :
                     service.type === 'payroll' ? 'Folha' :
                     service.type === 'tax' ? 'Tributária' :
                     service.type === 'audit' ? 'Auditoria' : 'Conformidade'}
                  </Badge>
                </TableCell>
                <TableCell>R$ {service.revenue.toLocaleString('pt-BR')}</TableCell>
                <TableCell>R$ {service.cost.toLocaleString('pt-BR')}</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span>{service.margin}%</span>
                    <ProgressBar value={service.margin} color={service.margin >= 35 ? 'green' : service.margin >= 25 ? 'yellow' : 'red'} className="w-16" />
                  </div>
                </TableCell>
                <TableCell>{service.clients}</TableCell>
                <TableCell>{service.hours}h</TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span>{service.efficiency}%</span>
                    <ProgressBar value={service.efficiency} color={service.efficiency >= 85 ? 'green' : service.efficiency >= 70 ? 'yellow' : 'red'} className="w-16" />
                  </div>
                </TableCell>
                <TableCell>
                  <Button size="xs" variant="secondary">
                    <Eye className="w-3 h-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Charts Section */}
      <Grid numItems={1} numItemsLg={2} className="gap-6">
        {/* Revenue Trend */}
        <Card className="dark:bg-gray-800">
          <Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Tendência de Receita
          </Title>
          <AreaChart
            className="h-64"
            data={getFilteredData()}
            index="date"
            categories={['revenue', 'cost', 'profit']}
            colors={['blue', 'red', 'green']}
            valueFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
            showLegend={true}
            showGridLines={true}
            showAnimation={true}
          />
          <div className="flex items-center justify-between mt-4">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Período: {filters.timeRange === 'daily' ? '7 dias' : filters.timeRange === 'weekly' ? '4 semanas' : '30 dias'}
            </Text>
            <Badge color="blue" size="sm">BPO Financeiro</Badge>
          </div>
        </Card>

        {/* Client Distribution */}
        <Card className="dark:bg-gray-800">
          <Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Distribuição por Tipo de Serviço
          </Title>
          <DonutChart
            className="h-64"
            data={bpoServices.map(service => ({
              name: service.type === 'accounting' ? 'Contábil' :
                    service.type === 'payroll' ? 'Folha' :
                    service.type === 'tax' ? 'Tributária' :
                    service.type === 'audit' ? 'Auditoria' : 'Conformidade',
              value: service.revenue
            }))}
            category="value"
            index="name"
            colors={['blue', 'green', 'purple', 'orange', 'red']}
            valueFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
            showLabel={true}
            showAnimation={true}
          />
          <div className="flex items-center justify-center mt-4">
            <Badge color="purple" size="sm">Mix de Serviços</Badge>
          </div>
        </Card>
      </Grid>

      {/* Advanced Insights */}
      <Card className="dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-lg font-semibold text-gray-900 dark:text-white">
            Insights Avançados - Especialista BPO
          </Title>
          <Badge color="green" size="sm">IA Análise</Badge>
        </div>
        
        <Grid numItems={1} numItemsLg={3} className="gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Target className="w-6 h-6 text-blue-600" />
              <Text className="font-semibold text-blue-900 dark:text-blue-100">Otimização de Margens</Text>
            </div>
            <Text className="text-sm text-blue-800 dark:text-blue-200">
              Serviços de auditoria apresentam margem de 40%, acima da média do setor. 
              Recomenda-se expandir esta linha de serviço em 25%.
            </Text>
            <div className="mt-3">
              <Badge color="blue" size="sm">Alta Rentabilidade</Badge>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <Activity className="w-6 h-6 text-yellow-600" />
              <Text className="font-semibold text-yellow-900 dark:text-yellow-100">Eficiência Operacional</Text>
            </div>
            <Text className="text-sm text-yellow-800 dark:text-yellow-200">
              Serviços tributários com eficiência de 78% precisam de atenção. 
              Sugere-se automação de processos repetitivos.
            </Text>
            <div className="mt-3">
              <Badge color="yellow" size="sm">Atenção Requerida</Badge>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg">
            <div className="flex items-center space-x-3 mb-3">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <Text className="font-semibold text-green-900 dark:text-green-100">Crescimento Sustentável</Text>
            </div>
            <Text className="text-sm text-green-800 dark:text-green-200">
              Crescimento de 5% na base de clientes com manutenção das margens. 
              Indicador positivo para expansão controlada.
            </Text>
            <div className="mt-3">
              <Badge color="green" size="sm">Excelente</Badge>
            </div>
          </div>
        </Grid>
      </Card>
    </motion.div>
  );
}