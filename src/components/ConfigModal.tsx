import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Settings, Activity, Info, Users, Monitor } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { SupabaseRest } from '../services/supabaseRest'
import { UserManagementTab } from './UserManagementTab'
import { NOCTab } from './NOCTab'

type LogItem = { ts: string; level: 'info'|'warn'|'error'; service: 'UI'|'API'|'Edge'; endpoint?: string; companyCnpj?: string; userId?: string; message: string; latencyMs?: number }

interface ConfigModalProps {
  open: boolean
  onClose: () => void
  onUpdateOracleContext?: (v: string) => void
}

const KEY = 'oracle_context_rules'

export function ConfigModal({ open, onClose, onUpdateOracleContext }: ConfigModalProps) {
  const [activeTab, setActiveTab] = useState('settings')
  const [rules, setRules] = useState('')
  
  // Logs state
  const [level, setLevel] = useState<'all'|'info'|'warn'|'error'>('all')
  const [service, setService] = useState<'all'|'UI'|'API'|'Edge'>('all')
  const [period, setPeriod] = useState<'24h'|'7d'|'30d'>('24h')
  const [items, setItems] = useState<LogItem[]>([])

  useEffect(() => {
    if (open) {
      const v = localStorage.getItem(KEY) || ''
      setRules(v)
    }
  }, [open])

  useEffect(() => {
    if (!open || activeTab !== 'logs') return
    const q: Record<string,string> = { select: '*', order: 'ts.desc', limit: '200' }
    SupabaseRest.restGet('app_logs', { query: q }).then(setItems).catch(() => setItems([]))
  }, [open, activeTab, level, service, period])

  if (!open) return null

  const saveSettings = () => {
    localStorage.setItem(KEY, rules)
    onUpdateOracleContext && onUpdateOracleContext(rules)
    onClose()
  }

  const filtered = items.filter(i => (level==='all'||i.level===level) && (service==='all'||i.service===service))
  const byTime = filtered.map(i => ({ ts: i.ts, info: i.level==='info'?1:0, warn: i.level==='warn'?1:0, error: i.level==='error'?1:0 }))
  const topEndpoints = Object.values(filtered.reduce<Record<string,number>>((acc,i)=>{ if(!i.endpoint) return acc; acc[i.endpoint]=(acc[i.endpoint]||0)+1; return acc },{})).length ? Object.entries(filtered.reduce<Record<string,number>>((acc,i)=>{ if(!i.endpoint) return acc; acc[i.endpoint]=(acc[i.endpoint]||0)+1; return acc },{})).slice(0,8).map(([k,v])=>({ endpoint:k, count:v })) : []
  const latency = filtered.filter(i=>i.latencyMs).map(i=>({ endpoint: i.endpoint||'N/A', latency: i.latencyMs! }))

  return (
    <motion.div className="fixed inset-0 z-[75] bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="mx-auto mt-12 max-w-[1200px] bg-card border border-border rounded-3xl shadow-soft-lg overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gold-500"/>
            <h3 className="text-sm font-semibold">Configurações do Sistema</h3>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5"/>
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5 p-1 mx-5 mt-5">
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4"/>
              Configurações
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4"/>
              Usuários
            </TabsTrigger>
            <TabsTrigger value="noc" className="flex items-center gap-2">
              <Monitor className="w-4 h-4"/>
              NOC
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <Activity className="w-4 h-4"/>
              Logs
            </TabsTrigger>
            <TabsTrigger value="about" className="flex items-center gap-2">
              <Info className="w-4 h-4"/>
              Sobre
            </TabsTrigger>
          </TabsList>

          {/* Tab: Configurações */}
          <TabsContent value="settings" className="p-5">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">Regras de Contexto do Oráculo</h4>
                <p className="text-xs text-muted-foreground mb-3">
                  Configure regras de contexto (empresa/grupo, fontes, tom e escopo) para personalizar respostas do Oráculo.
                </p>
                <textarea 
                  value={rules} 
                  onChange={(e)=>setRules(e.target.value)} 
                  rows={10} 
                  placeholder="Ex: Focar em análise do Grupo Volpe, usar tom profissional, priorizar dados de 2024-2025..."
                  className="w-full bg-graphite-900 border border-graphite-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 font-mono"
                />
              </div>
              
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={onClose} 
                  className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveSettings} 
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  Salvar
                </button>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Usuários */}
          <TabsContent value="users" className="p-5">
            <UserManagementTab />
          </TabsContent>

          {/* Tab: NOC */}
          <TabsContent value="noc" className="p-5">
            <NOCTab />
          </TabsContent>

          {/* Tab: Logs */}
          <TabsContent value="logs" className="p-5">
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <select value={period} onChange={(e)=>setPeriod(e.target.value as any)} className="bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm">
                  <option value="24h">24h</option>
                  <option value="7d">7 dias</option>
                  <option value="30d">30 dias</option>
                </select>
                <select value={level} onChange={(e)=>setLevel(e.target.value as any)} className="bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm">
                  <option value="all">Todos os níveis</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                </select>
                <select value={service} onChange={(e)=>setService(e.target.value as any)} className="bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm">
                  <option value="all">Todos os serviços</option>
                  <option value="UI">UI</option>
                  <option value="API">API</option>
                  <option value="Edge">Edge</option>
                </select>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="card-premium">
                  <div className="p-4"><p className="text-sm text-muted-foreground">Níveis ao longo do tempo</p></div>
                  <div className="p-4 pt-0 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={byTime}>
                        <CartesianGrid stroke="rgba(200,200,200,0.15)" vertical={false}/>
                        <XAxis dataKey="ts" stroke="#bbb" tick={{ fill:'#bbb', fontSize:12 }} hide/>
                        <YAxis stroke="#bbb" tick={{ fill:'#bbb', fontSize:12 }} />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="info" stackId="1" stroke="#38bdf8" fill="#38bdf8" />
                        <Area type="monotone" dataKey="warn" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                        <Area type="monotone" dataKey="error" stackId="1" stroke="#ef4444" fill="#ef4444" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card-premium">
                  <div className="p-4"><p className="text-sm text-muted-foreground">Top endpoints</p></div>
                  <div className="p-4 pt-0 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topEndpoints}>
                        <CartesianGrid stroke="rgba(200,200,200,0.15)" />
                        <XAxis dataKey="endpoint" stroke="#bbb" tick={{ fill:'#bbb', fontSize:12 }} />
                        <YAxis stroke="#bbb" tick={{ fill:'#bbb', fontSize:12 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#ff7a00" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-graphite-900 sticky top-0">
                    <tr>
                      <th className="text-left p-3">Timestamp</th>
                      <th className="text-left p-3">Nível</th>
                      <th className="text-left p-3">Serviço</th>
                      <th className="text-left p-3">Endpoint</th>
                      <th className="text-left p-3">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center p-8 text-muted-foreground">
                          Nenhum log encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    )}
                    {filtered.slice(0, 50).map((log, idx) => (
                      <tr key={idx} className="border-t border-border hover:bg-graphite-900/50">
                        <td className="p-3 text-xs">{new Date(log.ts).toLocaleString('pt-BR')}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            log.level === 'error' ? 'bg-red-500/20 text-red-400' :
                            log.level === 'warn' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="p-3 text-xs">{log.service}</td>
                        <td className="p-3 text-xs font-mono">{log.endpoint || '-'}</td>
                        <td className="p-3 text-xs">{log.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Sobre */}
          <TabsContent value="about" className="p-5">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-500 to-orange-500 flex items-center justify-center">
                  <Settings className="w-8 h-8 text-white"/>
                </div>
                <div>
                  <h4 className="text-lg font-bold">fin.app</h4>
                  <p className="text-sm text-muted-foreground">Financial Intelligence Dashboard</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="card-premium p-4">
                  <p className="text-xs text-muted-foreground mb-1">Versão</p>
                  <p className="text-lg font-bold">v0.2.0</p>
                </div>
                <div className="card-premium p-4">
                  <p className="text-xs text-muted-foreground mb-1">Ambiente</p>
                  <p className="text-lg font-bold">Produção</p>
                </div>
                <div className="card-premium p-4">
                  <p className="text-xs text-muted-foreground mb-1">Empresa</p>
                  <p className="text-lg font-bold">Grupo Volpe</p>
                </div>
                <div className="card-premium p-4">
                  <p className="text-xs text-muted-foreground mb-1">Última Atualização</p>
                  <p className="text-lg font-bold">17/11/2025</p>
                </div>
              </div>

              <div className="card-premium p-5">
                <h5 className="text-sm font-semibold mb-3">Funcionalidades</h5>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500"></div>
                    Dashboard financeiro com DRE e DFC
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500"></div>
                    Análise de fluxo de caixa e lançamentos
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500"></div>
                    Sistema de notícias inteligente com IA
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500"></div>
                    Oráculo para consultas financeiras
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500"></div>
                    Gerenciamento de logs e monitoramento
                  </li>
                </ul>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                © 2025 fin.app. Todos os direitos reservados.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}
