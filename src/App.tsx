import { useState } from 'react';
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
import { AnalisesPage } from './components/AnalisesPage';
import { ConciliacaoPage } from './components/ConciliacaoPage';
import { Users, FileText, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { scaleOnHover, item } from './lib/motion';
import { AnaliticosModal } from './components/AnaliticosModal';
import { SettingsModal } from './components/SettingsModal';
import { LogsModal } from './components/LogsModal';

export type DREItem = { grupo:string; conta:string; valor:number };
export type DFCItem = { data:string; descricao:string; entrada:number; saida:number; saldo:number };

export function App(){
  const [isDark, setIsDark] = useState(true);
  const [analiticosOpen, setAnaliticosOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [oracleContext, setOracleContext] = useState<string>('');
  const [role] = useState<'admin'|'cliente'|'franqueado'|'personalizado'>('admin')
  const [currentView, setCurrentView] = useState<'Dashboard'|'Análises'|'Fluxo de Caixa'|'Conciliação'|'Relatórios'|'Clientes'>('Dashboard')
  const [period, setPeriod] = useState<'Dia'|'Semana'|'Mês'|'Ano'>('Ano')

  useState(() => {
    const handler = (e: any) => setCurrentView(e.detail)
    window.addEventListener('navigate', handler as any)
    return () => window.removeEventListener('navigate', handler as any)
  })

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gradient-to-br from-charcoal-950 via-graphite-950 to-charcoal-900' : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'} transition-colors duration-500`}>
      <ModernSidebar role={role} onOpenAnaliticos={() => setAnaliticosOpen(true)} onOpenSettings={() => setSettingsOpen(true)} onOpenLogs={() => setLogsOpen(true)} />
      <div className="ml-64 flex flex-col min-h-screen">
        <ModernTopbar isDark={isDark} onThemeToggle={() => setIsDark(!isDark)} oracleContext={oracleContext} currentPeriod={period} onPeriodChange={(p)=>setPeriod(p)} />
        
        <main className="flex-1 p-8">
          {currentView === 'Dashboard' && (
          <>
          {/* KPI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
            <AnimatedKPICard
              title="Receita Total"
              value="R$ 847.250"
              change={12.5}
              trend="up"
              icon="TrendingUp"
              color="green"
              sparklineData={[42, 48, 45, 52, 58, 65, 70, 68, 75, 80, 85, 90]}
            />
            <AnimatedKPICard
              title="Despesas"
              value="R$ 523.180"
              change={8.2}
              trend="up"
              icon="TrendingDown"
              color="red"
              sparklineData={[30, 35, 40, 38, 42, 45, 48, 50, 52, 54, 56, 58]}
            />
            <AnimatedKPICard
              title="Limite Diário"
              value="R$ 45.000"
              change={82}
              trend="up"
              icon="Wallet"
              color="blue"
              sparklineData={[20, 25, 30, 28, 32, 35, 38, 40, 42, 43, 44, 45]}
              progress={82}
            />
            <AnimatedKPICard
              title="Meta de Poupança"
              value="R$ 150.000"
              change={67}
              trend="up"
              icon="Target"
              color="gold"
              sparklineData={[10, 20, 35, 45, 60, 70, 80, 90, 95, 100, 105, 110]}
              progress={67}
            />
          </div>

          {/* Tremor Overview */}
          <section className="mb-6">
            <DashboardOverview period={period} />
          </section>

          {/* Cashflow + Virtual Card */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
            <div className="xl:col-span-2">
              <ModernCashflowChart period={period} />
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
              <RevenueDistributionGauge />
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
            <AnalisesPage />
          )}
          {currentView === 'Fluxo de Caixa' && (
            <div className="grid grid-cols-1 gap-6">
              <ModernCashflowChart period={period} />
            </div>
          )}
          {currentView === 'Conciliação' && (
            <ConciliacaoPage />
          )}
          {currentView === 'Relatórios' && (
            <ReportsPage />
          )}
          {currentView === 'Clientes' && (
            <CustomersPage />
          )}
        </main>
        <AnaliticosModal open={analiticosOpen} onClose={() => setAnaliticosOpen(false)} />
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} onUpdateOracleContext={setOracleContext} />
        <LogsModal open={logsOpen} onClose={() => setLogsOpen(false)} />
      </div>
    </div>
  );
}

export default App;
