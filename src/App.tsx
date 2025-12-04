import { useState, useEffect } from 'react';
import { getSession, loginSupabase, lastLoginError } from './services/auth';
import { ModernSidebar } from './components/ModernSidebar';
import { ModernTopbar } from './components/ModernTopbar';
import { PremiumKPICard } from './components/reports/PremiumKPICard';
import { PeriodFilter, type PeriodMode } from './components/reports/PeriodFilter';
import { ModernCashflowChart } from './components/ModernCashflowChart';
import { SaldoBancarioChart } from './components/charts/SaldoBancarioChart';
import { ModernTransactionsTable } from './components/ModernTransactionsTable';
import { RevenueDistributionGauge } from './components/RevenueDistributionGauge';
import { DashboardOverview } from './components/DashboardOverview';
import { ReportsPage } from './components/ReportsPage';
import { CustomersPage } from './components/CustomersPage';
import { AnaliticoDashboard } from './components/AnaliticoDashboard';
import { ConciliacaoPage } from './components/ConciliacaoPage';
import { NoticiasPage } from './components/NoticiasPage';
import { Users, FileText, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { scaleOnHover, item } from './lib/motion';
import { ConfigModal } from './components/ConfigModal';
import { SimpleVolpeLogin } from './components/SimpleVolpeLogin';
import { useFinancialData } from './hooks/useFinancialData';
import { SupabaseRest } from './services/supabaseRest';
import { ProcessingStatsCard } from './components/ProcessingStatsCard';
import { AcquirersCard } from './components/AcquirersCard';
import { BanksCard } from './components/BanksCard';
import { CompanyGroupSelector } from './components/CompanyGroupSelector';
import { DREExportButton } from './components/DREExportButton';
import { DFCExportButton } from './components/DFCExportButton';
import { formatCurrency } from './lib/formatters';

export type DREItem = { grupo:string; conta:string; valor:number };
export type DFCItem = { data:string; descricao:string; entrada:number; saida:number; saldo:number };

export function App(){
  const [isDark, setIsDark] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [oracleContext, setOracleContext] = useState<string>('');
  const [role, setRole] = useState<'admin'|'cliente'|'franqueado'|'personalizado'>('cliente')
  const [thin, setThin] = useState<boolean>(true)
  const [currentView, setCurrentView] = useState<'Dashboard'|'Análises'|'Notícias'|'Fluxo de Caixa'|'Extrato de Lançamentos'|'Relatórios'|'Clientes'>('Dashboard')
  const [period, setPeriod] = useState<'Dia'|'Semana'|'Mês'|'Ano'>('Ano')
  const [periodMode, setPeriodMode] = useState<PeriodMode>('Y')
  const [session, setSession] = useState<any>(() => getSession())
  const [email, setEmail] = useState('alceu@angra.io')
  const [password, setPassword] = useState('app321')
  const [error, setError] = useState('')
  const isVolpeDomain = window.location.hostname.includes('dev.angrax.com.br') || window.location.hostname.includes('localhost') || window.location.hostname.includes('ifin.app.br')
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState('2025-10'); // ✅ FIX: Dados são de outubro/2025
  // ✅ FIX: Inicializar vazio, será preenchido após carregar empresas do usuário
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [companies, setCompanies] = useState<Array<{ cnpj: string; cliente_nome: string; grupo_empresarial: string }>>([]);
  
  const { metrics, loading, monthlyData } = useFinancialData(selectedCompanies, selectedMonth);
  
  // Mapear periodMode para period (compatibilidade)
  const handlePeriodModeChange = (mode: PeriodMode) => {
    setPeriodMode(mode);
    // Mapear para o sistema antigo se necessário
    if (mode === 'D') setPeriod('Dia');
    else if (mode === 'M') setPeriod('Mês');
    else if (mode === 'Y') setPeriod('Ano');
    else if (mode === 'All') setPeriod('Ano');
  };

  useEffect(() => {
    // Recarregar empresas quando a sessão mudar (após login)
    loadCompanies();
    
    // Configurar contexto padrão do Oráculo para análise BPO de Fluxo de Caixa
    const defaultOracleContext = localStorage.getItem('oracle_context_rules');
    if (!defaultOracleContext) {
      const bpoFluxoContext = `# CONTEXTO DO ORÁCULO - ESPECIALISTA EM BPO E ANÁLISE DE FLUXO DE CAIXA

## EMPRESA/GRUPO
- Grupo Volpe BPO (CNPJ: 26.888.098/0001-59)
- Atuação: Business Process Outsourcing (BPO), terceirização de processos financeiros, administrativos e de RH
- Segmento: Serviços empresariais B2B
- Principais clientes: Empresas de médio e grande porte nos setores industrial, comercial e de serviços

## EXPERTISE EM FLUXO DE CAIXA
Como especialista em BPO financeiro, o Oráculo deve fornecer análises profundas sobre:

### 1. GESTÃO DE RECEBÍVEIS E PAGÁVEIS
- Análise de prazos médios de recebimento (PMR) e pagamento (PMP)
- Identificação de gargalos de cobrança e inadimplência
- Otimização do ciclo de caixa operacional (CCC = PME + PMR - PMP)
- Estratégias de antecipação de recebíveis e negociação com fornecedores
- Análise de aging de contas a receber e a pagar

### 2. PREVISIBILIDADE E PROJEÇÕES
- Projeção de fluxo de caixa para 30, 60 e 90 dias
- Análise de sazonalidade e padrões históricos de receitas e despesas
- Identificação de tendências de entrada e saída de caixa
- Simulação de cenários (otimista, realista, pessimista)
- Alertas antecipados de necessidade de capital de giro

### 3. CAPITAL DE GIRO E LIQUIDEZ
- Cálculo e monitoramento do capital de giro líquido (CGL)
- Análise de índices de liquidez (corrente, seca, imediata)
- Identificação de necessidade de capital de giro (NCG)
- Estratégias para otimização de caixa mínimo operacional
- Análise de conversão de caixa (cash conversion cycle)

### 4. CATEGORIZAÇÃO E ANÁLISE DE DESPESAS
- Classificação de despesas por natureza (fixas vs variáveis)
- Análise de despesas por centro de custo e departamento
- Identificação de despesas anormais ou outliers
- Benchmark de despesas operacionais vs receita bruta
- Oportunidades de redução de custos e renegociação

### 5. GESTÃO DE INADIMPLÊNCIA
- Análise de taxa de inadimplência por cliente e período
- Provisão para devedores duvidosos (PDD)
- Estratégias de cobrança e recuperação de crédito
- Análise de risco de crédito de clientes
- Impacto da inadimplência no fluxo de caixa projetado

### 6. INVESTIMENTOS E CAPEX
- Análise de investimentos em ativo fixo e tecnologia
- Cálculo de retorno sobre investimento (ROI) e payback
- Impacto de investimentos no fluxo de caixa de curto e longo prazo
- Priorização de projetos de investimento
- Análise de viabilidade financeira de expansões

### 7. INDICADORES CHAVE DE PERFORMANCE (KPIs)
- Geração de caixa operacional (Operating Cash Flow)
- Free Cash Flow (FCF = Fluxo Operacional - Capex)
- Burn rate (taxa de queima de caixa)
- Runway (tempo até esgotamento do caixa)
- Cash flow margin (margem de fluxo de caixa)
- EBITDA vs Cash Flow (análise de qualidade de lucro)

### 8. COMPLIANCE E AUDITORIA
- Reconciliação bancária e controles internos
- Rastreabilidade de lançamentos e documentação
- Segregação de funções e alçadas de aprovação
- Auditoria de processos de pagamento e recebimento
- Prevenção a fraudes e controles antifraude

## FONTES DE DADOS PRIORITÁRIAS
1. DRE (Demonstração de Resultado do Exercício) - análise mensal e anual
2. DFC (Demonstração de Fluxo de Caixa) - método direto e indireto
3. Lançamentos contábeis e extratos bancários
4. Aging de contas a receber e a pagar
5. Ordens de pagamento e bordereaux de cobrança
6. Conciliações bancárias e movimentações financeiras

## TOM E ESTILO
- Linguagem executiva, clara e objetiva
- Foco em insights acionáveis e recomendações práticas
- Uso de métricas e KPIs financeiros
- Evidências baseadas em dados reais do ERP/Contabilidade
- Alertas proativos para riscos e oportunidades
- Comparações temporais (MoM, YoY) e benchmarks setoriais

## ESCOPO DE ANÁLISE
- Período: Dados de 2024 e 2025 (priorizar últimos 12 meses)
- Comparações: Mês vs mês anterior, ano vs ano anterior
- Foco: Grupo Volpe e suas unidades de negócio
- Granularidade: Análise consolidada e por centro de custo
- Alertas: Variações superiores a 15% ou valores atípicos

## RECOMENDAÇÕES ESTRATÉGICAS
Sempre que relevante, fornecer:
- Diagnóstico da situação atual do fluxo de caixa
- Identificação de problemas e oportunidades
- Recomendações de curto prazo (30 dias)
- Estratégias de médio prazo (90 dias)
- Plano de ação com priorização e responsáveis sugeridos`;
      
      localStorage.setItem('oracle_context_rules', bpoFluxoContext);
      setOracleContext(bpoFluxoContext);
    } else {
      setOracleContext(defaultOracleContext);
    }
  }, []);

  useEffect(() => {
    const isDevHost = window.location.hostname.includes('localhost')
    if (session?.role) {
      setRole(session.role)
    } else if (isDevHost) {
      setRole('admin')
    } else {
      setRole('cliente')
    }
  }, [session])

  // ✅ FIX: Recarregar empresas quando a sessão mudar (após login)
  useEffect(() => {
    if (session?.id) {
      console.log('🔄 Sessão detectada, recarregando empresas para usuário:', session.id);
      loadCompanies();
    }
  }, [session?.id])

  const loadCompanies = async () => {
    try {
      const companiesList = await SupabaseRest.getCompanies();
      setCompanies(companiesList);
      
      // ✅ FIX: Atualizar selectedCompanies com todas as empresas do usuário
      if (companiesList.length > 0) {
        const allCnpjs = companiesList.map(c => c.cnpj).filter(Boolean) as string[];
        if (allCnpjs.length > 0) {
          console.log('✅ Carregando', allCnpjs.length, 'empresas do usuário:', allCnpjs);
          setSelectedCompanies(allCnpjs);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  useEffect(() => {
    const handler = (e: any) => setCurrentView(e.detail)
    
    window.addEventListener('navigate', handler as any)
    
    return () => {
      window.removeEventListener('navigate', handler as any)
    }
  }, [])

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gradient-to-br from-charcoal-950 via-graphite-950 to-charcoal-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} transition-colors duration-500 ${thin ? 'u-thin' : ''}`}>
      <ModernSidebar role={role} onOpenSettings={() => setConfigOpen(true)} />
      <div className="ml-64 flex flex-col min-h-screen">
        <ModernTopbar 
          isDark={isDark} 
          onThemeToggle={() => setIsDark(!isDark)} 
          oracleContext={oracleContext} 
          currentPeriod={period} 
          onPeriodChange={(p)=>setPeriod(p)}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          extraActions={<button onClick={()=>setThin(v=>!v)} className="ultra-button">Ultra Thin</button>}
        />

        {/* Seletor de Agrupamento de Empresas e Botões de Exportação */}
        <div className="px-8 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex-1">
            <CompanyGroupSelector
              companies={companies}
              selectedCompanies={selectedCompanies}
              onChange={setSelectedCompanies}
            />
          </div>
          <div className="flex gap-2">
            <DREExportButton 
              selectedCompanies={selectedCompanies}
              selectedMonth={selectedMonth}
              period={period}
            />
            <DFCExportButton 
              selectedCompanies={selectedCompanies}
              selectedMonth={selectedMonth}
              period={period}
            />
          </div>
        </div>
        
        <main className="flex-1 p-8">
          {currentView === 'Dashboard' && (
          <>
          {/* Period Filter */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <PeriodFilter
                mode={periodMode}
                onModeChange={handlePeriodModeChange}
              />
              {selectedCompanies.length > 0 && (
                <span className="text-sm text-graphite-400">
                  {selectedCompanies.length} {selectedCompanies.length === 1 ? 'empresa' : 'empresas'} selecionada{selectedCompanies.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <PremiumKPICard
              title="Receita Total"
              value={loading ? 0 : metrics.receitaTotal}
              trendValue={loading ? 0 : metrics.receitaChange}
              trend={metrics.receitaChange >= 0 ? "up" : "down"}
              trendPeriod="vs mês anterior"
              format="currency"
              sparklineData={monthlyData?.receita || []}
              delay={0}
              subtitle={selectedCompanies.length > 1 ? `${selectedCompanies.length} empresas (Consolidado)` : undefined}
            />
            <PremiumKPICard
              title="Despesas"
              value={loading ? 0 : metrics.despesasTotal}
              trendValue={loading ? 0 : metrics.despesasChange}
              trend={metrics.despesasChange >= 0 ? "down" : "up"}
              trendPeriod="vs mês anterior"
              format="currency"
              sparklineData={monthlyData?.despesas || []}
              delay={0.1}
              subtitle={selectedCompanies.length > 1 ? `${selectedCompanies.length} empresas (Consolidado)` : undefined}
            />
            <PremiumKPICard
              title="Limite Diário"
              value={metrics.limiteDiario}
              trendValue={metrics.limiteDiarioProgress}
              trend="up"
              trendPeriod="Progresso"
              format="currency"
              sparklineData={monthlyData?.limite || []}
              delay={0.2}
              subtitle={`Progresso ${metrics.limiteDiarioProgress}%`}
            />
            <PremiumKPICard
              title="Meta de Poupança"
              value={metrics.metaPoupanca}
              trendValue={metrics.metaPoupancaProgress}
              trend="up"
              trendPeriod="Progresso"
              format="currency"
              sparklineData={monthlyData?.poupanca || []}
              delay={0.3}
              subtitle={`Progresso ${metrics.metaPoupancaProgress}%`}
            />
          </div>

          {/* Tremor Overview */}
          <section className="mb-6">
            <DashboardOverview 
              period={period} 
              session={session} 
              selectedCompanies={selectedCompanies}
              key={`overview-${session? 'auth':'anon'}-${selectedCompanies.join(',')}`} 
            />
          </section>

          {/* Cashflow + Saldo Bancário */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            <div className="xl:col-span-2">
              <ModernCashflowChart period={period} selectedCompanies={selectedCompanies} selectedMonth={selectedMonth} />
            </div>
            <div>
              <SaldoBancarioChart cnpj={selectedCompanies.length > 0 ? selectedCompanies[0] : undefined} />
            </div>
          </div>

          {/* Transactions + Revenue Distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            <div className="xl:col-span-2">
              <ModernTransactionsTable selectedCompanies={selectedCompanies} />
            </div>
            <div>
              <RevenueDistributionGauge cnpj={selectedCompanies.length > 0 ? selectedCompanies[0] : undefined} selectedMonth={selectedMonth} />
            </div>
          </div>

          {/* Footer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <ProcessingStatsCard 
              payments={1248} 
              receipts={892} 
              paymentsChange={12} 
              receiptsChange={8} 
            />
            <AcquirersCard />
            <BanksCard />
          </div>
          </>
          )}

          {currentView === 'Análises' && (
            <AnaliticoDashboard 
              selectedMonth={selectedMonth} 
              selectedCompany={selectedCompanies[0] || undefined}
              period={period}
              companies={companies}
              selectedCompanies={selectedCompanies}
            />
          )}
          {currentView === 'Fluxo de Caixa' && (
            <div className="grid grid-cols-1 gap-6">
              <ModernCashflowChart 
                period={period} 
                selectedCompanies={selectedCompanies}
                selectedMonth={selectedMonth}
              />
            </div>
          )}
          {currentView === 'Extrato de Lançamentos' && (
            <ConciliacaoPage />
          )}
          {currentView === 'Relatórios' && (
            <ReportsPage 
              companies={companies}
              selectedCompanies={selectedCompanies}
              selectedMonth={selectedMonth}
            />
          )}
          {currentView === 'Clientes' && (
            <CustomersPage />
          )}
          {currentView === 'Notícias' && (
            <NoticiasPage 
              cnpj={selectedCompanies[0] || undefined}
              nomeEmpresa={selectedCompanies[0] ? companies.find(c => c.cnpj === selectedCompanies[0])?.cliente_nome || 'Empresa' : 'Empresa'}
              grupoEmpresarial={selectedCompanies[0] ? companies.find(c => c.cnpj === selectedCompanies[0])?.grupo_empresarial || '' : ''}
            />
          )}
        </main>
        <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} onUpdateOracleContext={setOracleContext} />
        {!session && (
          isVolpeDomain ? (
            <SimpleVolpeLogin 
              open={!session} 
              onClose={() => {}} 
              onLogged={(s) => {
                setSession(s);
                // Recarregar empresas após login para pegar as empresas do usuário
                loadCompanies();
              }} 
            />
          ) : (
            <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur flex items-center justify-center">
              <div className="w-[380px] rounded-xl border border-graphite-800 bg-graphite-900 p-7 space-y-4">
                <div className="flex flex-col items-center gap-2">
                  <img src="/finapp-logo.png" alt="fin.app" className="w-32 h-auto opacity-80" />
                  <h3 className="text-sm font-semibold">Entrar</h3>
                </div>
                {error && <div className="text-xs text-red-400 text-center">{error}</div>}
                <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="E-mail" className="w-full bg-graphite-800 border border-graphite-700 rounded-sm px-2 py-1 text-xs"/>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Senha" className="w-full bg-graphite-800 border border-graphite-700 rounded-sm px-2 py-1 text-xs"/>
                <button onClick={async()=>{ 
                  setError(''); 
                  try {
                    const s = await loginSupabase(email, password);
                    if(!s){ 
                      const errorMsg = lastLoginError || 'Credenciais inválidas';
                      setError(errorMsg.includes('404') ? 'Erro de conexão com o servidor. Verifique as configurações.' : errorMsg); 
                      return;
                    }
                    setSession(s);
                    // Recarregar empresas após login para pegar as empresas do usuário
                    loadCompanies();
                  } catch (err: any) {
                    setError(err.message || 'Erro ao fazer login');
                  }
                }} className="w-full px-3 py-2 rounded-sm bg-emerald-400 text-white hover:bg-emerald-500 text-xs">Entrar</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;
