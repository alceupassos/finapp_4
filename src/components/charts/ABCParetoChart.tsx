// src/components/charts/ABCParetoChart.tsx

/**
 * ABCParetoChart - Curva ABC de Clientes (Pareto)
 * 
 * Conectado ao Supabase via useFinancialChartData
 * - Sincronização automática com F360
 * - ComposedChart (barras + linha acumulada)
 * - Filtrar natureza === 'receita'
 * - Agrupar por description
 * - Calcular % acumulado (curva de Pareto)
 * - Classificar: A (0-80%), B (80-95%), C (95-100%)
 * - Cards: Clientes Classe A, Clientes Classe B, Clientes Classe C
 */

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useFinancialChartData } from '@/hooks/useFinancialChartData';

// ============================================================
// TYPES
// ============================================================

interface ABCParetoChartProps {
  companyCnpj?: string;
  companyId?: string;
  dataInicio?: string;
  dataFim?: string;
  autoSync?: boolean;
  height?: number;
  className?: string;
}

interface ClienteData {
  cliente: string;
  valor: number;
  percentual: number;
  percentualAcumulado: number;
  classe: 'A' | 'B' | 'C';
}

// ============================================================
// CONSTANTS
// ============================================================

const COLORS = {
  positive: '#10b981', // emerald-500
  negative: '#ef4444', // red-500
  average: '#f59e0b', // amber-500
  grid: '#374151',
  text: '#9ca3af',
  background: '#1a1a2e',
  blue: '#3b82f6',
  purple: '#a855f7',
  orange: '#f97316',
  classeA: '#8b5cf6', // purple
  classeB: '#3b82f6', // blue
  classeC: '#6b7280'  // gray
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

const getClassColor = (classe: 'A' | 'B' | 'C'): string => {
  switch (classe) {
    case 'A': return COLORS.classeA;
    case 'B': return COLORS.classeB;
    case 'C': return COLORS.classeC;
    default: return COLORS.classeC;
  }
};

// ============================================================
// CUSTOM TOOLTIP
// ============================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: ClienteData }>;
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2 font-medium">{data.cliente}</p>
      <div className="space-y-1">
        <p className="text-xs text-emerald-400">
          Valor: <span className="font-bold">{formatCurrency(data.valor)}</span>
        </p>
        <p className="text-xs text-blue-400">
          % Individual: <span className="font-bold">{data.percentual.toFixed(2)}%</span>
        </p>
        <p className="text-xs text-purple-400">
          % Acumulado: <span className="font-bold">{data.percentualAcumulado.toFixed(2)}%</span>
        </p>
        <div className="border-t border-gray-700 my-1 pt-1">
          <p className="text-sm font-bold" style={{ color: getClassColor(data.classe) }}>
            Classe: {data.classe}
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const ABCParetoChart: React.FC<ABCParetoChartProps> = ({
  companyCnpj,
  companyId,
  dataInicio = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  dataFim = new Date().toISOString().split('T')[0],
  autoSync = true,
  height = 400,
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

  // Process data by cliente - filter only receitas, calculate Pareto
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const clienteData: Record<string, number> = {};

    // Aggregate data by cliente - only receitas
    data.forEach((entry: any) => {
      if (entry.natureza !== 'receita') return;
      if (!entry.description || entry.description.trim() === '') return;
      
      const cliente = entry.description.trim();
      const valor = parseFloat(entry.valor || 0);
      
      if (!clienteData[cliente]) {
        clienteData[cliente] = 0;
      }
      
      clienteData[cliente] += valor;
    });

    // Convert to array and sort by value (descending)
    const sorted = Object.entries(clienteData)
      .map(([cliente, valor]) => ({
        cliente: cliente.length > 30 ? `${cliente.substring(0, 30)}...` : cliente,
        valor
      }))
      .sort((a, b) => b.valor - a.valor);

    // Calculate total
    const total = sorted.reduce((sum, item) => sum + item.valor, 0);
    if (total === 0) return [];

    // Calculate percentages and accumulated
    let acumulado = 0;
    const withPercent = sorted.map(item => {
      acumulado += item.valor;
      const percentual = (item.valor / total) * 100;
      const percentualAcumulado = (acumulado / total) * 100;
      
      // Classify: A (0-80%), B (80-95%), C (95-100%)
      let classe: 'A' | 'B' | 'C' = 'C';
      if (percentualAcumulado <= 80) {
        classe = 'A';
      } else if (percentualAcumulado <= 95) {
        classe = 'B';
      }

      return {
        ...item,
        percentual,
        percentualAcumulado,
        classe
      };
    });

    return withPercent;
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { classeA: 0, classeB: 0, classeC: 0 };
    }

    const classeA = chartData.filter(d => d.classe === 'A').length;
    const classeB = chartData.filter(d => d.classe === 'B').length;
    const classeC = chartData.filter(d => d.classe === 'C').length;

    return { classeA, classeB, classeC };
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
            📉 Curva ABC de Clientes (Pareto)
          </h3>
          <p className="text-xs text-gray-400 mt-1">Análise de concentração de receitas por cliente</p>
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
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wide">Clientes Classe A</p>
          <p className="text-2xl font-bold text-purple-300 mt-2">
            {stats.classeA}
          </p>
          <p className="text-xs text-purple-400 mt-1">0-80% do faturamento</p>
        </div>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Clientes Classe B</p>
          <p className="text-2xl font-bold text-blue-300 mt-2">
            {stats.classeB}
          </p>
          <p className="text-xs text-blue-400 mt-1">80-95% do faturamento</p>
        </div>
        <div className="bg-gray-900/20 border border-gray-500/30 rounded-lg p-4">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Clientes Classe C</p>
          <p className="text-2xl font-bold text-gray-300 mt-2">
            {stats.classeC}
          </p>
          <p className="text-xs text-gray-400 mt-1">95-100% do faturamento</p>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 80 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={COLORS.grid} 
              vertical={false}
            />
            
            <XAxis 
              dataKey="cliente"
              tick={{ fill: COLORS.text, fontSize: 10 }}
              tickLine={{ stroke: COLORS.grid }}
              axisLine={{ stroke: COLORS.grid }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            
            <YAxis 
              yAxisId="left"
              tick={{ fill: COLORS.text, fontSize: 10 }}
              tickLine={{ stroke: COLORS.grid }}
              axisLine={{ stroke: COLORS.grid }}
              tickFormatter={formatYAxis}
              width={70}
            />
            
            <YAxis 
              yAxisId="right"
              orientation="right"
              tick={{ fill: COLORS.text, fontSize: 10 }}
              tickLine={{ stroke: COLORS.grid }}
              axisLine={{ stroke: COLORS.grid }}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              domain={[0, 100]}
              width={50}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar yAxisId="left" dataKey="valor" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getClassColor(entry.classe)} />
              ))}
            </Bar>
            
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey="percentualAcumulado" 
              stroke={COLORS.average} 
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
        <span>
          📊 {chartData.length} clientes • {data.filter((e: any) => e.natureza === 'receita').length} lançamentos
        </span>
        <span>
          Última atualização: {new Date(data[0]?.updated_at || data[0]?.created_at).toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
};

export default ABCParetoChart;
