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
import { SettingsModal } from './components/SettingsModal';
import { LogsModal } from './components/LogsModal';
import { SimpleVolpeLogin } from './components/SimpleVolpeLogin';
import { useFinancialData } from './hooks/useFinancialData';
import { SupabaseRest } from './services/supabaseRest';

export type DREItem = { grupo:string; conta:string; valor:number };
export type DFCItem = { data:string; descricao:string; entrada:number; saida:number; saldo:number };

export function App(){
  const [isDark, setIsDark] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
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
  const [selectedCompany, setSelectedCompany] = useState('26888098000159');
  const [companies, setCompanies] = useState<Array<{ cnpj: string; cliente_nome: string; grupo_empresarial: string }>>([]);
  
  const { metrics, loading } = useFinancialData(selectedCompany, selectedMonth);

  useEffect(() => {
    loadCompanies();
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
      <ModernSidebar role={role} onOpenSettings={() => setSettingsOpen(true)} onOpenLogs={() => setLogsOpen(true)} />
      <div className="ml-64 flex flex-col min-h-screen">
        <ModernTopbar 
          isDark={isDark} 
          onThemeToggle={() => setIsDark(!isDark)} 
          oracleContext={oracleContext} 
          currentPeriod={period} 
          onPeriodChange={(p)=>setPeriod(p)}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          selectedCompany={selectedCompany}
          onCompanyChange={setSelectedCompany}
          companies={companies}
        />
        
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
              <ModernCashflowChart period={period} cnpj={selectedCompany} selectedMonth={selectedMonth} />
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
              <RevenueDistributionGauge cnpj={selectedCompany} selectedMonth={selectedMonth} />
            </div>
          </div>

          {/* Footer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <motion.div
              className="neomorphic neomorphic-hover rounded-2xl p-6 border border-graphite-800/30"
              whileHover={scaleOnHover.whileHover}
              transition={scaleOnHover.transition}
              variants={item}
              initial="hidden"
              animate="show"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20">
                  <Users className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Clientes Ativos</p>
                  <p className="text-2xl font-bold text-foreground mt-1">1.248</p>
                  <p className="text-xs text-success mt-1">+8% este mês</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              className="neomorphic neomorphic-hover rounded-2xl p-6 border border-graphite-800/30"
              whileHover={scaleOnHover.whileHover}
              transition={scaleOnHover.transition}
              variants={item}
              initial="hidden"
              animate="show"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20">
                  <FileText className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Documentos Processados</p>
                  <p className="text-2xl font-bold text-foreground mt-1">8.542</p>
                  <p className="text-xs text-success mt-1">+15% este mês</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              className="neomorphic neomorphic-hover rounded-2xl p-6 border border-graphite-800/30"
              whileHover={scaleOnHover.whileHover}
              transition={scaleOnHover.transition}
              variants={item}
              initial="hidden"
              animate="show"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-gold-500/20 to-gold-600/10 border border-gold-500/20">
                  <Zap className="w-6 h-6 text-gold-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Automação</p>
                  <p className="text-2xl font-bold text-foreground mt-1">94.8%</p>
                  <p className="text-xs text-success mt-1">+2.3% este mês</p>
                </div>
              </div>
            </motion.div>
          </div>
          </>
          )}

          {currentView === 'Análises' && (
            <AnaliticoDashboard />
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
          {currentView === 'Análises' && (
            <AnaliticoDashboard />
          )}
          {currentView === 'Notícias' && (
            <NoticiasPage 
              cnpj={selectedCompany}
              nomeEmpresa={companies.find(c => c.cnpj === selectedCompany)?.cliente_nome || 'Empresa'}
              grupoEmpresarial={companies.find(c => c.cnpj === selectedCompany)?.grupo_empresarial || 'Grupo Empresarial'}
            />
          )}
        </main>
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onUpdateOracleContext={setOracleContext} />
        <LogsModal open={logsOpen} onClose={() => setLogsOpen(false)} />
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
