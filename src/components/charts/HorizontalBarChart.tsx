// src/components/charts/HorizontalBarChart.tsx

/**
 * HorizontalBarChart - Top 10 Contas Contábeis
 * 
 * Conectado ao Supabase via useFinancialChartData
 * - Sincronização automática com F360
 * - BarChart horizontal (top 10 contas)
 * - Agrupar por account (conta contábil)
 * - Ordenar: top 10 por valor absoluto
 * - Cores: verde (receita), vermelho (despesa)
 * - Cards: Total de Contas, Maior Conta, Concentração Top 3 (%)
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
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

interface HorizontalBarChartProps {
  companyCnpj?: string;
  companyId?: string;
  dataInicio?: string;
  dataFim?: string;
  autoSync?: boolean;
  height?: number;
  className?: string;
}

interface ContaData {
  conta: string;
  valor: number;
  natureza: 'receita' | 'despesa' | 'custo';
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
  payload?: Array<{ value: number; dataKey: string; payload: ContaData }>;
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const value = data.valor;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2 font-medium">{data.conta}</p>
      <div className="space-y-1">
        <p className={`text-sm font-bold ${data.natureza === 'receita' ? 'text-emerald-400' : 'text-red-400'}`}>
          {data.natureza === 'receita' ? 'Receita' : data.natureza === 'despesa' ? 'Despesa' : 'Custo'}: {formatCurrency(value)}
        </p>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({
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

  // Process data by conta contábil
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const contaData: Record<string, { valor: number; natureza: string }> = {};

    // Aggregate data by conta
    data.forEach((entry: any) => {
      if (!entry.account || entry.account.trim() === '') return;
      
      const conta = entry.account.trim();
      const valor = Math.abs(parseFloat(entry.valor || 0));
      const natureza = entry.natureza || 'despesa';
      
      if (!contaData[conta]) {
        contaData[conta] = { valor: 0, natureza };
      }
      
      contaData[conta].valor += valor;
    });

    // Convert to array, sort by absolute value, take top 10
    return Object.entries(contaData)
      .map(([conta, data]) => ({
        conta: conta.length > 40 ? `${conta.substring(0, 40)}...` : conta,
        valor: data.valor,
        natureza: data.natureza as 'receita' | 'despesa' | 'custo'
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { totalContas: 0, maiorConta: '', maiorValor: 0, concentracaoTop3: 0 };
    }

    // Contar contas únicas (incluindo as que não estão no top 10)
    const allContas = new Set<string>();
    data.forEach((entry: any) => {
      if (entry.account && entry.account.trim() !== '') {
        allContas.add(entry.account.trim());
      }
    });

    const totalContas = allContas.size;
    const maiorConta = chartData[0]?.conta || '';
    const maiorValor = chartData[0]?.valor || 0;
    
    // Calcular concentração top 3
    const totalGeral = data.reduce((sum: number, entry: any) => {
      return sum + Math.abs(parseFloat(entry.valor || 0));
    }, 0);
    
    const top3Total = chartData.slice(0, 3).reduce((sum, item) => sum + item.valor, 0);
    const concentracaoTop3 = totalGeral > 0 ? (top3Total / totalGeral) * 100 : 0;

    return { totalContas, maiorConta, maiorValor, concentracaoTop3 };
  }, [chartData, data]);

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
            📋 Top 10 Contas Contábeis
          </h3>
          <p className="text-xs text-gray-400 mt-1">Ranking das maiores contas por valor absoluto</p>
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
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Total de Contas</p>
          <p className="text-2xl font-bold text-blue-300 mt-2">
            {stats.totalContas}
          </p>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">Maior Conta</p>
          <p className="text-lg font-bold text-emerald-300 mt-2 truncate" title={stats.maiorConta}>
            {stats.maiorConta || 'N/A'}
          </p>
          <p className="text-xs text-emerald-400 mt-1">
            {formatCurrency(stats.maiorValor)}
          </p>
        </div>
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wide">Concentração Top 3</p>
          <p className="text-2xl font-bold text-purple-300 mt-2">
            {stats.concentracaoTop3.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={Math.max(height, chartData.length * 40)}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={COLORS.grid} 
              horizontal={true}
              vertical={false}
            />
            
            <XAxis 
              type="number"
              tick={{ fill: COLORS.text, fontSize: 10 }}
              tickLine={{ stroke: COLORS.grid }}
              axisLine={{ stroke: COLORS.grid }}
              tickFormatter={formatYAxis}
            />
            
            <YAxis 
              type="category"
              dataKey="conta"
              tick={{ fill: COLORS.text, fontSize: 11 }}
              tickLine={{ stroke: COLORS.grid }}
              axisLine={{ stroke: COLORS.grid }}
              width={140}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.natureza === 'receita' ? COLORS.positive : COLORS.negative} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
        <span>
          📊 Top {chartData.length} contas • {data.length} lançamentos
        </span>
        <span>
          Última atualização: {new Date(data[0]?.updated_at || data[0]?.created_at).toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
};

export default HorizontalBarChart;
