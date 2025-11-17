import React, { useState, useEffect } from 'react';
import { SupabaseRest } from '../services/supabaseRest';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

interface AnaliticoDashboardProps {
  className?: string;
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

export function AnaliticoDashboard({ className }: AnaliticoDashboardProps) {
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('26888098000159'); // Matriz VOLPE 0159
  const [dreData, setDreData] = useState<any[]>([]);
  const [dfcData, setDfcData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadCompanyData(selectedCompany);
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      const data = await SupabaseRest.getCompanies();
      const volpeCompanies = data.filter(c => 
        c.cliente_nome?.toLowerCase().includes('volpe') ||
        String(c.cnpj || '').startsWith('26888098')
      ).map(c => ({
        ...c,
        cnpj: c.cnpj ? c.cnpj.replace(/^0+/, '') : c.cnpj
      })).sort((a: any, b: any) => {
        const aIs0159 = String(a.cnpj || '') === '26888098000159' ? -1 : 1
        const bIs0159 = String(b.cnpj || '') === '26888098000159' ? -1 : 1
        return aIs0159 - bIs0159
      });
      setCompanies(volpeCompanies);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadCompanyData = async (cnpj: string) => {
    setLoading(true);
    try {
      const [dre, dfc] = await Promise.all([
        SupabaseRest.getDRE(cnpj),
        SupabaseRest.getDFC(cnpj)
      ]);
      
      setDreData(dre || []);
      setDfcData(dfc || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const selectedCompanyName = companies.find(c => c.cnpj === selectedCompany)?.cliente_nome || 'Empresa';

  const dreMonths = buildFullMonthList(dreData.map((item) => item.data));
  const dfcMonths = buildFullMonthList(dfcData.map((item) => item.data));

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

  return (
    <div className={className}>
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Análises - Seleção de Empresa</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Empresa:</label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((company) => (
                    <SelectItem key={company.cnpj} value={company.cnpj}>
                      {company.cliente_nome} ({company.cnpj})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                Visualizando: {selectedCompanyName}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Carregando dados...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* DRE Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>DRE - Demonstração de Resultados</CardTitle>
            </CardHeader>
            <CardContent>
              {dreData.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Resumo por Grupo</h3>
                    <div className="space-y-1">
                      {Object.entries(dreSummary).map(([grupo, valor]) => {
                        const amount = Number(valor || 0);
                        return (
                          <div key={grupo} className="flex justify-between text-sm">
                            <span>{grupo}</span>
                            <span className={amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {formatCurrency(amount)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="h-64">
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
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum dado DRE disponível para esta empresa
                </div>
              )}
            </CardContent>
          </Card>

          {/* DFC Analytics */}
          <Card>
            <CardHeader>
              <CardTitle>DFC - Demonstração de Fluxo de Caixa</CardTitle>
            </CardHeader>
            <CardContent>
              {dfcData.length > 0 ? (
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-medium mb-2">Resumo de Fluxo</h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(dfcTotals.entradas)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Entradas</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {formatCurrency(dfcTotals.saidas)}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Saídas</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {formatCurrency(dfcTotals.saldo)}
                        </div>
                        <div className="text-sm text-muted-foreground">Saldo Final</div>
                      </div>
                    </div>
                  </div>

                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dfcChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="entradas" stroke="#10b981" name="Entradas" />
                        <Line type="monotone" dataKey="saidas" stroke="#ef4444" name="Saídas" />
                        <Line type="monotone" dataKey="saldo" stroke="#3b82f6" name="Saldo" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum dado DFC disponível para esta empresa
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tabelas Detalhadas */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Dados Detalhados - {selectedCompanyName}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* DRE Detalhado */}
                <div>
                  <h4 className="text-sm font-medium mb-2">DRE Detalhado</h4>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1">Grupo</th>
                          <th className="text-left py-1">Conta</th>
                          <th className="text-right py-1">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dreData.slice(0, 10).map((item, index) => (
                          <tr key={index} className="border-b">
                            <td className="py-1">{item.natureza || 'Outros'}</td>
                            <td className="py-1">{item.conta}</td>
                            <td className="py-1 text-right">{formatCurrency(item.valor || 0)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DFC Detalhado */}
                <div>
                  <h4 className="text-sm font-medium mb-2">DFC Detalhado</h4>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1">Data</th>
                          <th className="text-left py-1">Descrição</th>
                          <th className="text-right py-1">Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dfcData.slice(0, 10).map((item, index) => {
                          const value = item.entrada ? item.entrada : item.saida ? -item.saida : item.saldo || 0;
                          return (
                            <tr key={index} className="border-b">
                              <td className="py-1">{item.data}</td>
                              <td className="py-1">{item.descricao}</td>
                              <td className="py-1 text-right">
                                {formatCurrency(value)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}