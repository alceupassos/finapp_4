import React, { useState, useEffect } from 'react';
import { SupabaseRest } from '../services/supabaseRest';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Area, AreaChart } from 'recharts';

interface AnaliticoDashboardProps {
  className?: string;
  selectedMonth?: string;
  selectedCompany?: string;
  period?: 'Dia' | 'Semana' | 'Mês' | 'Ano';
  companies?: Array<{ cnpj: string; cliente_nome: string; grupo_empresarial: string }>;
  selectedCompanies?: string[];
}

const padMonth = (month: number) => String(month).padStart(2, '0');

const buildFullMonthList = (dates: Array<string | null | undefined>) => {
  const detectedMonths = new Set<string>();
  dates.forEach((date) => {
    if (!date) return;
    const monthKey = date.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(monthKey)) {
      detectedMonths.add(monthKey);
    }
  });

  if (detectedMonths.size === 0) {
    const year = new Date().getFullYear().toString();
    return Array.from({ length: 12 }, (_, idx) => `${year}-${padMonth(idx + 1)}`);
  }

  const years = Array.from(new Set(Array.from(detectedMonths).map((value) => value.split('-')[0]))).sort();
  const fullMonths: string[] = [];
  years.forEach((year) => {
    for (let month = 1; month <= 12; month += 1) {
      fullMonths.push(`${year}-${padMonth(month)}`);
    }
  });
  return fullMonths;
};

