import React, { useState, useEffect } from 'react';
import { Card, Title, Text, Badge, Grid, Col, BarChart, LineChart, DonutChart, AreaChart, Metric, ProgressBar, Button } from '@tremor/react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  Zap, 
  Database, 
  Shield, 
  Server, 
  Wifi, 
  HardDrive,
  ActivitySquare,
  BarChart3,
  Network,
  Gauge,
  AlertCircle,
  RefreshCw,
  Settings,
  Eye
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import { CompanyFilter } from './CompanyFilter';

interface NOCMetric {
  name: string;
  value: number;
  status: 'critical' | 'warning' | 'good' | 'excellent';
  trend: 'up' | 'down' | 'stable';
  change: number;
  threshold: number;
  unit: string;
}

interface SystemHealth {
  component: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  responseTime: number;
  lastCheck: string;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  component: string;
  timestamp: string;
  acknowledged: boolean;
}

const generateTimeSeriesData = (days: number, baseValue: number, variance: number) => {
  const data = [];
  const now = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    const value = baseValue + (Math.random() - 0.5) * variance;
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0, value),
      timestamp: date.getTime()
    });
  }
  
  return data;
};

export default function NOCDashboard() {
  const { selectedCompany, viewMode } = useCompanyFilter();
  const [metrics, setMetrics] = useState<NOCMetric[]>([
    {
      name: 'Tempo de Resposta Médio',
      value: 245,
      status: 'good',
      trend: 'down',
      change: -12,
      threshold: 500,
      unit: 'ms'
    },
    {
      name: 'Taxa de Disponibilidade',
      value: 99.8,
      status: 'excellent',
      trend: 'stable',
      change: 0.1,
      threshold: 99.5,
      unit: '%'
    },
    {
      name: 'Taxa de Erro',
      value: 0.3,
      status: 'excellent',
      trend: 'down',
      change: -0.2,
      threshold: 1.0,
      unit: '%'
    },
    {
      name: 'CPU Utilização',
      value: 68,
      status: 'warning',
      trend: 'up',
      change: 5,
      threshold: 80,
      unit: '%'
    },
    {
      name: 'Memória Utilizada',
      value: 82,
      status: 'critical',
      trend: 'up',
      change: 8,
      threshold: 85,
      unit: '%'
    },
    {
      name: 'Taxa de Throughput',
      value: 1250,
      status: 'good',
      trend: 'up',
      change: 15,
      threshold: 1000,
      unit: 'req/s'
    }
  ]);

  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([
    {
      component: 'API Gateway',
      status: 'operational',
      uptime: 99.9,
      responseTime: 45,
      lastCheck: '2024-01-15 14:30:25'
    },
    {
      component: 'Banco de Dados Principal',
      status: 'operational',
      uptime: 99.8,
      responseTime: 120,
      lastCheck: '2024-01-15 14:30:20'
    },
    {
      component: 'Servidor de Autenticação',
      status: 'degraded',
      uptime: 98.5,
      responseTime: 890,
      lastCheck: '2024-01-15 14:30:15'
    },
    {
      component: 'Serviço de IA',
      status: 'operational',
      uptime: 99.7,
      responseTime: 340,
      lastCheck: '2024-01-15 14:30:30'
    },
    {
      component: 'Cache Redis',
      status: 'operational',
      uptime: 99.9,
      responseTime: 15,
      lastCheck: '2024-01-15 14:30:18'
    },
    {
      component: 'Servidor de Arquivos',
      status: 'down',
      uptime: 95.2,
      responseTime: 0,
      lastCheck: '2024-01-15 14:25:10'
    }
  ]);

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'critical',
      message: 'Servidor de arquivos fora do ar - Backup não está respondendo',
      component: 'Servidor de Arquivos',
      timestamp: '2024-01-15 14:25:10',
      acknowledged: false
    },
    {
      id: '2',
      type: 'warning',
      message: 'Alta utilização de memória detectada - 82%',
      component: 'Banco de Dados Principal',
      timestamp: '2024-01-15 14:20:05',
      acknowledged: false
    },
    {
      id: '3',
      type: 'warning',
      message: 'Tempo de resposta elevado no serviço de autenticação',
      component: 'Servidor de Autenticação',
      timestamp: '2024-01-15 14:15:30',
      acknowledged: true
    },
    {
      id: '4',
      type: 'info',
      message: 'Atualização de segurança aplicada com sucesso',
      component: 'API Gateway',
      timestamp: '2024-01-15 13:45:00',
      acknowledged: true
    }
  ]);

  const [responseTimeData, setResponseTimeData] = useState(generateTimeSeriesData(24, 250, 100));
  const [throughputData, setThroughputData] = useState(generateTimeSeriesData(24, 1200, 300));
  const [errorRateData, setErrorRateData] = useState(generateTimeSeriesData(24, 0.5, 0.3));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'good': return 'text-green-600 bg-green-100';
      case 'excellent': return 'text-blue-600 bg-blue-100';
      case 'operational': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable': return <ActivitySquare className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const refreshData = () => {
    // Simulate data refresh
    setResponseTimeData(generateTimeSeriesData(24, 250, 100));
    setThroughputData(generateTimeSeriesData(24, 1200, 300));
    setErrorRateData(generateTimeSeriesData(24, 0.5, 0.3));
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
          <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg">
            <Network className="h-6 w-6 text-white" />
          </div>
          <div>
            <Title className="text-2xl font-bold text-gray-900 dark:text-white">
              Centro de Operações de Rede (NOC)
            </Title>
            <Text className="text-gray-600 dark:text-gray-400">
              Monitoramento em tempo real de todos os sistemas
            </Text>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge color="green" size="sm" className="animate-pulse">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1"></div>
            Sistema Operacional
          </Badge>
          <Button
            icon={RefreshCw}
            variant="secondary"
            size="sm"
            onClick={refreshData}
          >
            Atualizar
          </Button>
        </div>
      </div>

      {/* Company Filter */}
      <CompanyFilter />

      {/* Critical Alerts */}
      {alerts.filter(alert => !alert.acknowledged && (alert.type === 'critical' || alert.type === 'warning')).length > 0 && (
        <div className="space-y-3">
          <Title className="text-lg font-semibold text-red-600">Alertas Críticos</Title>
          {alerts.filter(alert => !alert.acknowledged && (alert.type === 'critical' || alert.type === 'warning')).map(alert => (
            <Card key={alert.id} className="border-l-4 border-red-500 bg-red-50 dark:bg-red-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <div>
                    <Text className="font-medium text-red-900 dark:text-red-100">{alert.message}</Text>
                    <Text className="text-sm text-red-600 dark:text-red-300">
                      {alert.component} • {alert.timestamp}
                    </Text>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => acknowledgeAlert(alert.id)}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Reconhecer
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Key Metrics Grid */}
      <Grid numItems={1} numItemsSm={2} numItemsLg={3} className="gap-4">
        {metrics.map((metric, index) => (
          <Card key={index} className="dark:bg-gray-800">
            <div className="flex items-center justify-between mb-3">
              <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {metric.name}
              </Text>
              <div className="flex items-center space-x-1">
                {getTrendIcon(metric.trend)}
                <Text className={`text-xs font-medium ${
                  metric.trend === 'up' ? 'text-green-600' : 
                  metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {metric.change > 0 ? '+' : ''}{metric.change}%
                </Text>
              </div>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <Metric className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}{metric.unit}
                </Metric>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 ${
                  getStatusColor(metric.status)
                }`}>
                  {metric.status === 'excellent' ? 'Excelente' :
                   metric.status === 'good' ? 'Bom' :
                   metric.status === 'warning' ? 'Atenção' : 'Crítico'}
                </div>
              </div>
              
              <div className="w-16">
                <ProgressBar 
                  value={Math.min(100, (metric.value / metric.threshold) * 100)} 
                  color={metric.status === 'critical' ? 'red' : 
                         metric.status === 'warning' ? 'yellow' : 
                         metric.status === 'good' ? 'green' : 'blue'}
                />
              </div>
            </div>
          </Card>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid numItems={1} numItemsLg={3} className="gap-6">
        {/* Response Time Chart */}
        <Card className="dark:bg-gray-800">
          <Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Tempo de Resposta (24h)
          </Title>
          <AreaChart
            className="h-48"
            data={responseTimeData}
            index="date"
            categories={['value']}
            colors={['blue']}
            valueFormatter={(value) => `${Math.round(value)}ms`}
            showLegend={false}
            showGridLines={false}
            showAnimation={true}
          />
          <div className="flex items-center justify-between mt-4">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Média: 245ms
            </Text>
            <Badge color="green" size="sm">Estável</Badge>
          </div>
        </Card>

        {/* Throughput Chart */}
        <Card className="dark:bg-gray-800">
          <Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Throughput (24h)
          </Title>
          <LineChart
            className="h-48"
            data={throughputData}
            index="date"
            categories={['value']}
            colors={['green']}
            valueFormatter={(value) => `${Math.round(value)} req/s`}
            showLegend={false}
            showGridLines={false}
            showAnimation={true}
          />
          <div className="flex items-center justify-between mt-4">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Pico: 1,450 req/s
            </Text>
            <Badge color="green" size="sm">Ótimo</Badge>
          </div>
        </Card>

        {/* Error Rate Chart */}
        <Card className="dark:bg-gray-800">
          <Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Taxa de Erro (24h)
          </Title>
          <BarChart
            className="h-48"
            data={errorRateData}
            index="date"
            categories={['value']}
            colors={['red']}
            valueFormatter={(value) => `${(value).toFixed(2)}%`}
            showLegend={false}
            showGridLines={false}
            showAnimation={true}
          />
          <div className="flex items-center justify-between mt-4">
            <Text className="text-sm text-gray-600 dark:text-gray-400">
              Média: 0.3%
            </Text>
            <Badge color="green" size="sm">Excelente</Badge>
          </div>
        </Card>
      </Grid>

      {/* System Health Matrix */}
      <Card className="dark:bg-gray-800">
        <Title className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          Saúde dos Sistemas
        </Title>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemHealth.map((system, index) => (
            <div key={index} className="p-4 border rounded-lg dark:border-gray-600">
              <div className="flex items-center justify-between mb-2">
                <Text className="font-medium text-gray-900 dark:text-white">
                  {system.component}
                </Text>
                <div className={`w-3 h-3 rounded-full ${
                  system.status === 'operational' ? 'bg-green-500' :
                  system.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Uptime:</Text>
                  <Text className="font-medium">{system.uptime}%</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Resposta:</Text>
                  <Text className="font-medium">{system.responseTime}ms</Text>
                </div>
                <div className="flex justify-between">
                  <Text className="text-gray-600 dark:text-gray-400">Status:</Text>
                  <Badge size="sm" color={
                    system.status === 'operational' ? 'green' :
                    system.status === 'degraded' ? 'yellow' : 'red'
                  }>
                    {system.status === 'operational' ? 'Operacional' :
                     system.status === 'degraded' ? 'Degradado' : 'Fora do Ar'}
                  </Badge>
                </div>
              </div>
              
              <Text className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Última verificação: {system.lastCheck}
              </Text>
            </div>
          ))}
        </div>
      </Card>

      {/* Recent Alerts */}
      <Card className="dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <Title className="text-lg font-semibold text-gray-900 dark:text-white">
            Alertas Recentes
          </Title>
          <Badge color="blue" size="sm">{alerts.length} total</Badge>
        </div>
        
        <div className="space-y-3">
          {alerts.slice(0, 5).map(alert => (
            <div key={alert.id} className={`p-3 rounded-lg border-l-4 ${
              alert.type === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900' :
              alert.type === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900' :
              'border-blue-500 bg-blue-50 dark:bg-blue-900'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {alert.type === 'critical' ? <AlertCircle className="w-4 h-4 text-red-600" /> :
                   alert.type === 'warning' ? <AlertTriangle className="w-4 h-4 text-yellow-600" /> :
                   <CheckCircle className="w-4 h-4 text-blue-600" />}
                  <Text className="font-medium text-gray-900 dark:text-white">
                    {alert.message}
                  </Text>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge size="sm" color={alert.acknowledged ? 'green' : 'gray'}>
                    {alert.acknowledged ? 'Reconhecido' : 'Pendente'}
                  </Badge>
                  {!alert.acknowledged && (
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <Eye className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              <Text className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {alert.component} • {alert.timestamp}
              </Text>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}