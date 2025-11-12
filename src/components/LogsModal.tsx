import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Activity } from 'lucide-react'
import { AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts'
import { SupabaseRest } from '../services/supabaseRest'

type LogItem = { ts: string; level: 'info'|'warn'|'error'; service: 'UI'|'API'|'Edge'; endpoint?: string; companyCnpj?: string; userId?: string; message: string; latencyMs?: number }

interface LogsModalProps {
  open: boolean
  onClose: () => void
}

export function LogsModal({ open, onClose }: LogsModalProps) {
  const [level, setLevel] = useState<'all'|'info'|'warn'|'error'>('all')
  const [service, setService] = useState<'all'|'UI'|'API'|'Edge'>('all')
  const [period, setPeriod] = useState<'24h'|'7d'|'30d'>('24h')
  const [items, setItems] = useState<LogItem[]>([])

  useEffect(() => {
    if (!open) return
    const q: Record<string,string> = { select: '*', order: 'ts.desc', limit: '200' }
    SupabaseRest.restGet('app_logs', { query: q }).then(setItems).catch(() => setItems([]))
  }, [open, level, service, period])

  if (!open) return null

  const filtered = items.filter(i => (level==='all'||i.level===level) && (service==='all'||i.service===service))
  const byTime = filtered.map(i => ({ ts: i.ts, info: i.level==='info'?1:0, warn: i.level==='warn'?1:0, error: i.level==='error'?1:0 }))
  const topEndpoints = Object.values(filtered.reduce<Record<string,number>>((acc,i)=>{ if(!i.endpoint) return acc; acc[i.endpoint]=(acc[i.endpoint]||0)+1; return acc },{})).length ? Object.entries(filtered.reduce<Record<string,number>>((acc,i)=>{ if(!i.endpoint) return acc; acc[i.endpoint]=(acc[i.endpoint]||0)+1; return acc },{})).slice(0,8).map(([k,v])=>({ endpoint:k, count:v })) : []
  const latency = filtered.filter(i=>i.latencyMs).map(i=>({ endpoint: i.endpoint||'N/A', latency: i.latencyMs! }))

  return (
    <motion.div className="fixed inset-0 z-[75] bg-black/55 backdrop-blur-sm">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-16 max-w-[1200px] bg-card border border-border rounded-3xl shadow-soft-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2"><Activity className="w-5 h-5 text-gold-500"/><h3 className="text-sm font-semibold">Gerenciamento • Logs</h3></div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5"/></button>
        </div>
        <div className="p-5 flex items-center gap-3">
          <select value={period} onChange={(e)=>setPeriod(e.target.value as any)} className="bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm"><option value="24h">24h</option><option value="7d">7 dias</option><option value="30d">30 dias</option></select>
          <select value={level} onChange={(e)=>setLevel(e.target.value as any)} className="bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm"><option value="all">Todos</option><option value="info">Info</option><option value="warn">Warn</option><option value="error">Error</option></select>
          <select value={service} onChange={(e)=>setService(e.target.value as any)} className="bg-graphite-900 border border-graphite-800 rounded-xl px-3 py-2 text-sm"><option value="all">Todos</option><option value="UI">UI</option><option value="API">API</option><option value="Edge">Edge</option></select>
        </div>
        <div className="p-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card-premium">
            <div className="p-4"><p className="text-sm text-muted-foreground">Níveis ao longo do tempo</p></div>
            <div className="p-4 pt-0 h-[300px]">
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
            <div className="p-4 pt-0 h-[300px]">
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
          <div className="card-premium xl:col-span-2">
            <div className="p-4"><p className="text-sm text-muted-foreground">Latência por endpoint</p></div>
            <div className="p-4 pt-0 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latency}>
                  <CartesianGrid stroke="rgba(200,200,200,0.15)" />
                  <XAxis dataKey="endpoint" stroke="#bbb" tick={{ fill:'#bbb', fontSize:12 }} />
                  <YAxis stroke="#bbb" tick={{ fill:'#bbb', fontSize:12 }} />
                  <Tooltip />
                  <Bar dataKey="latency" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-graphite-900">
                <tr>
                  <th className="text-left p-3">Ts</th>
                  <th className="text-left p-3">Nível</th>
                  <th className="text-left p-3">Serviço</th>
                  <th className="text-left p-3">Endpoint</th>
                  <th className="text-left p-3">Empresa</th>
                  <th className="text-left p-3">Mensagem</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0,50).map((i,idx)=> (
                  <tr key={idx} className="border-t border-border">
                    <td className="p-3">{i.ts}</td>
                    <td className="p-3">{i.level}</td>
                    <td className="p-3">{i.service}</td>
                    <td className="p-3">{i.endpoint||''}</td>
                    <td className="p-3">{i.companyCnpj||''}</td>
                    <td className="p-3">{i.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

