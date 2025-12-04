import { motion } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState, useEffect } from 'react';
import { SupabaseRest } from '../services/supabaseRest';

interface ChartData {
  month: string;
  receita: number;
  despesa: number;
  saldo: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-charcoal-900/95 backdrop-blur-xl border border-graphite-800 rounded-2xl p-4 shadow-xl"
      >
        <p className="text-sm font-semibold text-white mb-3">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-6 mb-1">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs text-graphite-400">{entry.name}</span>
            </div>
            <span className="text-sm font-bold text-white">
              {entry.value.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
              })}
            </span>
          </div>
        ))}
      </motion.div>
    );
  }
  return null;
};

export function ModernCashflowChart({ 
  period = 'Ano', 
  cnpj, 
  selectedMonth,
  selectedCompanies = []
}: { 
  period?: 'Dia'|'Semana'|'Mês'|'Ano'
  cnpj?: string
  selectedMonth?: string
  selectedCompanies?: string[]
}) {
  const [chartData, setChartData] = useState<ChartData[]>([
    { month: 'Jan', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Fev', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Mar', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Abr', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Mai', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Jun', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Jul', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Ago', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Set', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Out', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Nov', receita: 0, despesa: 0, saldo: 0 },
    { month: 'Dez', receita: 0, despesa: 0, saldo: 0 },
  ]);

  // Determinar quais empresas usar: selectedCompanies tem prioridade sobre cnpj
  const companiesToLoad = selectedCompanies.length > 0 
    ? selectedCompanies 
    : (cnpj ? [cnpj] : ['26888098000159']);

  useEffect(() => {
    loadCashflowData();
  }, [period, selectedMonth, companiesToLoad.join(',')]);

  // Calcular datas baseadas no período
  const getPeriodDates = (period: 'Dia'|'Semana'|'Mês'|'Ano') => {
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

  const loadCashflowData = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(period)
      const year = startDate.getFullYear()
      const month = period === 'Mês' || period === 'Dia' || period === 'Semana' ? startDate.getMonth() + 1 : undefined
      
      // Carregar dados de todas as empresas selecionadas com filtro de período
      const allDrePromises = companiesToLoad.map(cnpj => SupabaseRest.getDRE(cnpj, year, month));
      const allDreResults = await Promise.all(allDrePromises);

      // Consolidar dados de todas as empresas
      const consolidatedDre: any[] = [];
      allDreResults.forEach((dreData: any[]) => {
        if (Array.isArray(dreData)) {
          // Filtrar por período real
          const filtered = dreData.filter((item: any) => {
            if (!item.data) return false
            const itemDate = new Date(item.data)
            return itemDate >= startDate && itemDate <= endDate
          })
          consolidatedDre.push(...filtered);
        }
      });

      if (consolidatedDre.length === 0) return;

      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthlyData: any = {};
      
      // Inicializar meses baseado no período
      if (period === 'Ano') {
        monthNames.forEach(month => {
          monthlyData[month] = { month, receita: 0, despesa: 0, saldo: 0 };
        });
      } else if (period === 'Mês') {
        const currentMonth = monthNames[startDate.getMonth()]
        monthlyData[currentMonth] = { month: currentMonth, receita: 0, despesa: 0, saldo: 0 };
      } else if (period === 'Semana') {
        monthlyData['Semana'] = { month: 'Semana', receita: 0, despesa: 0, saldo: 0 };
      } else {
        monthlyData['Hoje'] = { month: 'Hoje', receita: 0, despesa: 0, saldo: 0 };
      }

      // Agregar dados por período (consolidado de todas as empresas)
      consolidatedDre.forEach((item: any) => {
        const itemDate = new Date(item.data);
        let month: string
        
        if (period === 'Ano') {
          const monthIdx = itemDate.getMonth()
          month = monthNames[monthIdx]
        } else if (period === 'Mês') {
          month = monthNames[startDate.getMonth()]
        } else if (period === 'Semana') {
          month = 'Semana'
        } else {
          month = 'Hoje'
        }
        
        if (!monthlyData[month]) {
          monthlyData[month] = { month, receita: 0, despesa: 0, saldo: 0 }
        }
        
        if (item.natureza === 'receita') {
          monthlyData[month].receita += Number(item.valor || 0);
        } else if (item.natureza === 'despesa') {
          monthlyData[month].despesa += Math.abs(Number(item.valor || 0));
        }
      });

      // Calcular saldo
      Object.values(monthlyData).forEach((data: any) => {
        data.saldo = data.receita - data.despesa;
      });

      // Converter para array baseado no período
      let finalData: any[]
      if (period === 'Ano') {
        finalData = monthNames.map(month => monthlyData[month])
      } else {
        finalData = Object.values(monthlyData)
      }
      setChartData(finalData);
    } catch (error) {
      console.error('Erro ao carregar dados de fluxo de caixa:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="neomorphic neomorphic-hover rounded-3xl p-8 border border-graphite-800/30"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white mb-1">Fluxo de Caixa</h3>
          <p className="text-sm text-graphite-400">Receitas vs Despesas (2024)</p>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-sm text-graphite-300 font-medium">Receita</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-sm text-graphite-300 font-medium">Despesa</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm text-graphite-300 font-medium">Saldo</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="h-80"
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={period === 'Ano' ? chartData : period === 'Mês' ? chartData.slice(-4) : period === 'Semana' ? chartData.slice(-2) : chartData.slice(-1)}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff7a00" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#ff7a00" stopOpacity={0} />
              </linearGradient>
            </defs>
            
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" opacity={0.3} />
            
            <XAxis
              dataKey="month"
              stroke="#6d6d6d"
              tick={{ fill: '#888888', fontSize: 12 }}
              tickLine={false}
            />
            
            <YAxis
              stroke="#6d6d6d"
              tick={{ fill: '#888888', fontSize: 12 }}
              tickLine={false}
              tickFormatter={(value) => {
                if (value >= 1000000) {
                  return `R$ ${(value / 1000000).toFixed(1)}M`;
                } else if (value >= 1000) {
                  return `R$ ${(value / 1000).toFixed(0)}k`;
                }
                return `R$ ${value}`;
              }}
            />
            
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ff7a00', strokeWidth: 1 }} />
            
            <Area
              type="monotone"
              dataKey="receita"
              name="Receita"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#colorReceita)"
              animationDuration={1500}
            />
            
            <Area
              type="monotone"
              dataKey="despesa"
              name="Despesa"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#colorDespesa)"
              animationDuration={1500}
            />
            
            <Area
              type="monotone"
              dataKey="saldo"
              name="Saldo"
              stroke="#ff7a00"
              strokeWidth={3}
              fill="url(#colorSaldo)"
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Stats Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-graphite-800"
      >
        <div>
          <p className="text-xs text-graphite-400 mb-1">Total Receita</p>
          <p className="text-lg font-bold text-emerald-400">
            R$ 8.490.000
          </p>
        </div>
        <div>
          <p className="text-xs text-graphite-400 mb-1">Total Despesa</p>
          <p className="text-lg font-bold text-red-400">
            R$ 4.780.000
          </p>
        </div>
        <div>
          <p className="text-xs text-graphite-400 mb-1">Saldo Líquido</p>
          <p className="text-lg font-bold text-gold-400">
            R$ 3.710.000
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
