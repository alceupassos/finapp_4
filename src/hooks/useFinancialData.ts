import { useState, useEffect } from 'react';
import { SupabaseRest } from '../services/supabaseRest';

interface FinancialMetrics {
  receitaTotal: number;
  despesasTotal: number;
  limiteDiario: number;
  metaPoupanca: number;
  receitaChange: number;
  despesasChange: number;
  limiteDiarioProgress: number;
  metaPoupancaProgress: number;
}

export function useFinancialData(cnpjs: string[] | string = ['26888098000159'], selectedMonth?: string) {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    receitaTotal: 0,
    despesasTotal: 0,
    limiteDiario: 45000,
    metaPoupanca: 150000,
    receitaChange: 0,
    despesasChange: 0,
    limiteDiarioProgress: 0,
    metaPoupancaProgress: 0,
  });
  const [loading, setLoading] = useState(true);

  // Normalizar para sempre ser array
  const cnpjArray = Array.isArray(cnpjs) ? cnpjs : [cnpjs];

  useEffect(() => {
    loadFinancialData();
  }, [JSON.stringify(cnpjArray), selectedMonth]);

  const loadFinancialData = async () => {
    try {
      // Se nenhuma empresa selecionada, retornar zeros
      if (cnpjArray.length === 0) {
        setMetrics({
          receitaTotal: 0,
          despesasTotal: 0,
          limiteDiario: 45000,
          metaPoupanca: 150000,
          receitaChange: 0,
          despesasChange: 0,
          limiteDiarioProgress: 0,
          metaPoupancaProgress: 0,
        });
        setLoading(false);
        return;
      }

      // Buscar dados de todas as empresas selecionadas
      const allDreData: any[] = [];
      for (const cnpj of cnpjArray) {
        const dreData = await SupabaseRest.getDRE(cnpj);
        if (dreData && dreData.length > 0) {
          allDreData.push(...dreData);
        }
      }

      if (allDreData.length === 0) {
        setLoading(false);
        return;
      }

      // Parse do mês selecionado
      const [selectedYear, selectedMonthNum] = selectedMonth 
        ? selectedMonth.split('-').map(Number)
        : [new Date().getFullYear(), new Date().getMonth() + 1];

      const currentYear = selectedYear;
      const currentMonth = selectedMonthNum - 1; // JavaScript usa 0-11 para meses

      // Dados do mês atual
      let receitaMesAtual = 0;
      let despesaMesAtual = 0;
      
      // Dados do mês anterior
      let receitaMesAnterior = 0;
      let despesaMesAnterior = 0;

      // Log para debug
      console.log(`📊 useFinancialData: Processando ${allDreData.length} registros DRE`)
      console.log(`📅 useFinancialData: Mês selecionado: ${selectedMonth || 'atual'} (${currentYear}-${currentMonth + 1})`)
      
      // Agregar dados de todas as empresas
      let processados = 0
      let ignorados = 0
      
      allDreData.forEach((item: any) => {
        if (!item.data) {
          console.warn('⚠️ useFinancialData: Item sem data:', item)
          ignorados++
          return
        }
        
        const itemDate = new Date(item.data)
        if (isNaN(itemDate.getTime())) {
          console.warn('⚠️ useFinancialData: Data inválida:', item.data, item)
          ignorados++
          return
        }
        
        const itemYear = itemDate.getFullYear()
        const itemMonth = itemDate.getMonth()

        if (itemYear === currentYear && itemMonth === currentMonth) {
          processados++
          if (item.natureza === 'receita') {
            receitaMesAtual += item.valor
          } else if (item.natureza === 'despesa') {
            despesaMesAtual += Math.abs(item.valor)
          } else {
            console.warn('⚠️ useFinancialData: Natureza desconhecida:', item.natureza, item)
          }
        } else if (
          (itemYear === currentYear && itemMonth === currentMonth - 1) ||
          (currentMonth === 0 && itemYear === currentYear - 1 && itemMonth === 11)
        ) {
          if (item.natureza === 'receita') {
            receitaMesAnterior += item.valor
          } else if (item.natureza === 'despesa') {
            despesaMesAnterior += Math.abs(item.valor)
          }
        } else {
          ignorados++
        }
      })
      
      console.log(`📊 useFinancialData: ${processados} processados, ${ignorados} ignorados (fora do mês)`)
      console.log(`💰 useFinancialData: Receita mês atual: R$ ${receitaMesAtual.toLocaleString('pt-BR')}, Despesas: R$ ${despesaMesAtual.toLocaleString('pt-BR')}`)

      // Calcular variações percentuais
      const receitaChange = receitaMesAnterior > 0 
        ? ((receitaMesAtual - receitaMesAnterior) / receitaMesAnterior) * 100 
        : 0;
      
      const despesasChange = despesaMesAnterior > 0 
        ? ((despesaMesAtual - despesaMesAnterior) / despesaMesAnterior) * 100 
        : 0;

      // Calcular progresso do limite diário (baseado em dias úteis do mês)
      const diasUteis = 22; // Aproximadamente
      const limiteMensal = 45000 * diasUteis;
      const limiteDiarioProgress = Math.min(Math.round((receitaMesAtual / limiteMensal) * 100), 100);

      // Calcular progresso da meta de poupança
      const saldoMesAtual = receitaMesAtual - despesaMesAtual;
      const metaPoupancaProgress = Math.min(Math.round((saldoMesAtual / 150000) * 100), 100);

      setMetrics({
        receitaTotal: receitaMesAtual,
        despesasTotal: despesaMesAtual,
        limiteDiario: 45000,
        metaPoupanca: 150000,
        receitaChange,
        despesasChange,
        limiteDiarioProgress,
        metaPoupancaProgress,
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
      setLoading(false);
    }
  };

  return { metrics, loading };
}
