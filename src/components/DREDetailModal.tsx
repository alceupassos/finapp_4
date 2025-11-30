import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface DREDetailModalProps {
  open: boolean;
  onClose: () => void;
  dreData: any[];
  selectedMonth: string;
  dreMonths: string[];
}

// Função para categorizar conta em grupo DRE
function getDREGroup(conta: string): string {
  const label = conta.toLowerCase();
  const accountCode = conta.match(/^(\d+-\d+)/)?.[1] || '';

  // Receitas Operacionais
  if (/^102-1/.test(accountCode) && !/cancelad|devol/i.test(label)) {
    return 'Receitas Operacionais';
  }
  if (/^302-1/.test(accountCode)) {
    return 'Receitas Operacionais';
  }
  if (/ajustes.*crédito.*cartão/i.test(label)) {
    return 'Receitas Operacionais';
  }

  // Deduções de Receitas
  if (/cancelad|devol/i.test(label)) {
    return 'Deduções de Receitas';
  }
  if (/^300-9|^431-9/.test(accountCode)) {
    return 'Deduções de Receitas';
  }
  if (/ajustes.*débito.*cartão/i.test(label)) {
    return 'Deduções de Receitas';
  }
  if (/tarifa.*cartão|meios.*pagamento/i.test(label)) {
    return 'Deduções de Receitas';
  }

  // Impostos Sobre o Faturamento
  if (/^205-0/.test(accountCode)) {
    return 'Impostos Sobre o Faturamento';
  }

  // Custo de Mercadorias Vendidas
  if (/^400-0/.test(accountCode) && /custo.*mercadoria/i.test(label)) {
    return 'Custo de Mercadorias Vendidas';
  }

  // Despesas Operacionais
  if (/^400-/.test(accountCode) && !/custo.*mercadoria/i.test(label)) {
    return 'Despesas Operacionais';
  }
  if (/^421-|^422-|^409-/.test(accountCode)) {
    return 'Despesas Operacionais';
  }

  // Despesas Com Pessoal
  if (/^201-|^202-|^203-|^415-|^417-/.test(accountCode)) {
    return 'Despesas Com Pessoal';
  }

  // Despesas Administrativas
  if (/^420-|^424-|^425-|^434-/.test(accountCode)) {
    return 'Despesas Administrativas';
  }

  // Despesas Financeiras
  if (/^432-|^431-5/.test(accountCode)) {
    return 'Despesas Financeiras';
  }

  // Receitas Financeiras
  if (/^303-4/.test(accountCode) && /desconto.*obtid/i.test(label)) {
    return 'Receitas Financeiras';
  }

  // Investimentos e Outros
  if (/^200-8|^211-/.test(accountCode)) {
    return 'Investimentos e Outros';
  }

  // Padrão: classificar pelo sinal
  return 'Outras Receitas/Despesas';
}

// Ordem dos grupos conforme a estrutura DRE padrão
const GROUP_ORDER = [
  'Receitas Operacionais',
  'Deduções de Receitas',
  'Impostos Sobre o Faturamento',
  'Custo de Mercadorias Vendidas',
  'Despesas Operacionais',
  'Despesas Com Pessoal',
  'Despesas Administrativas',
  'Despesas Financeiras',
  'Receitas Financeiras',
  'Investimentos e Outros',
  'Outras Receitas/Despesas',
];

type DREGroupRow = {
  group: string;
  accounts: { conta: string; natureza: string; months: Record<string, number>; total: number }[];
  groupTotals: Record<string, number>;
  groupTotal: number;
}

