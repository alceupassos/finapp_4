// src/components/charts/IndicadoresBarChart.tsx

/**
 * IndicadoresBarChart - Indicadores Financeiros
 * 
 * Conectado ao Supabase via useFinancialChartData
 * - Sincronização automática com F360
 * - BarChart com cores condicionais
 * - Calcular indicadores:
 *   - Margem Bruta = (Receita - Custo) / Receita * 100
 *   - Margem Líquida = (Receita - Custo - Despesa) / Receita * 100
 *   - ROI = Lucro Líquido / Despesas * 100
 * - Cores baseadas em thresholds:
 *   - Verde: > 20%
 *   - Amarelo: 10-20%
 *   - Vermelho: < 10%
 * - Cards: Margem Bruta Média, Margem Líquida Média, ROI Médio
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

interface IndicadoresBarChartProps {
  companyCnpj?: string;
  companyId?: string;
  dataInicio?: string;
  dataFim?: string;
  autoSync?: boolean;
  height?: number;
  className?: string;
}

interface IndicadorData {
  mes: string;
  shortMonth: string;
  margemBruta: number;
  margemLiquida: number;
  roi: number;
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

const getColorByValue = (value: number): string => {
  if (value >= 20) return COLORS.positive;
  if (value >= 10) return COLORS.average;
  return COLORS.negative;
};

// ============================================================
// CUSTOM TOOLTIP
// ============================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: IndicadorData }>;
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2 font-medium">{data.mes}</p>
      <div className="space-y-1">
        <p className="text-xs text-emerald-400">
          Margem Bruta: <span className="font-bold">{data.margemBruta.toFixed(1)}%</span>
        </p>
        <p className="text-xs text-blue-400">
          Margem Líquida: <span className="font-bold">{data.margemLiquida.toFixed(1)}%</span>
        </p>
        <p className="text-xs text-purple-400">
          ROI: <span className="font-bold">{data.roi.toFixed(1)}%</span>
        </p>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const IndicadoresBarChart: React.FC<IndicadoresBarChartProps> = ({
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

  // Process data by month - calculate indicators
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const monthlyData: Record<string, { receita: number; despesa: number; custo: number }> = {};

    // Aggregate data by month
    data.forEach((entry: any) => {
      const date = new Date(entry.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { receita: 0, despesa: 0, custo: 0 };
      }

      const valor = parseFloat(entry.valor || 0);
      
      if (entry.natureza === 'receita') {
        monthlyData[monthKey].receita += valor;
      } else if (entry.natureza === 'custo') {
        monthlyData[monthKey].custo += Math.abs(valor);
      } else if (entry.natureza === 'despesa') {
        monthlyData[monthKey].despesa += Math.abs(valor);
      }
    });

    // Convert to array and calculate indicators
    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, values]) => {
        const [year, month] = key.split('-');
        const monthIdx = parseInt(month) - 1;
        
        // Calcular indicadores
        const lucroBruto = values.receita - values.custo;
        const lucroLiquido = lucroBruto - values.despesa;
        
        const margemBruta = values.receita > 0 ? (lucroBruto / values.receita) * 100 : 0;
        const margemLiquida = values.receita > 0 ? (lucroLiquido / values.receita) * 100 : 0;
        const roi = values.despesa > 0 ? (lucroLiquido / values.despesa) * 100 : 0;

        return {
          mes: `${FULL_MONTHS[monthIdx]}/${year}`,
          shortMonth: MONTHS[monthIdx],
          margemBruta,
          margemLiquida,
          roi
        };
      });
  }, [data]);

  // Calculate statistics (médias)
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { margemBrutaMedia: 0, margemLiquidaMedia: 0, roiMedio: 0 };
    }

    const margemBrutaMedia = chartData.reduce((sum, item) => sum + item.margemBruta, 0) / chartData.length;
    const margemLiquidaMedia = chartData.reduce((sum, item) => sum + item.margemLiquida, 0) / chartData.length;
    const roiMedio = chartData.reduce((sum, item) => sum + item.roi, 0) / chartData.length;

    return { margemBrutaMedia, margemLiquidaMedia, roiMedio };
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
            📊 Indicadores Financeiros
          </h3>
          <p className="text-xs text-gray-400 mt-1">Margem Bruta, Margem Líquida e ROI mensais</p>
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
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">Margem Bruta Média</p>
          <p className={`text-2xl font-bold mt-2 ${getColorByValue(stats.margemBrutaMedia)}`}>
            {stats.margemBrutaMedia.toFixed(1)}%
          </p>
        </div>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Margem Líquida Média</p>
          <p className={`text-2xl font-bold mt-2 ${getColorByValue(stats.margemLiquidaMedia)}`}>
            {stats.margemLiquidaMedia.toFixed(1)}%
          </p>
        </div>
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wide">ROI Médio</p>
          <p className={`text-2xl font-bold mt-2 ${getColorByValue(stats.roiMedio)}`}>
            {stats.roiMedio.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
          >
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
              tickFormatter={(value) => `${value.toFixed(0)}%`}
              domain={[0, 'auto']}
              width={50}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            <Bar dataKey="margemBruta" radius={[4, 4, 0, 0]} name="Margem Bruta">
              {chartData.map((entry, index) => (
                <Cell key={`cell-mb-${index}`} fill={getColorByValue(entry.margemBruta)} />
              ))}
            </Bar>
            <Bar dataKey="margemLiquida" radius={[4, 4, 0, 0]} name="Margem Líquida">
              {chartData.map((entry, index) => (
                <Cell key={`cell-ml-${index}`} fill={getColorByValue(entry.margemLiquida)} />
              ))}
            </Bar>
            <Bar dataKey="roi" radius={[4, 4, 0, 0]} name="ROI">
              {chartData.map((entry, index) => (
                <Cell key={`cell-roi-${index}`} fill={getColorByValue(entry.roi)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
        <span>
          📊 {chartData.length} períodos • {data.length} lançamentos
        </span>
        <span>
          Última atualização: {new Date(data[0]?.updated_at || data[0]?.created_at).toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
};

export default IndicadoresBarChart;
