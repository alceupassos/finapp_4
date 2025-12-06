// src/components/charts/FaturamentoLineChart.tsx

/**
 * FaturamentoLineChart - Gráfico de Evolução do Faturamento
 * 
 * Conectado ao Supabase via useFinancialChartData
 * - Sincronização automática com F360
 * - LineChart com área preenchida (gradient azul)
 * - Filtrar apenas natureza === 'receita'
 * - Agrupar por mês
 * - Cards de resumo: Receita Total, Receita Média Mensal, Crescimento %
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
} from 'recharts';
import { useFinancialChartData } from '@/hooks/useFinancialChartData';

// ============================================================
// TYPES
// ============================================================

interface FaturamentoLineChartProps {
  companyCnpj?: string;
  companyId?: string;
  dataInicio?: string;
  dataFim?: string;
  autoSync?: boolean;
  height?: number;
  className?: string;
}

interface MonthData {
  month: string;
  shortMonth: string;
  receita: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FULL_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const COLORS = {
  positive: '#10b981', // emerald-500
  negative: '#ef4444', // red-500
  average: '#f59e0b', // amber-500
  grid: '#374151',
  text: '#9ca3af',
  background: '#1a1a2e',
  blue: '#3b82f6',
  purple: '#a855f7',
  orange: '#f97316'
};

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (value: number): string => {
  if (value === 0) return 'R$ 0';
  
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(2).replace('.', ',')}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toFixed(0)}K`;
  }
  
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatYAxis = (value: number): string => {
  if (value === 0) return '0';
  
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}K`;
  }
  
  return `${sign}${abs}`;
};

// ============================================================
// CUSTOM TOOLTIP
// ============================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: MonthData }>;
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const value = data.receita;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2 font-medium">{data.month}</p>
      <div className="space-y-1">
        <p className={`text-sm font-bold ${value >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
          Receita: {formatCurrency(value)}
        </p>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const FaturamentoLineChart: React.FC<FaturamentoLineChartProps> = ({
  companyCnpj,
  companyId,
  dataInicio = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  dataFim = new Date().toISOString().split('T')[0],
  autoSync = true,
  height = 350,
  className = ''
}) => {
  // Fetch data from Supabase
  const { data, loading, error, syncing, syncProgress, syncMessage, syncFromF360 } = useFinancialChartData({
    companyCnpj,
    companyId,
    dataInicio,
    dataFim,
    tipo: 'dre',
    autoSync
  });

  // Process data by month - filter only receitas
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const monthlyData: Record<string, number> = {};

    // Aggregate data by month - only receitas
    data.forEach((entry: any) => {
      if (entry.natureza !== 'receita') return;
      
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = 0;
      }

      const valor = parseFloat(entry.valor || 0);
      monthlyData[monthKey] += valor;
    });

    // Convert to array
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, receita]) => {
        const [year, month] = key.split('-');
        const monthIdx = parseInt(month) - 1;

        return {
          month: `${FULL_MONTHS[monthIdx]}/${year}`,
          shortMonth: MONTHS[monthIdx],
          receita
        };
      });
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalReceita: 0, receitaMedia: 0, crescimento: 0 };
    }

    const totalReceita = chartData.reduce((sum, item) => sum + item.receita, 0);
    const receitaMedia = totalReceita / chartData.length;
    
    // Calcular crescimento (último mês vs primeiro mês)
    const primeiroMes = chartData[0]?.receita || 0;
    const ultimoMes = chartData[chartData.length - 1]?.receita || 0;
    const crescimento = primeiroMes > 0 
      ? ((ultimoMes - primeiroMes) / primeiroMes) * 100 
      : 0;

    return { totalReceita, receitaMedia, crescimento };
  }, [chartData]);

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading || syncing) {
    return (
      <div className={`bg-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
        <div className="flex flex-col items-center justify-center h-96 p-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500"></div>
            {syncing && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-emerald-400">{syncProgress}%</span>
              </div>
            )}
          </div>
          <p className="mt-4 text-gray-300 font-medium">
            {syncing ? syncMessage : 'Carregando dados...'}
          </p>
          {syncing && (
            <div className="w-64 h-2 bg-gray-700 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // ERROR STATE
  // ============================================================
  if (error) {
    return (
      <div className={`bg-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
        <div className="p-6">
          <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">❌</span>
              <div className="flex-1">
                <p className="text-red-400 font-semibold text-lg">Erro ao carregar dados</p>
                <p className="text-red-300 text-sm mt-2">{error}</p>
              </div>
            </div>
            <button 
              onClick={() => syncFromF360()}
              className="mt-4 w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
            >
              <span>🔄</span>
              Tentar Sincronizar Novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // EMPTY STATE
  // ============================================================
  if (!data || data.length === 0 || chartData.length === 0) {
    return (
      <div className={`bg-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
        <div className="p-6">
          <div className="bg-yellow-900/20 border-2 border-yellow-500/50 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚠️</span>
              <div className="flex-1">
                <p className="text-yellow-400 font-semibold text-lg">Nenhum dado encontrado</p>
                <p className="text-yellow-300 text-sm mt-2">
                  Período: {new Date(dataInicio).toLocaleDateString('pt-BR')} até {new Date(dataFim).toLocaleDateString('pt-BR')}
                </p>
                {companyCnpj && (
                  <p className="text-yellow-300 text-sm">CNPJ: {companyCnpj}</p>
                )}
              </div>
            </div>
            <button 
              onClick={() => syncFromF360()}
              className="mt-4 w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
            >
              <span>📥</span>
              Importar do F360
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // SUCCESS STATE - RENDER CHART
  // ============================================================
  return (
    <div className={`bg-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold text-base tracking-wide flex items-center gap-2">
            📈 Evolução do Faturamento
          </h3>
          <p className="text-xs text-gray-400 mt-1">Receitas mensais com área preenchida</p>
        </div>
        <button 
          onClick={() => syncFromF360()}
          disabled={syncing}
          className="px-4 py-2 text-sm text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/20 rounded-lg transition flex items-center gap-2 disabled:opacity-50"
        >
          <span className={syncing ? 'animate-spin' : ''}>🔄</span>
          Atualizar
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Receita Total</p>
          <p className="text-2xl font-bold text-blue-300 mt-2">
            {formatCurrency(stats.totalReceita)}
          </p>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">Receita Média Mensal</p>
          <p className="text-2xl font-bold text-emerald-300 mt-2">
            {formatCurrency(stats.receitaMedia)}
          </p>
        </div>
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wide">Crescimento</p>
          <p className={`text-2xl font-bold mt-2 ${stats.crescimento >= 0 ? 'text-purple-300' : 'text-red-400'}`}>
            {stats.crescimento >= 0 ? '+' : ''}{stats.crescimento.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.8}/>
                <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={COLORS.grid} 
              vertical={false}
            />
            
            <XAxis 
              dataKey="shortMonth"
              tick={{ fill: COLORS.text, fontSize: 11 }}
              tickLine={{ stroke: COLORS.grid }}
              axisLine={{ stroke: COLORS.grid }}
            />
            
            <YAxis 
              tick={{ fill: COLORS.text, fontSize: 10 }}
              tickLine={{ stroke: COLORS.grid }}
              axisLine={{ stroke: COLORS.grid }}
              tickFormatter={formatYAxis}
              width={70}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Area
              type="monotone"
              dataKey="receita"
              stroke={COLORS.blue}
              strokeWidth={2}
              fill="url(#colorReceita)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
        <span>
          📊 {chartData.length} períodos • {data.filter((e: any) => e.natureza === 'receita').length} lançamentos
        </span>
        <span>
          Última atualização: {new Date(data[0]?.updated_at || data[0]?.created_at).toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
};

export default FaturamentoLineChart;
