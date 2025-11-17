import { useState, useEffect } from 'react';
import { getSession, loginSupabase, lastLoginError } from './services/auth';
import { ModernSidebar } from './components/ModernSidebar';
import { ModernTopbar } from './components/ModernTopbar';
import { AnimatedKPICard } from './components/AnimatedKPICard';
import { ModernCashflowChart } from './components/ModernCashflowChart';
import { VirtualCard3D } from './components/VirtualCard3D';
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

export type DREItem = { grupo:string; conta:string; valor:number };
export type DFCItem = { data:string; descricao:string; entrada:number; saida:number; saldo:number };

export function App(){
  const [isDark, setIsDark] = useState(true);
  const [configOpen, setConfigOpen] = useState(false);
  const [oracleContext, setOracleContext] = useState<string>('');
  const [role] = useState<'admin'|'cliente'|'franqueado'|'personalizado'>('admin')
  const [currentView, setCurrentView] = useState<'Dashboard'|'Análises'|'Notícias'|'Fluxo de Caixa'|'Extrato de Lançamentos'|'Relatórios'|'Clientes'>('Dashboard')
  const [period, setPeriod] = useState<'Dia'|'Semana'|'Mês'|'Ano'>('Ano')
  const [session, setSession] = useState<any>(() => getSession())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const isVolpeDomain = window.location.hostname.includes('dev.angrax.com.br') || window.location.hostname.includes('localhost')
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState('2025-11');
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(['26888098000159']); // Array de CNPJs
  const [companies, setCompanies] = useState<Array<{ cnpj: string; cliente_nome: string; grupo_empresarial: string }>>([]);
  
  const { metrics, loading } = useFinancialData(selectedCompanies, selectedMonth);

  useEffect(() => {
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

  const loadCompanies = async () => {
    try {
      const companiesList = await SupabaseRest.getCompanies();
      setCompanies(companiesList);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  useState(() => {
    const handler = (e: any) => setCurrentView(e.detail)
    window.addEventListener('navigate', handler as any)
    return () => window.removeEventListener('navigate', handler as any)
  })

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gradient-to-br from-charcoal-950 via-graphite-950 to-charcoal-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} transition-colors duration-500`}>
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
        />

        {/* Seletor de Agrupamento de Empresas */}
        <div className="px-8 py-4 border-b border-slate-800">
          <CompanyGroupSelector
            companies={companies}
            selectedCompanies={selectedCompanies}
            onChange={setSelectedCompanies}
          />
        </div>
        
        <main className="flex-1 p-8">
          {currentView === 'Dashboard' && (
          <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <AnimatedKPICard
              title="Receita Total"
              value={loading ? 'R$ 0' : `R$ ${Math.round(metrics.receitaTotal).toLocaleString('pt-BR')}`}
              change={loading ? 0 : metrics.receitaChange}
              trend={metrics.receitaChange >= 0 ? "up" : "down"}
              icon="TrendingUp"
              color="green"
              sparklineData={[42, 48, 45, 52, 58, 65, 70, 68, 75, 80, 85, 90]}
            />
            <AnimatedKPICard
              title="Despesas"
              value={loading ? 'R$ 0' : `R$ ${Math.round(metrics.despesasTotal).toLocaleString('pt-BR')}`}
              change={loading ? 0 : metrics.despesasChange}
              trend={metrics.despesasChange >= 0 ? "up" : "down"}
              icon="TrendingDown"
              color="red"
              sparklineData={[30, 35, 40, 38, 42, 45, 48, 50, 52, 54, 56, 58]}
            />
            <AnimatedKPICard
              title="Limite Diário"
              value={`R$ ${metrics.limiteDiario.toLocaleString('pt-BR')}`}
              change={loading ? 0 : metrics.limiteDiarioProgress}
              trend="up"
              icon="Wallet"
              color="blue"
              sparklineData={[20, 25, 30, 28, 32, 35, 38, 40, 42, 43, 44, 45]}
              progress={loading ? 0 : metrics.limiteDiarioProgress}
            />
            <AnimatedKPICard
              title="Meta de Poupança"
              value={`R$ ${metrics.metaPoupanca.toLocaleString('pt-BR')}`}
              change={loading ? 0 : metrics.metaPoupancaProgress}
              trend="up"
              icon="Target"
              color="gold"
              sparklineData={[10, 20, 35, 45, 60, 70, 80, 90, 95, 100, 105, 110]}
              progress={loading ? 0 : metrics.metaPoupancaProgress}
            />
          </div>

          {/* Tremor Overview */}
          <section className="mb-6">
            <DashboardOverview period={period} session={session} key={`overview-${session? 'auth':'anon'}`} />
          </section>

          {/* Cashflow + Virtual Card */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            <div className="xl:col-span-2">
              <ModernCashflowChart period={period} cnpj={selectedCompanies[0] || '26888098000159'} selectedMonth={selectedMonth} />
            </div>
            <div>
              <VirtualCard3D />
            </div>
          </div>

          {/* Transactions + Revenue Distribution */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            <div className="xl:col-span-2">
              <ModernTransactionsTable />
            </div>
            <div>
              <RevenueDistributionGauge cnpj={selectedCompanies[0] || '26888098000159'} selectedMonth={selectedMonth} />
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
            <AnaliticoDashboard selectedMonth={selectedMonth} selectedCompany={selectedCompanies[0] || '26888098000159'} />
          )}
          {currentView === 'Fluxo de Caixa' && (
            <div className="grid grid-cols-1 gap-6">
              <ModernCashflowChart period={period} />
            </div>
          )}
          {currentView === 'Extrato de Lançamentos' && (
            <ConciliacaoPage />
          )}
          {currentView === 'Relatórios' && (
            <ReportsPage />
          )}
          {currentView === 'Clientes' && (
            <CustomersPage />
          )}
          {currentView === 'Notícias' && (
            <NoticiasPage 
              cnpj={selectedCompanies[0] || '26888098000159'}
              nomeEmpresa={companies.find(c => c.cnpj === (selectedCompanies[0] || '26888098000159'))?.cliente_nome || 'Empresa'}
              grupoEmpresarial={companies.find(c => c.cnpj === (selectedCompanies[0] || '26888098000159'))?.grupo_empresarial || 'Grupo Volpe'}
            />
          )}
        </main>
        <ConfigModal open={configOpen} onClose={() => setConfigOpen(false)} onUpdateOracleContext={setOracleContext} />
        {!session && (
          isVolpeDomain ? (
            <SimpleVolpeLogin 
              open={!session} 
              onClose={() => {}} 
              onLogged={(s) => setSession(s)} 
            />
          ) : (
            <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur flex items-center justify-center">
              <div className="w-[360px] rounded-xl border border-graphite-800 bg-graphite-900 p-4 space-y-3">
                <div className="text-sm font-semibold">Entrar</div>
                {error && <div className="text-xs text-red-400">{error}</div>}
                <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="E-mail" className="w-full bg-graphite-800 border border-graphite-700 rounded-sm px-2 py-1 text-xs"/>
                <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Senha" className="w-full bg-graphite-800 border border-graphite-700 rounded-sm px-2 py-1 text-xs"/>
                <button onClick={async()=>{ 
                  setError(''); 
                  try {
                    const s = await loginSupabase(email, password);
                    if(!s){ 
                      setError(lastLoginError || 'Credenciais inválidas'); 
                      return;
                    }
                    setSession(s);
                  } catch (err: any) {
                    setError(err.message || 'Erro ao fazer login');
                  }
                }} className="px-3 py-1 rounded-sm bg-emerald-400 text-white text-xs">Entrar</button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;