export function AnaliticoDashboard({ 
  className, 
  selectedMonth: propSelectedMonth, 
  selectedCompany: propSelectedCompany,
  period: propPeriod = 'Ano',
  companies: propCompanies = [],
  selectedCompanies: propSelectedCompanies = []
}: AnaliticoDashboardProps) {
  // Usar empresas e filtros globais passados como props
  const companies = propCompanies.length > 0 ? propCompanies : [];
  const selectedCompanies = propSelectedCompanies.length > 0 ? propSelectedCompanies : (propSelectedCompany ? [propSelectedCompany] : []);
  const selectedMonth = propSelectedMonth || 'all';
  const period = propPeriod;
  
  // Usar primeira empresa selecionada ou fallback
  const selectedCompany = selectedCompanies.length > 0 ? selectedCompanies[0] : (propSelectedCompany || '26888098000159');
  
  const [dreData, setDreData] = useState<any[]>([]);
  const [dfcData, setDfcData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Carregar dados quando empresas selecionadas mudarem
  useEffect(() => {
    if (selectedCompanies.length > 0) {
      // Se múltiplas empresas, carregar dados consolidados
      if (selectedCompanies.length > 1) {
        loadConsolidatedData(selectedCompanies);
      } else {
        loadCompanyData(selectedCompanies[0]);
      }
    }
  }, [selectedCompanies, selectedMonth, period]);

  // Calcular datas baseadas no período
  const getPeriodDates = (period: 'Dia' | 'Semana' | 'Mês' | 'Ano') => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const day = now.getDate()
    
    let startDate: Date
    let endDate: Date = new Date(year, month, day)
    
    switch (period) {
      case 'Dia':
        startDate = new Date(year, month, day)
        break
      case 'Semana':
        const dayOfWeek = now.getDay()
        startDate = new Date(year, month, day - dayOfWeek)
        break
      case 'Mês':
        startDate = new Date(year, month, 1)
        break
      case 'Ano':
        startDate = new Date(year, 0, 1)
        break
      default:
        startDate = new Date(year, 0, 1)
    }
    
    return { startDate, endDate }
  }

  const loadCompanyData = async (cnpj: string) => {
    setLoading(true);
    try {
      const { startDate, endDate } = getPeriodDates(period)
      const year = startDate.getFullYear()
      const month = period === 'Mês' || period === 'Dia' || period === 'Semana' ? startDate.getMonth() + 1 : undefined
      
      console.log('🔍 Buscando dados para CNPJ:', cnpj, 'Período:', period, 'Ano:', year, 'Mês:', month);
      const [dre, dfc] = await Promise.all([
        SupabaseRest.getDRE(cnpj, year, month),
        SupabaseRest.getDFC(cnpj, year, month)
      ]);
      
      // Filtrar por período real
      const dreFiltered = (dre || []).filter((item: any) => {
        if (!item.data) return false
        const itemDate = new Date(item.data)
        return itemDate >= startDate && itemDate <= endDate
      })
      
      const dfcFiltered = (dfc || []).filter((item: any) => {
        if (!item.data) return false
        const itemDate = new Date(item.data)
        return itemDate >= startDate && itemDate <= endDate
      })
      
      console.log('✅ DRE recebido:', dreFiltered?.length || 0, 'registros (filtrados:', dreFiltered.length, ')');
      console.log('✅ DFC recebido:', dfcFiltered?.length || 0, 'registros (filtrados:', dfcFiltered.length, ')');
      
      if (dreFiltered && dreFiltered.length > 0) {
        console.log('📝 Amostra DRE:', dreFiltered[0]);
      }
      if (dfcFiltered && dfcFiltered.length > 0) {
        console.log('📝 Amostra DFC:', dfcFiltered[0]);
      }
      
      // Se não houver dados do Supabase, usar dados de exemplo
      const dreDataToUse = (dreFiltered && dreFiltered.length > 0) ? dreFiltered : generateSampleDREData();
      const dfcDataToUse = (dfcFiltered && dfcFiltered.length > 0) ? dfcFiltered : generateSampleDFCData();
      
      setDreData(dreDataToUse);
      setDfcData(dfcDataToUse);
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      // Em caso de erro, usar dados de exemplo
      setDreData(generateSampleDREData());
      setDfcData(generateSampleDFCData());
    } finally {
      setLoading(false);
    }
  };

  const loadConsolidatedData = async (cnpjs: string[]) => {
    setLoading(true);
    try {
      const { startDate, endDate } = getPeriodDates(period)
      const year = startDate.getFullYear()
      const month = period === 'Mês' || period === 'Dia' || period === 'Semana' ? startDate.getMonth() + 1 : undefined
      
      console.log('🔍 Buscando dados consolidados para', cnpjs.length, 'empresas', 'Período:', period, 'Ano:', year, 'Mês:', month);
      
      // Carregar dados de todas as empresas com filtro de período
      const allDrePromises = cnpjs.map(cnpj => SupabaseRest.getDRE(cnpj, year, month));
      const allDfcPromises = cnpjs.map(cnpj => SupabaseRest.getDFC(cnpj, year, month));
      
      const allDreResults = await Promise.all(allDrePromises);
      const allDfcResults = await Promise.all(allDfcPromises);
      
      // Consolidar DRE: agrupar por data/conta e somar valores, filtrando por período
      const dreMap = new Map<string, { data: string; conta: string; natureza: string; valor: number }>();
      allDreResults.forEach((dreArray: any[]) => {
        if (Array.isArray(dreArray)) {
          dreArray.forEach((item: any) => {
            // Filtrar por período real
            if (item.data) {
              const itemDate = new Date(item.data)
              if (itemDate < startDate || itemDate > endDate) return
            }
            
            const key = `${item.data || ''}_${item.conta || ''}_${item.natureza || ''}`;
            const existing = dreMap.get(key);
            if (existing) {
              existing.valor += Number(item.valor || 0);
            } else {
              dreMap.set(key, {
                data: item.data || '',
                conta: item.conta || '',
                natureza: item.natureza || '',
                valor: Number(item.valor || 0)
              });
            }
          });
        }
      });
      
      // Consolidar DFC: agrupar por data/descrição e somar valores, filtrando por período
      const dfcMap = new Map<string, { data: string; descricao: string; entrada: number; saida: number; saldo: number }>();
      allDfcResults.forEach((dfcArray: any[]) => {
        if (Array.isArray(dfcArray)) {
          dfcArray.forEach((item: any) => {
            // Filtrar por período real
            if (item.data) {
              const itemDate = new Date(item.data)
              if (itemDate < startDate || itemDate > endDate) return
            }
            
            const key = `${item.data || ''}_${item.descricao || ''}`;
            const existing = dfcMap.get(key);
            if (existing) {
              existing.entrada += Number(item.entrada || 0);
              existing.saida += Number(item.saida || 0);
              existing.saldo += Number(item.saldo || 0);
            } else {
              dfcMap.set(key, {
                data: item.data || '',
                descricao: item.descricao || '',
                entrada: Number(item.entrada || 0),
                saida: Number(item.saida || 0),
                saldo: Number(item.saldo || 0)
              });
            }
          });
        }
      });
      
      const consolidatedDre = Array.from(dreMap.values());
      const consolidatedDfc = Array.from(dfcMap.values());
      
      setDreData(consolidatedDre.length > 0 ? consolidatedDre : generateSampleDREData());
      setDfcData(consolidatedDfc.length > 0 ? consolidatedDfc : generateSampleDFCData());
    } catch (error) {
      console.error('❌ Erro ao carregar dados consolidados:', error);
      setDreData(generateSampleDREData());
      setDfcData(generateSampleDFCData());
    } finally {
      setLoading(false);
    }
  };

  const generateSampleDREData = () => {
    const months = ['2024-09', '2024-10', '2024-11', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];
    const contas = [
      { conta: 'Receita de Serviços BPO', natureza: 'receita', baseValue: 850000 },
      { conta: 'Receita de Consultoria', natureza: 'receita', baseValue: 320000 },
      { conta: 'Outras Receitas Operacionais', natureza: 'receita', baseValue: 45000 },
      { conta: 'Salários e Encargos', natureza: 'despesa', baseValue: -520000 },
      { conta: 'Serviços de Terceiros', natureza: 'despesa', baseValue: -180000 },
      { conta: 'Despesas Administrativas', natureza: 'despesa', baseValue: -95000 },
      { conta: 'Despesas com TI e Software', natureza: 'despesa', baseValue: -78000 },
      { conta: 'Aluguel e Condomínio', natureza: 'despesa', baseValue: -42000 },
      { conta: 'Despesas com Viagens', natureza: 'despesa', baseValue: -28000 },
      { conta: 'Marketing e Publicidade', natureza: 'despesa', baseValue: -35000 },
      { conta: 'Treinamento e Capacitação', natureza: 'despesa', baseValue: -22000 },
      { conta: 'Despesas Financeiras', natureza: 'despesa', baseValue: -18000 },
    ];
    
    const data: any[] = [];
    months.forEach(month => {
      contas.forEach(c => {
        const variation = 0.85 + Math.random() * 0.3; // Variação de 85% a 115%
        data.push({
          data: `${month}-15`,
          conta: c.conta,
          natureza: c.natureza,
          valor: Math.round(c.baseValue * variation)
        });
      });
    });
    
    return data;
  };

  const generateSampleDFCData = () => {
    const months = ['2024-09', '2024-10', '2024-11', '2025-01', '2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];
    const categorias = [
      { descricao: 'Recebimento de Clientes', entrada: 980000, saida: 0 },
      { descricao: 'Pagamento de Fornecedores', entrada: 0, saida: 420000 },
      { descricao: 'Pagamento de Salários', entrada: 0, saida: 520000 },
      { descricao: 'Pagamento de Impostos', entrada: 0, saida: 125000 },
      { descricao: 'Pagamento de Aluguel', entrada: 0, saida: 42000 },
      { descricao: 'Investimentos em TI', entrada: 0, saida: 85000 },
      { descricao: 'Empréstimos Bancários', entrada: 150000, saida: 0 },
      { descricao: 'Amortização de Dívidas', entrada: 0, saida: 65000 },
    ];
    
    const data: any[] = [];
    months.forEach(month => {
      categorias.forEach(cat => {
        const variation = 0.90 + Math.random() * 0.20; // Variação de 90% a 110%
        data.push({
          data: `${month}-15`,
          descricao: cat.descricao,
          entrada: Math.round(cat.entrada * variation),
          saida: Math.round(cat.saida * variation)
        });
      });
    });
    
    return data;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };


  const dreMonths = buildFullMonthList(dreData.map((item) => item.data));
  const dfcMonths = buildFullMonthList(dfcData.map((item) => item.data));

  console.log('📊 DRE Data:', dreData.length, 'registros');
  console.log('📊 DFC Data:', dfcData.length, 'registros');
  console.log('📅 DRE Months:', dreMonths);
  console.log('📅 DFC Months:', dfcMonths);

  const dreSummary = dreData.reduce((acc: Record<string, number>, item) => {
    const key = item.natureza || 'Outros';
    acc[key] = (acc[key] || 0) + Number(item.valor || 0);
    return acc;
  }, {});

  const dreChartData = (() => {
    const natureData: Record<string, Record<string, number>> = {};
    dreData.forEach((item) => {
      const month = item.data ? item.data.slice(0, 7) : dreMonths[0];
      const nature = item.natureza || 'Outros';
      const value = Number(item.valor || 0);
      if (!natureData[nature]) natureData[nature] = {};
      natureData[nature][month] = (natureData[nature][month] || 0) + value;
    });

    return dreMonths.map((month) => {
      const point: Record<string, number | string> = { month };
      Object.entries(natureData).forEach(([nature, values]) => {
        point[nature] = values[month] || 0;
      });
      return point;
    });
  })();

  const dfcChartData = (() => {
    const monthlyData: Record<string, { entradas: number; saidas: number }> = {};
    dfcData.forEach((item) => {
      const month = item.data ? item.data.slice(0, 7) : dfcMonths[0];
      if (!monthlyData[month]) {
        monthlyData[month] = { entradas: 0, saidas: 0 };
      }
      monthlyData[month].entradas += Number(item.entrada || 0);
      monthlyData[month].saidas += Number(item.saida || 0);
    });

    return dfcMonths.map((month) => {
      const entradas = monthlyData[month]?.entradas || 0;
      const saidas = monthlyData[month]?.saidas || 0;
      return {
        month,
        entradas,
        saidas,
        saldo: entradas - saidas,
      };
    });
  })();

  const dfcTotals = dfcChartData.reduce(
    (acc, item) => {
      acc.entradas += item.entradas;
      acc.saidas += item.saidas;
      acc.saldo += item.saldo;
      return acc;
    },
    { entradas: 0, saidas: 0, saldo: 0 }
  );

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Processar DRE em formato de tabela mensal
  const dreMonthlyTable = (() => {
    if (!dreData || dreData.length === 0) return [];
    
    const accounts: Record<string, any> = {};
    
    dreData.forEach((item) => {
      const month = item.data ? item.data.slice(0, 7) : '';
      const account = item.conta || 'Outros';
      const nature = item.natureza || 'Outros';
      const value = Number(item.valor || 0);
      
      if (!accounts[account]) {
        accounts[account] = { 
          conta: account, 
          natureza: nature,
          total: 0
        };
        dreMonths.forEach(m => {
          accounts[account][m] = 0;
        });
      }
      
      if (month) {
        // Garantir que o mês existe no objeto
        if (accounts[account][month] === undefined) {
          accounts[account][month] = 0;
        }
        accounts[account][month] += value;
      }
      accounts[account].total += value;
    });
    
    return Object.values(accounts)
      .filter((acc: any) => Math.abs(acc.total) > 0)
      .sort((a: any, b: any) => Math.abs(b.total) - Math.abs(a.total))
      .slice(0, 50); // Limitar a 50 contas principais
  })();

  // Processar DFC em formato de tabela mensal
  const dfcMonthlyTable = (() => {
    if (!dfcData || dfcData.length === 0) return [];
    
    const categories: Record<string, any> = {};
    
    dfcData.forEach((item) => {
      const month = item.data ? item.data.slice(0, 7) : '';
      const category = item.descricao || 'Outros';
      const entrada = Number(item.entrada || 0);
      const saida = Number(item.saida || 0);
      
      if (!categories[category]) {
        categories[category] = { 
          categoria: category,
          totalEntradas: 0,
          totalSaidas: 0,
          saldo: 0
        };
        dfcMonths.forEach(m => {
          categories[category][`${m}_entrada`] = 0;
          categories[category][`${m}_saida`] = 0;
        });
      }
      
      if (month) {
        // Garantir que as chaves existem
        if (categories[category][`${month}_entrada`] === undefined) {
          categories[category][`${month}_entrada`] = 0;
        }
        if (categories[category][`${month}_saida`] === undefined) {
          categories[category][`${month}_saida`] = 0;
        }
        categories[category][`${month}_entrada`] += entrada;
        categories[category][`${month}_saida`] += saida;
      }
      categories[category].totalEntradas += entrada;
      categories[category].totalSaidas += saida;
      categories[category].saldo += (entrada - saida);
    });
    
    return Object.values(categories)
      .filter((cat: any) => Math.abs(cat.saldo) > 0 || cat.totalEntradas > 0 || cat.totalSaidas > 0)
      .sort((a: any, b: any) => Math.abs(b.saldo) - Math.abs(a.saldo))
      .slice(0, 30); // Limitar a 30 categorias principais
  })();

  // Lançamentos brutos (últimos 100)
  const lancamentos = dreData.slice(0, 100).map(item => ({
    data: item.data,
    tipo: 'DRE',
    conta: item.conta,
    natureza: item.natureza,
    valor: item.valor
  }));

  return (
    <div className={className}>
      {selectedCompanies.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análises</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {selectedCompanies.length === 1 
                    ? `Visualizando: ${companies.find(c => c.cnpj === selectedCompany)?.cliente_nome || 'Empresa'}`
                    : `Visualizando: ${selectedCompanies.length} empresas (Consolidado)`
                  }
                </span>
                {period && (
                  <span className="text-sm text-muted-foreground">
                    • Período: {period}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando dados...</div>
        </div>
      ) : (
        <Tabs defaultValue="dre" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dre">DRE</TabsTrigger>
            <TabsTrigger value="dfc">DFC</TabsTrigger>
            <TabsTrigger value="lancamentos">Lançamentos</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          </TabsList>

          {/* Aba DRE */}
          <TabsContent value="dre" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>DRE - Demonstração de Resultados por Mês</CardTitle>
                  <Select value={selectedMonth} disabled>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os meses</SelectItem>
                      {dreMonths.slice().reverse().map(month => (
                        <SelectItem key={month} value={month}>
                          {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {dreData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left sticky left-0 bg-muted z-10">Conta</th>
                          <th className="border p-2 text-left">Natureza</th>
                          {(selectedMonth === 'all' ? dreMonths : [selectedMonth]).map(month => {
                            const monthNum = month.slice(5, 7);
                            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                            const monthName = monthNames[parseInt(monthNum) - 1] || monthNum;
                            return (
                              <th key={month} className="border p-2 text-right whitespace-nowrap">
                                {selectedMonth === 'all' ? monthName : new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                              </th>
                            );
                          })}
                          {selectedMonth === 'all' && <th className="border p-2 text-right font-bold bg-blue-50">Total</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {dreMonthlyTable.length > 0 ? dreMonthlyTable.map((row: any, idx) => (
                          <tr key={idx} className="hover:bg-muted/50">
                            <td className="border p-2 text-left sticky left-0 bg-background font-medium text-xs">
                              {row.conta}
                            </td>
                            <td className="border p-2 text-left">
                              <span className={`px-2 py-1 rounded text-xs ${
                                row.natureza === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {row.natureza}
                              </span>
                            </td>
                            {(selectedMonth === 'all' ? dreMonths : [selectedMonth]).map(month => {
                              const value = row[month] || 0;
                              return (
                                <td key={month} className="border p-2 text-right text-xs">
                                  {Math.abs(value) > 0.01 ? formatCurrency(value) : '-'}
                                </td>
                              );
                            })}
                            {selectedMonth === 'all' && (
                              <td className="border p-2 text-right font-bold bg-blue-50 text-xs">
                                {formatCurrency(row.total)}
                              </td>
                            )}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={dreMonths.length + 3} className="border p-4 text-center text-muted-foreground">
                              Nenhum dado DRE disponível
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted font-bold">
                          <td className="border p-2" colSpan={2}>TOTAIS</td>
                          {(selectedMonth === 'all' ? dreMonths : [selectedMonth]).map(month => {
                            const total = dreMonthlyTable.reduce((sum: number, row: any) => sum + (row[month] || 0), 0);
                            return (
                              <td key={month} className="border p-2 text-right">
                                {formatCurrency(total)}
                              </td>
                            );
                          })}
                          {selectedMonth === 'all' && (
                            <td className="border p-2 text-right bg-blue-100">
                              {formatCurrency(dreMonthlyTable.reduce((sum: number, row: any) => sum + row.total, 0))}
                            </td>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum dado DRE disponível para esta empresa
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba DFC */}
          <TabsContent value="dfc" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>DFC - Demonstração de Fluxo de Caixa por Mês</CardTitle>
                  <Select value={selectedMonth} disabled>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os meses</SelectItem>
                      {dfcMonths.slice().reverse().map(month => (
                        <SelectItem key={month} value={month}>
                          {new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {dfcData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border p-2 text-left sticky left-0 bg-muted z-10">Categoria</th>
                          {(selectedMonth === 'all' ? dfcMonths : [selectedMonth]).map(month => {
                            const monthNum = month.slice(5, 7);
                            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                            const monthName = monthNames[parseInt(monthNum) - 1] || monthNum;
                            return (
                              <th key={month} className="border p-2 text-center" colSpan={2}>
                                {selectedMonth === 'all' ? monthName : new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                              </th>
                            );
                          })}
                          {selectedMonth === 'all' && <th className="border p-2 text-center bg-blue-50" colSpan={3}>Totais</th>}
                        </tr>
                        <tr className="bg-muted/50 text-xs">
                          <th className="border p-2"></th>
                          {(selectedMonth === 'all' ? dfcMonths : [selectedMonth]).map(month => (
                            <React.Fragment key={month}>
                              <th className="border p-2 text-right text-green-700">Entrada</th>
                              <th className="border p-2 text-right text-red-700">Saída</th>
                            </React.Fragment>
                          ))}
                          {selectedMonth === 'all' && (
                            <>
                              <th className="border p-2 text-right text-green-700 bg-green-50">Entradas</th>
                              <th className="border p-2 text-right text-red-700 bg-red-50">Saídas</th>
                              <th className="border p-2 text-right text-blue-700 bg-blue-50">Saldo</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {dfcMonthlyTable.length > 0 ? dfcMonthlyTable.map((row: any, idx) => (
                          <tr key={idx} className="hover:bg-muted/50">
                            <td className="border p-2 text-left sticky left-0 bg-background font-medium text-xs">
                              {row.categoria}
                            </td>
                            {(selectedMonth === 'all' ? dfcMonths : [selectedMonth]).map(month => {
                              const entrada = row[`${month}_entrada`] || 0;
                              const saida = row[`${month}_saida`] || 0;
                              return (
                                <React.Fragment key={month}>
                                  <td className="border p-2 text-right text-green-600 text-xs">
                                    {Math.abs(entrada) > 0.01 ? formatCurrency(entrada) : '-'}
                                  </td>
                                  <td className="border p-2 text-right text-red-600 text-xs">
                                    {Math.abs(saida) > 0.01 ? formatCurrency(saida) : '-'}
                                  </td>
                                </React.Fragment>
                              );
                            })}
                            {selectedMonth === 'all' && (
                              <>
                                <td className="border p-2 text-right text-green-700 bg-green-50 font-semibold text-xs">
                                  {formatCurrency(row.totalEntradas)}
                                </td>
                                <td className="border p-2 text-right text-red-700 bg-red-50 font-semibold text-xs">
                                  {formatCurrency(row.totalSaidas)}
                                </td>
                                <td className="border p-2 text-right text-blue-700 bg-blue-50 font-bold text-xs">
                                  {formatCurrency(row.saldo)}
                                </td>
                              </>
                            )}
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={(selectedMonth === 'all' ? dfcMonths.length : 1) * 2 + (selectedMonth === 'all' ? 4 : 1)} className="border p-4 text-center text-muted-foreground">
                              Nenhum dado DFC disponível
                            </td>
                          </tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-muted font-bold">
                          <td className="border p-2">TOTAIS</td>
                          {(selectedMonth === 'all' ? dfcMonths : [selectedMonth]).map(month => {
                            const totalEntrada = dfcMonthlyTable.reduce((sum: number, row: any) => sum + (row[`${month}_entrada`] || 0), 0);
                            const totalSaida = dfcMonthlyTable.reduce((sum: number, row: any) => sum + (row[`${month}_saida`] || 0), 0);
                            return (
                              <React.Fragment key={month}>
                                <td className="border p-2 text-right text-green-700">
                                  {formatCurrency(totalEntrada)}
                                </td>
                                <td className="border p-2 text-right text-red-700">
                                  {formatCurrency(totalSaida)}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          {selectedMonth === 'all' && (
                            <>
                              <td className="border p-2 text-right bg-green-100 text-green-900">
                                {formatCurrency(dfcMonthlyTable.reduce((sum: number, row: any) => sum + row.totalEntradas, 0))}
                              </td>
                              <td className="border p-2 text-right bg-red-100 text-red-900">
                                {formatCurrency(dfcMonthlyTable.reduce((sum: number, row: any) => sum + row.totalSaidas, 0))}
                              </td>
                              <td className="border p-2 text-right bg-blue-100 text-blue-900">
                                {formatCurrency(dfcMonthlyTable.reduce((sum: number, row: any) => sum + row.saldo, 0))}
                              </td>
                            </>
                          )}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum dado DFC disponível para esta empresa
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Lançamentos */}
          <TabsContent value="lancamentos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Lançamentos Brutos - Últimos 100 Registros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border p-2 text-left">Data</th>
                        <th className="border p-2 text-left">Tipo</th>
                        <th className="border p-2 text-left">Conta</th>
                        <th className="border p-2 text-left">Natureza</th>
                        <th className="border p-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lancamentos.map((item, idx) => (
                        <tr key={idx} className="hover:bg-muted/50">
                          <td className="border p-2">{item.data}</td>
                          <td className="border p-2">
                            <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                              {item.tipo}
                            </span>
                          </td>
                          <td className="border p-2">{item.conta}</td>
                          <td className="border p-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.natureza === 'receita' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {item.natureza}
                            </span>
                          </td>
                          <td className="border p-2 text-right font-mono">
                            {formatCurrency(item.valor || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Gráficos */}
          <TabsContent value="graficos" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* DRE Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>DRE - Evolução Mensal</CardTitle>
                </CardHeader>
                <CardContent>
                  {dreData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dreChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          {Object.keys(dreSummary).map((grupo, index) => (
                            <Bar key={grupo} dataKey={grupo} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* DFC Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>DFC - Fluxo de Caixa</CardTitle>
                </CardHeader>
                <CardContent>
                  {dfcData.length > 0 ? (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dfcChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Legend />
                          <Area type="monotone" dataKey="entradas" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                          <Area type="monotone" dataKey="saidas" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                          <Line type="monotone" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Sem dados
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* DRE Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>DRE - Resumo por Natureza</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(dreSummary).map(([grupo, valor]) => {
                      const amount = Number(valor || 0);
                      const totalNum = (Object.values(dreSummary) as number[]).reduce((sum, v) => sum + Math.abs(Number(v)), 0);
                      const percentage = totalNum > 0 ? (Math.abs(amount) / totalNum) * 100 : 0;
                      
                      return (
                        <div key={grupo} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{grupo}</span>
                            <span className={amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(amount)}
                            </span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${amount >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            {percentage.toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* DFC Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>DFC - Resumo de Fluxo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-4 rounded-lg bg-green-50">
                      <div className="text-2xl font-bold text-green-600">
                        {formatCurrency(dfcTotals.entradas)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Entradas</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-red-50">
                      <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(dfcTotals.saidas)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Saídas</div>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-blue-50">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatCurrency(dfcTotals.saldo)}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Saldo</div>
                    </div>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Entradas', value: dfcTotals.entradas },
                            { name: 'Saídas', value: Math.abs(dfcTotals.saidas) }
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#ef4444" />
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}