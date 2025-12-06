// src/components/charts/DonutStatusChart.tsx

/**
 * DonutStatusChart - Status das Sincronizações F360
 * 
 * Conectado ao Supabase diretamente (não usa useFinancialChartData)
 * - Busca direto da tabela 'import_logs'
 * - PieChart (donut)
 * - Agrupar por status (SUCESSO, ERRO, PROCESSANDO)
 * - Cards: Total de Importações, Taxa de Sucesso %, Última Importação
 */

import React, { useMemo, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { supabase } from '@/lib/supabase';

// ============================================================
// TYPES
// ============================================================

interface DonutStatusChartProps {
  companyCnpj?: string;
  companyId?: string;
  dataInicio?: string;
  dataFim?: string;
  height?: number;
  className?: string;
}

interface StatusData {
  name: string;
  value: number;
  color: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const COLORS = {
  sucesso: '#10b981', // emerald-500
  erro: '#ef4444', // red-500
  processando: '#f59e0b', // amber-500
  grid: '#374151',
  text: '#9ca3af',
  background: '#1a1a2e',
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

// ============================================================
// CUSTOM TOOLTIP
// ============================================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; payload: StatusData }>;
}

const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 shadow-xl">
      <p className="text-gray-400 text-xs mb-2 font-medium">{data.name}</p>
      <div className="space-y-1">
        <p className="text-sm font-bold" style={{ color: data.color }}>
          Quantidade: {data.value}
        </p>
      </div>
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const DonutStatusChart: React.FC<DonutStatusChartProps> = ({
  companyCnpj,
  companyId,
  dataInicio = new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
  dataFim = new Date().toISOString().split('T')[0],
  height = 350,
  className = ''
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data from import_logs
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('import_logs')
          .select('status, created_at, finished_at')
          .gte('created_at', dataInicio)
          .lte('created_at', dataFim)
          .order('created_at', { ascending: false });

        // Filtrar por company_id se fornecido
        if (companyId) {
          query = query.eq('company_id', companyId);
        } else if (companyCnpj) {
          // Buscar company_id pelo CNPJ
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('cnpj', companyCnpj.replace(/\D/g, ''))
            .single();

          if (company) {
            query = query.eq('company_id', company.id);
          }
        }

        const { data: logsData, error: supabaseError } = await query;

        if (supabaseError) throw supabaseError;

        setData(logsData || []);
      } catch (err: any) {
        console.error('❌ Erro ao buscar dados:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [companyCnpj, companyId, dataInicio, dataFim]);

  // Process data by status
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const statusCount: Record<string, number> = {
      SUCESSO: 0,
      ERRO: 0,
      PROCESSANDO: 0
    };

    data.forEach((entry: any) => {
      const status = entry.status?.toUpperCase() || 'PROCESSANDO';
      if (status === 'SUCCESS' || status === 'SUCESSO') {
        statusCount.SUCESSO += 1;
      } else if (status === 'ERROR' || status === 'ERRO' || status === 'FAILED') {
        statusCount.ERRO += 1;
      } else {
        statusCount.PROCESSANDO += 1;
      }
    });

    return [
      { name: 'Sucesso', value: statusCount.SUCESSO, color: COLORS.sucesso },
      { name: 'Erro', value: statusCount.ERRO, color: COLORS.erro },
      { name: 'Processando', value: statusCount.PROCESSANDO, color: COLORS.processando }
    ].filter(item => item.value > 0);
  }, [data]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (data.length === 0) {
      return { total: 0, taxaSucesso: 0, ultimaImportacao: null };
    }

    const total = data.length;
    const sucesso = chartData.find(d => d.name === 'Sucesso')?.value || 0;
    const taxaSucesso = total > 0 ? (sucesso / total) * 100 : 0;
    const ultimaImportacao = data[0]?.finished_at || data[0]?.created_at;

    return { total, taxaSucesso, ultimaImportacao };
  }, [data, chartData]);

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div className={`bg-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
        <div className="flex flex-col items-center justify-center h-96 p-6">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-500"></div>
          </div>
          <p className="mt-4 text-gray-300 font-medium">Carregando dados...</p>
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
            🔄 Status das Sincronizações F360
          </h3>
          <p className="text-xs text-gray-400 mt-1">Distribuição de status das importações</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <p className="text-xs text-blue-400 font-medium uppercase tracking-wide">Total de Importações</p>
          <p className="text-2xl font-bold text-blue-300 mt-2">
            {stats.total}
          </p>
        </div>
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
          <p className="text-xs text-emerald-400 font-medium uppercase tracking-wide">Taxa de Sucesso</p>
          <p className="text-2xl font-bold text-emerald-300 mt-2">
            {stats.taxaSucesso.toFixed(1)}%
          </p>
        </div>
        <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <p className="text-xs text-purple-400 font-medium uppercase tracking-wide">Última Importação</p>
          <p className="text-sm font-bold text-purple-300 mt-2">
            {stats.ultimaImportacao 
              ? new Date(stats.ultimaImportacao).toLocaleDateString('pt-BR')
              : 'N/A'}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 py-4">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              wrapperStyle={{ color: COLORS.text, fontSize: '12px' }}
              iconType="circle"
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-between text-xs text-gray-500">
        <span>
          📊 {chartData.length} status • {stats.total} importações
        </span>
        <span>
          Período: {new Date(dataInicio).toLocaleDateString('pt-BR')} até {new Date(dataFim).toLocaleDateString('pt-BR')}
        </span>
      </div>
    </div>
  );
};

export default DonutStatusChart;
