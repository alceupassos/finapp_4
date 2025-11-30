/**
 * DREConsolidadaTable - Tabela DRE Consolidada
 * 
 * Componente profissional baseado no layout Data4Company
 * - 12 meses em colunas compactas + Total
 * - Hierarquia expansível com animações
 * - Sticky column para nomes
 * - Cores condicionais (verde/vermelho)
 */

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// ============================================================
// TYPES
// ============================================================

interface DREEntry {
  data: string;
  conta: string;
  natureza: 'receita' | 'despesa';
  valor: number;
}

interface DREConsolidadaTableProps {
  data: DREEntry[];
  year?: string;
  className?: string;
}

interface GroupRow {
  id: string;
  label: string;
  type: 'header' | 'subheader' | 'detail' | 'total' | 'subtotal';
  indent: number;
  expandable: boolean;
  parentId?: string;
  values: Record<string, number>;
  isNegative?: boolean;
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

const formatCurrency = (value: number, compact = true): string => {
  if (value === 0 || isNaN(value)) return '-';
  
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (compact) {
    if (abs >= 1_000_000) {
      return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`;
    }
    if (abs >= 1_000) {
      return `${sign}R$ ${(abs / 1_000).toFixed(0)}K`;
    }
  }
  
  return `${sign}R$ ${abs.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const categorizeAccount = (conta: string, natureza: string): string => {
  const text = conta.toLowerCase();
  
  // Receitas
  if (natureza === 'receita') {
    if (text.includes('venda') || text.includes('produto') || text.includes('mercadoria')) {
      return 'receita_vendas';
    }
    if (text.includes('serviço') || text.includes('servico')) {
      return 'receita_servicos';
    }
    if (text.includes('desconto concedido') || text.includes('abatimento')) {
      return 'receita_descontos';
    }
    return 'receita_outras';
  }
  
  // Deduções
  if (text.includes('imposto') || text.includes('icms') || text.includes('ipi') || 
      text.includes('iss') || text.includes('pis') || text.includes('cofins') ||
      text.includes('inss') && text.includes('patronal')) {
    return 'deducao_impostos';
  }
  if (text.includes('desconto') || text.includes('devolução') || text.includes('devolucao')) {
    return 'deducao_descontos';
  }
  
  // Despesas
  if (text.includes('custo') || text.includes('cmv') || text.includes('mercadoria vendida')) {
    return 'despesa_cmv';
  }
  if (text.includes('comercial') || text.includes('marketing') || text.includes('propaganda')) {
    return 'despesa_comercial';
  }
  if (text.includes('administrativa') || text.includes('admin') || text.includes('telefon') ||
      text.includes('correio') || text.includes('material') || text.includes('escritório')) {
    return 'despesa_admin';
  }
  if (text.includes('pessoal') || text.includes('salário') || text.includes('salario') ||
      text.includes('ordenado') || text.includes('folha') || text.includes('pro-labore') ||
      text.includes('prolabore') || text.includes('férias') || text.includes('ferias') ||
      text.includes('13') || text.includes('fgts') || text.includes('inss')) {
    return 'despesa_pessoal';
  }
  if (text.includes('financeira') || text.includes('juros') || text.includes('multa') ||
      text.includes('tarifa') || text.includes('bancária') || text.includes('bancaria')) {
    return 'despesa_financeira';
  }
  if (text.includes('depreciação') || text.includes('depreciacao') || text.includes('amortização')) {
    return 'despesa_depreciacao';
  }
  
  return natureza === 'despesa' ? 'despesa_outras' : 'outras';
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export const DREConsolidadaTable: React.FC<DREConsolidadaTableProps> = ({
  data,
  year = '2025',
  className = ''
}) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['receita_bruta', 'deducoes', 'despesas'])
  );

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Process data into hierarchical structure
  const { rows, totals } = useMemo(() => {
    // Group by month and category
    const byMonthCategory: Record<string, Record<string, number>> = {};
    const detailsByCategory: Record<string, Record<string, Record<string, number>>> = {};
    
    data.forEach(entry => {
      const monthKey = entry.data.substring(5, 7);
      const monthIdx = MONTH_MAP[monthKey];
      if (monthIdx === undefined) return;
      
      const monthName = MONTHS[monthIdx];
      const category = categorizeAccount(entry.conta, entry.natureza);
      const value = Math.abs(entry.valor);
      
      // Aggregate by category
      if (!byMonthCategory[category]) byMonthCategory[category] = {};
      byMonthCategory[category][monthName] = (byMonthCategory[category][monthName] || 0) + value;
      
      // Keep details
      if (!detailsByCategory[category]) detailsByCategory[category] = {};
      if (!detailsByCategory[category][entry.conta]) detailsByCategory[category][entry.conta] = {};
      detailsByCategory[category][entry.conta][monthName] = 
        (detailsByCategory[category][entry.conta][monthName] || 0) + value;
    });

    // Calculate aggregates
    const getSum = (categories: string[]): Record<string, number> => {
      const result: Record<string, number> = {};
      MONTHS.forEach(m => {
        result[m] = categories.reduce((sum, cat) => 
          sum + (byMonthCategory[cat]?.[m] || 0), 0);
      });
      return result;
    };

    const receitaBruta = getSum(['receita_vendas', 'receita_servicos', 'receita_outras', 'receita_descontos']);
    const deducoes = getSum(['deducao_impostos', 'deducao_descontos']);
    const receitaLiquida: Record<string, number> = {};
    MONTHS.forEach(m => {
      receitaLiquida[m] = (receitaBruta[m] || 0) - (deducoes[m] || 0);
    });
    
    const despesasCMV = getSum(['despesa_cmv']);
    const lucroBruto: Record<string, number> = {};
    MONTHS.forEach(m => {
      lucroBruto[m] = (receitaLiquida[m] || 0) - (despesasCMV[m] || 0);
    });
    
    const despesasOp = getSum(['despesa_comercial', 'despesa_admin', 'despesa_pessoal', 'despesa_outras']);
    const ebitda: Record<string, number> = {};
    MONTHS.forEach(m => {
      ebitda[m] = (lucroBruto[m] || 0) - (despesasOp[m] || 0);
    });
    
    const despesasFinDep = getSum(['despesa_financeira', 'despesa_depreciacao']);
    const lucroLiquido: Record<string, number> = {};
    MONTHS.forEach(m => {
      lucroLiquido[m] = (ebitda[m] || 0) - (despesasFinDep[m] || 0);
    });

    // Build row structure
    const rows: GroupRow[] = [
      // RECEITA OPERACIONAL BRUTA
      { id: 'receita_bruta', label: 'RECEITA OPERACIONAL BRUTA', type: 'header', indent: 0, expandable: true, values: receitaBruta },
      { id: 'receita_vendas', label: 'Receita Bruta de Vendas', type: 'detail', indent: 1, expandable: false, parentId: 'receita_bruta', values: byMonthCategory['receita_vendas'] || {} },
      { id: 'receita_servicos', label: 'Receita de Serviços', type: 'detail', indent: 1, expandable: false, parentId: 'receita_bruta', values: byMonthCategory['receita_servicos'] || {} },
      { id: 'receita_outras', label: 'Outras Receitas', type: 'detail', indent: 1, expandable: false, parentId: 'receita_bruta', values: byMonthCategory['receita_outras'] || {} },
      
      // DEDUÇÕES
      { id: 'deducoes', label: '(-) DEDUÇÕES DA RECEITA BRUTA', type: 'header', indent: 0, expandable: true, values: deducoes, isNegative: true },
      { id: 'deducao_impostos', label: 'Impostos sobre Vendas', type: 'detail', indent: 1, expandable: false, parentId: 'deducoes', values: byMonthCategory['deducao_impostos'] || {}, isNegative: true },
      { id: 'deducao_descontos', label: 'Descontos e Devoluções', type: 'detail', indent: 1, expandable: false, parentId: 'deducoes', values: byMonthCategory['deducao_descontos'] || {}, isNegative: true },
      
      // RECEITA LÍQUIDA
      { id: 'receita_liquida', label: '= RECEITA OPERACIONAL LÍQUIDA', type: 'subtotal', indent: 0, expandable: false, values: receitaLiquida },
      
      // LUCRO BRUTO
      { id: 'lucro_bruto', label: '= LUCRO BRUTO', type: 'total', indent: 0, expandable: false, values: lucroBruto },
      
      // DESPESAS OPERACIONAIS
      { id: 'despesas', label: '(-) DESPESAS OPERACIONAIS', type: 'header', indent: 0, expandable: true, values: despesasOp, isNegative: true },
      { id: 'despesa_comercial', label: 'Despesas Comerciais', type: 'detail', indent: 1, expandable: false, parentId: 'despesas', values: byMonthCategory['despesa_comercial'] || {}, isNegative: true },
      { id: 'despesa_admin', label: 'Despesas Administrativas', type: 'detail', indent: 1, expandable: false, parentId: 'despesas', values: byMonthCategory['despesa_admin'] || {}, isNegative: true },
      { id: 'despesa_pessoal', label: 'Despesas com Pessoal', type: 'detail', indent: 1, expandable: false, parentId: 'despesas', values: byMonthCategory['despesa_pessoal'] || {}, isNegative: true },
      { id: 'despesa_outras', label: 'Outras Despesas', type: 'detail', indent: 1, expandable: false, parentId: 'despesas', values: byMonthCategory['despesa_outras'] || {}, isNegative: true },
      
      // EBITDA
      { id: 'ebitda', label: '= EBITDA', type: 'total', indent: 0, expandable: false, values: ebitda },
      
      // RESULTADO FINANCEIRO
      { id: 'financeiro', label: '(+/-) RESULTADO FINANCEIRO', type: 'header', indent: 0, expandable: true, values: despesasFinDep, isNegative: true },
      { id: 'despesa_financeira', label: 'Despesas Financeiras', type: 'detail', indent: 1, expandable: false, parentId: 'financeiro', values: byMonthCategory['despesa_financeira'] || {}, isNegative: true },
      { id: 'despesa_depreciacao', label: 'Depreciação/Amortização', type: 'detail', indent: 1, expandable: false, parentId: 'financeiro', values: byMonthCategory['despesa_depreciacao'] || {}, isNegative: true },
      
      // LUCRO LÍQUIDO
      { id: 'lucro_liquido', label: '= LUCRO LÍQUIDO', type: 'total', indent: 0, expandable: false, values: lucroLiquido },
    ];

    // Calculate totals for each row
    const totals: Record<string, number> = {};
    rows.forEach(row => {
      totals[row.id] = MONTHS.reduce((sum, m) => sum + (row.values[m] || 0), 0);
    });

    return { rows, totals };
  }, [data]);

  // Filter visible rows based on expansion state
  const visibleRows = useMemo(() => {
    return rows.filter(row => {
      if (!row.parentId) return true;
      return expandedGroups.has(row.parentId);
    });
  }, [rows, expandedGroups]);

  return (
    <div className={`bg-[#1a1a2e] rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700/50">
        <h3 className="text-white font-semibold text-sm tracking-wide">
          DRE Consolidada
        </h3>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#252542]">
              <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-300 sticky left-0 bg-[#252542] min-w-[200px] z-10">
                Grupo/Conta
              </th>
              {MONTHS.map(month => (
                <th 
                  key={month} 
                  className="text-right px-2 py-2.5 text-xs font-medium text-gray-400 whitespace-nowrap min-w-[72px]"
                >
                  {month}
                </th>
              ))}
              <th className="text-right px-3 py-2.5 text-xs font-bold text-amber-400 bg-[#2a2a4a] min-w-[85px]">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, idx) => {
              const isExpanded = expandedGroups.has(row.id);
              const total = totals[row.id] || 0;
              const displayTotal = row.isNegative ? -total : total;
              
              return (
                <tr 
                  key={row.id}
                  className={`
                    border-b border-gray-800/30 transition-colors duration-150
                    ${row.type === 'header' ? 'bg-[#1e1e38] hover:bg-[#252550]' : ''}
                    ${row.type === 'total' ? 'bg-[#2a2a4a]' : ''}
                    ${row.type === 'subtotal' ? 'bg-[#222240]' : ''}
                    ${row.type === 'detail' ? 'hover:bg-[#1e1e35]' : ''}
                  `}
                >
                  {/* Account Name */}
                  <td 
                    className={`
                      px-3 py-2 text-xs sticky left-0 z-10
                      ${row.type === 'header' ? 'bg-[#1e1e38] font-semibold text-amber-400' : ''}
                      ${row.type === 'total' ? 'bg-[#2a2a4a] font-bold text-emerald-400' : ''}
                      ${row.type === 'subtotal' ? 'bg-[#222240] font-semibold text-gray-200' : ''}
                      ${row.type === 'detail' ? 'bg-[#1a1a2e] text-gray-300' : ''}
                    `}
                    style={{ paddingLeft: `${row.indent * 16 + 12}px` }}
                  >
                    <div className="flex items-center gap-1.5">
                      {row.expandable && (
                        <button
                          onClick={() => toggleGroup(row.id)}
                          className="p-0.5 hover:bg-white/10 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      )}
                      <span>{row.label}</span>
                    </div>
                  </td>

                  {/* Month Values */}
                  {MONTHS.map(month => {
                    const value = row.values[month] || 0;
                    const displayValue = row.isNegative ? -value : value;
                    
                    return (
                      <td 
                        key={month}
                        className={`
                          text-right px-2 py-2 text-xs whitespace-nowrap font-mono
                          ${row.type === 'total' ? 'font-semibold' : ''}
                          ${displayValue < 0 ? 'text-red-400' : 'text-emerald-400'}
                          ${value === 0 ? 'text-gray-600' : ''}
                        `}
                      >
                        {formatCurrency(displayValue)}
                      </td>
                    );
                  })}

                  {/* Total Column */}
                  <td 
                    className={`
                      text-right px-3 py-2 text-xs whitespace-nowrap font-mono font-bold bg-[#2a2a4a]
                      ${displayTotal < 0 ? 'text-red-400' : 'text-amber-400'}
                    `}
                  >
                    {formatCurrency(displayTotal, false)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DREConsolidadaTable;
