/**
 * LucroBrutoChart - Gráfico de Lucro Bruto por Mês
 * 
 * Componente de gráfico de barras baseado no Data4Company
 * - Barras verdes para valores positivos
 * - Barras vermelhas para valores negativos  
 * - Linha de referência (média)
 * - Tooltip formatado
 */

import React, { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';

// ============================================================
// TYPES
// ============================================================

interface DREEntry {
  data: string;
  conta: string;
  natureza: 'receita' | 'despesa';
  valor: number;
}

interface LucroBrutoChartProps {
  data: DREEntry[];
  year?: string;
  height?: number;
  className?: string;
}

interface MonthData {
  month: string;
  shortMonth: string;
  receita: number;
  despesa: number;
  lucro: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const FULL_MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MONTH_MAP: Record<string, number> = {
  '01': 0, '02': 1, '03': 2, '04': 3, '05': 4, '06': 5,
  '07': 6, '08': 7, '09': 8, '10': 9, '11': 10, '12': 11
};

// Colors
const COLORS = {
  positive: '#10b981', // emerald-500
  negative: '#ef4444', // red-500
  average: '#f59e0b', // amber-500
  grid: '#374151',
  text: '#9ca3af',
  background: '#1a1a2e'
};

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (value: number): string => {
  if (value === 0) return 'R$ 0';
  
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(2).replace('.', ',')} M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toFixed(0)} K`;
  }
  
  return `${sign}R$ ${abs.toLocaleString('pt-BR')}`;
};

const formatYAxis = (value: number): string => {
  if (value === 0) return '0';
  
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toFixed(0)}K`;
  }
  
  return `${sign}R$ ${abs}`;
};

// ============================================================
// CUSTOM TOOLTIP
// ============================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0];
  const value = data.value;
  const monthIndex = MONTHS.indexOf(label || '');
  const fullMonth = monthIndex >= 0 ? FULL_MONTHS[monthIndex] : label;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-gray-400 text-xs mb-1">{fullMonth}/2025</p>
      <p className={`text-sm font-bold ${value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        Lucro Bruto: {formatCurrency(value)}
      </p>
    </div>
  );
};

// ============================================================
// LEGEND
// ============================================================

const CustomLegend: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.positive }} />
        <span className="text-xs text-gray-400">Aumentar</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.negative }} />
        <span className="text-xs text-gray-400">Diminuir</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-6 h-0.5 border-t-2 border-dashed" style={{ borderColor: COLORS.average }} />
        <span className="text-xs text-gray-400">Total</span>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const LucroBrutoChart: React.FC<LucroBrutoChartProps> = ({
  data,
  year = '2025',
  height = 280,
  className = ''
}) => {
  // Process data by month
  const chartData = useMemo(() => {
    const monthlyData: Record<number, { receita: number; despesa: number }> = {};
    
    // Initialize all months
    MONTHS.forEach((_, idx) => {
      monthlyData[idx] = { receita: 0, despesa: 0 };
    });

    // Aggregate data
    data.forEach(entry => {
      const monthKey = entry.data.substring(5, 7);
      const monthIdx = MONTH_MAP[monthKey];
      if (monthIdx === undefined) return;
      
      const value = Math.abs(entry.valor);
      if (entry.natureza === 'receita') {
        monthlyData[monthIdx].receita += value;
      } else {
        monthlyData[monthIdx].despesa += value;
      }
    });

    // Build chart data
    return MONTHS.map((month, idx) => ({
      month: `${month}/${year.slice(2)}`,
      shortMonth: month,
      receita: monthlyData[idx].receita,
      despesa: monthlyData[idx].despesa,
      lucro: monthlyData[idx].receita - monthlyData[idx].despesa
    }));
  }, [data, year]);

  // Calculate average
  const average = useMemo(() => {
    const nonZeroMonths = chartData.filter(d => d.lucro !== 0);
    if (nonZeroMonths.length === 0) return 0;
    return nonZeroMonths.reduce((sum, d) => sum + d.lucro, 0) / nonZeroMonths.length;
  }, [chartData]);

  // Calculate domain for Y axis
  const yDomain = useMemo(() => {
    const values = chartData.map(d => d.lucro);
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const padding = Math.max(Math.abs(max), Math.abs(min)) * 0.1;
    return [min - padding, max + padding];
  }, [chartData]);

  return (
    <div className={`bg-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm tracking-wide">
          Lucro Bruto por Mês/Ano
        </h3>
        <CustomLegend />
      </div>

      {/* Chart */}
      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
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
              tickFormatter={formatYAxis}
              domain={yDomain}
              width={70}
            />
            
            <Tooltip content={<CustomTooltip />} />
            
            {/* Average Reference Line */}
            <ReferenceLine 
              y={average} 
              stroke={COLORS.average}
              strokeDasharray="5 5"
              strokeWidth={2}
              label={{
                value: formatYAxis(average),
                position: 'right',
                fill: COLORS.average,
                fontSize: 10
              }}
            />
            
            {/* Zero Line */}
            <ReferenceLine y={0} stroke={COLORS.grid} strokeWidth={1} />
            
            {/* Bars */}
            <Bar 
              dataKey="lucro" 
              radius={[4, 4, 0, 0]}
              maxBarSize={45}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`}
                  fill={entry.lucro >= 0 ? COLORS.positive : COLORS.negative}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default LucroBrutoChart;
