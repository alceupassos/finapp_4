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

export function useFinancialData(cnpjs: string[] | string = [], selectedMonth?: string) {
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

  // Normalizar para sempre ser array, filtrando valores vazios
  const cnpjArray = Array.isArray(cnpjs) 
    ? cnpjs.filter(c => c && c.trim() !== '') 
    : (cnpjs && cnpjs.trim() !== '' ? [cnpjs] : []);

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

      // ✅ TAREFA 2: Detectar automaticamente o mês mais recente disponível nos dados
      let targetYear: number
      let targetMonth: number
      
      if (selectedMonth) {
        // Se mês foi selecionado, usar ele
        const [selectedYear, selectedMonthNum] = selectedMonth.split('-').map(Number)
        targetYear = selectedYear
        targetMonth = selectedMonthNum - 1
      } else {
        // Se não, detectar o mês mais recente nos dados
        const dates = allDreData
          .map((item: any) => {
            if (!item.data) return null
            const d = new Date(item.data)
            return isNaN(d.getTime()) ? null : d
          })
          .filter((d: Date | null): d is Date => d !== null)
        
        if (dates.length === 0) {
          console.warn('⚠️ useFinancialData: Nenhuma data válida encontrada')
          setLoading(false)
          return
        }
        
        const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
        targetYear = maxDate.getFullYear()
        targetMonth = maxDate.getMonth()
        console.log(`📅 useFinancialData: Mês mais recente detectado automaticamente: ${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`)
      }

      const currentYear = targetYear
      const currentMonth = targetMonth // JavaScript usa 0-11 para meses

      // Dados do mês atual
      let receitaMesAtual = 0;
      let despesaMesAtual = 0;
      
      // Dados do mês anterior
      let receitaMesAnterior = 0;
      let despesaMesAnterior = 0;

      // Log para debug
      console.log(`📊 useFinancialData: Processando ${allDreData.length} registros DRE`)
      console.log(`📅 useFinancialData: Mês selecionado: ${selectedMonth || 'atual'} (${currentYear}-${String(currentMonth + 1).padStart(2, '0')})`)
      
      // ✅ FIX: Log de amostra dos dados brutos
      if (allDreData.length > 0) {
        console.log('📋 useFinancialData - Amostra dos primeiros 5 registros:')
        allDreData.slice(0, 5).forEach((item: any, idx: number) => {
          console.log(`   ${idx + 1}. Data: ${item.data}, Natureza: ${item.natureza}, Valor: R$ ${item.valor?.toLocaleString('pt-BR') || 0}`)
        })
      }
      
      // Agregar dados de todas as empresas
      let processados = 0
      let ignorados = 0
      const datasProcessadas = new Set<string>()
      const datasIgnoradas = new Set<string>()
      
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
        const itemMonthKey = `${itemYear}-${String(itemMonth + 1).padStart(2, '0')}`

        // ✅ FIX: Filtrar APENAS o mês selecionado (não todos os meses)
        if (itemYear === currentYear && itemMonth === currentMonth) {
          processados++
          datasProcessadas.add(itemMonthKey)
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
          // Mês anterior para cálculo de variação
          if (item.natureza === 'receita') {
            receitaMesAnterior += item.valor
          } else if (item.natureza === 'despesa') {
            despesaMesAnterior += Math.abs(item.valor)
          }
        } else {
          ignorados++
          datasIgnoradas.add(itemMonthKey)
        }
      })
      
      console.log(`📊 useFinancialData: ${processados} processados, ${ignorados} ignorados (fora do mês)`)
      console.log(`📅 useFinancialData: Meses processados: ${Array.from(datasProcessadas).join(', ')}`)
      console.log(`📅 useFinancialData: Meses ignorados (amostra): ${Array.from(datasIgnoradas).slice(0, 5).join(', ')}${datasIgnoradas.size > 5 ? '...' : ''}`)
      console.log(`💰 useFinancialData: Receita mês atual: R$ ${receitaMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Despesas: R$ ${despesaMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      console.log(`💰 useFinancialData: Receita mês anterior: R$ ${receitaMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, Despesas: R$ ${despesaMesAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)

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
