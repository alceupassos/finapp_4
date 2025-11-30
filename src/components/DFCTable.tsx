/**
 * DFCTable - Demonstração de Fluxo de Caixa
 * 
 * Componente profissional baseado no layout Data4Company
 * - Categorias com Entrada/Saída/Saldo por mês
 * - Hierarquia expansível
 * - Visual consistente com DREConsolidadaTable
 */

import { FC, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface DFCEntry {
  data: string;
  entrada: number;
  saida: number;
  saldo: number;
  descricao?: string;
  categoria?: string;
}

interface DFCTableProps {
  data: DFCEntry[];
  year?: string;
  className?: string;
}

// ============================================================
// CONSTANTS
// ============================================================

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const MONTH_MAP: Record<string, number> = {
  '01': 0, '02': 1, '03': 2, '04': 3, '05': 4, '06': 5,
  '07': 6, '08': 7, '09': 8, '10': 9, '11': 10, '12': 11
};

// ============================================================
// HELPERS
// ============================================================

const formatCurrency = (value: number): string => {
  if (value === 0 || isNaN(value)) return '-';
  
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (abs >= 1_000) {
    return `${sign}R$ ${(abs / 1_000).toFixed(0)}K`;
  }
  
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`;
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const DFCTable: FC<DFCTableProps> = ({
  data,
  year = '2025',
  className = ''
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['lancamentos_dre', 'operacional'])
  );

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Process data by month
  const monthlyData = useMemo(() => {
    const result: Record<string, { entrada: number; saida: number; saldo: number }> = {};
    
    MONTHS.forEach(m => {
      result[m] = { entrada: 0, saida: 0, saldo: 0 };
    });

    data.forEach(entry => {
      const monthKey = entry.data.substring(5, 7);
      const monthIdx = MONTH_MAP[monthKey];
      if (monthIdx === undefined) return;
      
      const monthName = MONTHS[monthIdx];
      result[monthName].entrada += entry.entrada || 0;
      result[monthName].saida += entry.saida || 0;
    });

    // Calculate running balance
    let runningBalance = 0;
    MONTHS.forEach(m => {
      runningBalance += result[m].entrada - result[m].saida;
      result[m].saldo = runningBalance;
    });

    return result;
  }, [data]);

  // Calculate totals
  const totals = useMemo(() => {
    return MONTHS.reduce(
      (acc, m) => ({
        entrada: acc.entrada + monthlyData[m].entrada,
        saida: acc.saida + monthlyData[m].saida,
        saldo: monthlyData[MONTHS[MONTHS.length - 1]].saldo
      }),
      { entrada: 0, saida: 0, saldo: 0 }
    );
  }, [monthlyData]);

  return (
    <div className={`bg-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm tracking-wide">
          Fluxo de Caixa (DFC)
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-gray-400">Entrada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="w-3.5 h-3.5 text-red-400" />
            <span className="text-gray-400">Saída</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#252542]">
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-300 sticky left-0 bg-[#252542] min-w-[180px] z-10">
                Categoria
              </th>
              {MONTHS.map(month => (
                <th key={month} colSpan={3} className="text-center px-1 py-1 text-xs font-medium text-gray-400 border-l border-gray-700/30">
                  <div className="flex flex-col">
                    <span className="font-semibold">{month}</span>
                  </div>
                </th>
              ))}
              <th colSpan={3} className="text-center px-2 py-2 text-xs font-bold text-amber-400 bg-[#2a2a4a] border-l border-gray-600">
                Total
              </th>
            </tr>
            <tr className="bg-[#1e1e38]">
              <th className="sticky left-0 bg-[#1e1e38] z-10"></th>
              {MONTHS.map(month => ([
                <th
                  key={`${month}-sub-entrada`}
                  className="text-right px-1 py-1.5 text-[10px] font-medium text-emerald-400/70 min-w-[55px]"
                >
                  Entrada
                </th>,
                <th
                  key={`${month}-sub-saida`}
                  className="text-right px-1 py-1.5 text-[10px] font-medium text-red-400/70 min-w-[55px]"
                >
                  Saída
                </th>,
                <th
                  key={`${month}-sub-saldo`}
                  className="text-right px-1 py-1.5 text-[10px] font-medium text-blue-400/70 min-w-[55px] border-r border-gray-700/30"
                >
                  Saldo
                </th>
              ]))}
              <th className="text-right px-1 py-1.5 text-[10px] font-medium text-emerald-400 bg-[#2a2a4a] min-w-[55px]">
                Entrada
              </th>
              <th className="text-right px-1 py-1.5 text-[10px] font-medium text-red-400 bg-[#2a2a4a] min-w-[55px]">
                Saída
              </th>
              <th className="text-right px-1 py-1.5 text-[10px] font-medium text-blue-400 bg-[#2a2a4a] min-w-[55px]">
                Saldo
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Lançamentos DRE Row */}
            <tr className="bg-[#1e1e38] hover:bg-[#252550] border-b border-gray-800/30">
              <td className="px-3 py-2.5 text-xs font-semibold text-amber-400 sticky left-0 bg-[#1e1e38] z-10">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => toggleCategory('lancamentos_dre')}
                    className="p-0.5 hover:bg-white/10 rounded transition-colors"
                  >
                    {expandedCategories.has('lancamentos_dre') ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    )}
                  </button>
                  <span>Lançamentos DRE</span>
                </div>
              </td>
              {MONTHS.map(month => ([
                <td
                  key={`${month}-dre-entrada`}
                  className="text-right px-1 py-2 text-xs font-mono text-emerald-400"
                >
                  {formatCurrency(monthlyData[month].entrada)}
                </td>,
                <td
                  key={`${month}-dre-saida`}
                  className="text-right px-1 py-2 text-xs font-mono text-red-400"
                >
                  {formatCurrency(monthlyData[month].saida)}
                </td>,
                <td
                  key={`${month}-dre-saldo`}
                  className={`text-right px-1 py-2 text-xs font-mono border-r border-gray-700/30 ${
                    monthlyData[month].saldo >= 0 ? 'text-blue-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(monthlyData[month].saldo)}
                </td>
              ]))}
              <td className="text-right px-2 py-2 text-xs font-mono font-bold text-emerald-400 bg-[#2a2a4a]">
                {formatCurrency(totals.entrada)}
              </td>
              <td className="text-right px-2 py-2 text-xs font-mono font-bold text-red-400 bg-[#2a2a4a]">
                {formatCurrency(totals.saida)}
              </td>
              <td className={`text-right px-2 py-2 text-xs font-mono font-bold bg-[#2a2a4a] ${
                totals.saldo >= 0 ? 'text-blue-400' : 'text-red-400'
              }`}>
                {formatCurrency(totals.saldo)}
              </td>
            </tr>

            {/* Totals Row */}
            <tr className="bg-[#2a2a4a] border-t border-gray-600">
              <td className="px-3 py-3 text-xs font-bold text-white sticky left-0 bg-[#2a2a4a] z-10">
                TOTAIS
              </td>
              {MONTHS.map(month => ([
                <td
                  key={`${month}-total-entrada`}
                  className="text-right px-1 py-3 text-xs font-mono font-bold text-emerald-400"
                >
                  {formatCurrency(monthlyData[month].entrada)}
                </td>,
                <td
                  key={`${month}-total-saida`}
                  className="text-right px-1 py-3 text-xs font-mono font-bold text-red-400"
                >
                  {formatCurrency(monthlyData[month].saida)}
                </td>,
                <td
                  key={`${month}-total-saldo`}
                  className={`text-right px-1 py-3 text-xs font-mono font-bold border-r border-gray-600 ${
                    monthlyData[month].saldo >= 0 ? 'text-blue-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(monthlyData[month].saldo)}
                </td>
              ]))}
              <td className="text-right px-2 py-3 text-xs font-mono font-bold text-emerald-400 bg-[#353560]">
                {formatCurrency(totals.entrada)}
              </td>
              <td className="text-right px-2 py-3 text-xs font-mono font-bold text-red-400 bg-[#353560]">
                {formatCurrency(totals.saida)}
              </td>
              <td className={`text-right px-2 py-3 text-xs font-mono font-bold bg-[#353560] ${
                totals.saldo >= 0 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {formatCurrency(totals.saldo)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DFCTable;