export function DREDetailModal({ open, onClose, dreData, selectedMonth, dreMonths }: DREDetailModalProps) {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Processar dados agrupados por grupo DRE
  const groupedData = useMemo<DREGroupRow[]>(() => {
    const groups: Record<string, {
      group: string;
      accounts: Record<string, {
        conta: string;
        natureza: string;
        months: Record<string, number>;
        total: number;
      }>;
      groupTotals: Record<string, number>;
      groupTotal: number;
    }> = {};

    dreData.forEach((item) => {
      const month = item.data ? item.data.slice(0, 7) : '';
      const account = item.conta || 'Outros';
      const nature = item.natureza || 'Outros';
      const value = Number(item.valor || 0);
      const group = getDREGroup(account);

      if (!groups[group]) {
        groups[group] = {
          group,
          accounts: {},
          groupTotals: {},
          groupTotal: 0,
        };
        dreMonths.forEach(m => {
          groups[group].groupTotals[m] = 0;
        });
      }

      if (!groups[group].accounts[account]) {
        groups[group].accounts[account] = {
          conta: account,
          natureza: nature,
          months: {},
          total: 0,
        };
        dreMonths.forEach(m => {
          groups[group].accounts[account].months[m] = 0;
        });
      }

      if (month) {
        groups[group].accounts[account].months[month] = 
          (groups[group].accounts[account].months[month] || 0) + value;
        groups[group].groupTotals[month] = 
          (groups[group].groupTotals[month] || 0) + value;
      }
      groups[group].accounts[account].total += value;
      groups[group].groupTotal += value;
    });

    // Converter para array e ordenar
    const result = GROUP_ORDER.map(groupName => {
      const group = groups[groupName];
      if (!group) return null;
      
      return {
        ...group,
        accounts: Object.values(group.accounts)
          .filter(acc => Math.abs(acc.total) > 0.01)
          .sort((a, b) => Math.abs(b.total) - Math.abs(a.total)),
      };
    }).filter(Boolean) as any;
    return result as DREGroupRow[];
  }, [dreData, dreMonths]);

  const monthsToShow = selectedMonth === 'all' ? dreMonths : [selectedMonth];
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (g: string) => setCollapsed(prev => ({ ...prev, [g]: !prev[g] }))
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card border border-border rounded-3xl shadow-soft-lg max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">DRE - Demonstração de Resultados Detalhada</h3>
                <span className="text-sm text-muted-foreground">
                  {selectedMonth === 'all' 
                    ? 'Todos os meses' 
                    : new Date(selectedMonth + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-5">
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-muted">
                      <th className="border p-2 text-left sticky left-0 bg-muted z-10 min-w-[200px]">Grupo/Conta</th>
                      {monthsToShow.map(month => {
                        const y2 = month.slice(2, 4);
                        const mi = parseInt(month.slice(5, 7)) - 1;
                        const abbr = `${monthNames[mi] || month.slice(5,7)}/${y2}`;
                        return (
                          <th key={month} className="border p-2 text-right whitespace-nowrap text-[11px]">
                            {abbr}
                          </th>
                        );
                      })}
                      {selectedMonth === 'all' && (
                        <th className="border p-2 text-right font-bold bg-blue-50 sticky right-0 bg-muted">Total</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {groupedData.map((group, groupIdx) => (
                      <React.Fragment key={group.group}>
                        {/* Grupo Header */}
                        <tr className="bg-muted/50 font-bold">
                          <td className="border p-2 sticky left-0 bg-muted/50 font-semibold" colSpan={monthsToShow.length + (selectedMonth === 'all' ? 2 : 1)}>
                            <button onClick={()=>toggleGroup(group.group)} className="mr-2 px-2 py-0.5 rounded-md border border-border text-xs bg-background">
                              {collapsed[group.group] ? '+' : '-'}
                            </button>
                            {group.group}
                          </td>
                        </tr>
                        {/* Contas do grupo */}
                        {!collapsed[group.group] && group.accounts.map((account, accIdx) => (
                          <tr key={`${group.group}-${account.conta}-${accIdx}`} className="hover:bg-muted/30">
                            <td className="border p-2 pl-6 sticky left-0 bg-background text-[11px]">
                              {account.conta}
                            </td>
                            {monthsToShow.map(month => {
                              const value = account.months[month] || 0;
                              return (
                                <td key={month} className="border p-2 text-right text-[11px]">
                                  {Math.abs(value) > 0.01 ? formatCurrency(value) : '-'}
                                </td>
                              );
                            })}
                            {selectedMonth === 'all' && (
                              <td className="border p-2 text-right font-semibold bg-blue-50 sticky right-0 bg-background text-[11px]">
                                {formatCurrency(account.total)}
                              </td>
                            )}
                          </tr>
                        ))}
                        {/* Total do grupo */}
                        <tr className="bg-muted/30 font-semibold">
                          <td className="border p-2 sticky left-0 bg-muted/30 font-bold">
                            Total {group.group}
                          </td>
                          {monthsToShow.map(month => {
                            const total = group.groupTotals[month] || 0;
                            return (
                              <td key={month} className="border p-2 text-right font-bold text-[11px]">
                                {formatCurrency(total)}
                              </td>
                            );
                          })}
                          {selectedMonth === 'all' && (
                            <td className="border p-2 text-right font-bold bg-blue-100 sticky right-0 bg-muted/30">
                              {formatCurrency(group.groupTotal)}
                            </td>
                          )}
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-muted font-bold">
                      <td className="border p-2 sticky left-0 bg-muted">TOTAL GERAL</td>
                      {monthsToShow.map(month => {
                        const total = groupedData.reduce((sum, group) => sum + (group.groupTotals[month] || 0), 0);
                        return (
                          <td key={month} className="border p-2 text-right text-[11px]">
                            {formatCurrency(total)}
                          </td>
                        );
                      })}
                      {selectedMonth === 'all' && (
                        <td className="border p-2 text-right bg-blue-100 sticky right-0 bg-muted">
                          {formatCurrency(groupedData.reduce((sum, group) => sum + group.groupTotal, 0))}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

