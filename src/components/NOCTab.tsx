import { useState, useEffect } from 'react'
import { Activity, Database, Cpu, Zap, MessageSquare, Settings as SettingsIcon, RefreshCw, TrendingUp, AlertCircle } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import { motion } from 'framer-motion'

interface NOCMetrics {
  database: {
    connections: number
    queries_per_sec: number
    storage_used_gb: number
    storage_total_gb: number
    avg_query_time_ms: number
  }
  api: {
    requests_per_min: number
    avg_response_time_ms: number
    error_rate_percent: number
    active_sessions: number
  }
  llm: {
    provider: string
    model: string
    tokens_used_today: number
    tokens_limit_daily: number
    requests_today: number
    avg_latency_ms: number
    cost_today_usd: number
  }
  whatsapp: {
    connected: boolean
    messages_today: number
    messages_pending: number
    last_connection: string
    phone_number: string
  }
  system: {
    uptime_hours: number
    cpu_usage_percent: number
    memory_usage_percent: number
    disk_usage_percent: number
  }
}

export function NOCTab() {
  const [metrics, setMetrics] = useState<NOCMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(30) // segundos

  useEffect(() => {
    loadMetrics()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadMetrics()
    }, refreshInterval * 1000)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  const loadMetrics = async () => {
    setLoading(true)
    try {
      // TODO: Implementar endpoint real no Supabase/API
      // Por enquanto, dados mockados
      setMetrics({
        database: {
          connections: 12,
          queries_per_sec: 245,
          storage_used_gb: 8.4,
          storage_total_gb: 50,
          avg_query_time_ms: 23
        },
        api: {
          requests_per_min: 1250,
          avg_response_time_ms: 187,
          error_rate_percent: 0.3,
          active_sessions: 45
        },
        llm: {
          provider: 'OpenAI',
          model: 'gpt-4-turbo',
          tokens_used_today: 125400,
          tokens_limit_daily: 1000000,
          requests_today: 342,
          avg_latency_ms: 1245,
          cost_today_usd: 12.54
        },
        whatsapp: {
          connected: true,
          messages_today: 89,
          messages_pending: 3,
          last_connection: new Date().toISOString(),
          phone_number: '+55 11 98765-4321'
        },
        system: {
          uptime_hours: 168.5,
          cpu_usage_percent: 34,
          memory_usage_percent: 58,
          disk_usage_percent: 42
        }
      })
    } catch (error) {
      console.error('Erro ao carregar métricas NOC:', error)
    } finally {
      setLoading(false)
    }
  }

  // Dados para gráficos
  const usageData = [
    { name: 'CPU', value: metrics?.system.cpu_usage_percent || 0, color: '#3b82f6' },
    { name: 'Memória', value: metrics?.system.memory_usage_percent || 0, color: '#10b981' },
    { name: 'Disco', value: metrics?.system.disk_usage_percent || 0, color: '#f59e0b' }
  ]

  const llmUsagePercent = metrics ? (metrics.llm.tokens_used_today / metrics.llm.tokens_limit_daily) * 100 : 0
  const storagePercent = metrics ? (metrics.database.storage_used_gb / metrics.database.storage_total_gb) * 100 : 0

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-sm text-muted-foreground">Carregando métricas NOC...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/20 border border-purple-500/30">
            <Activity className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">NOC - Centro de Operações</h4>
            <p className="text-xs text-muted-foreground">
              Monitoramento em tempo real de infraestrutura e serviços
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-graphite-700 text-gold-500 focus:ring-gold-500 focus:ring-offset-0"
            />
            Auto-refresh
          </label>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            disabled={!autoRefresh}
            className="px-3 py-1.5 bg-graphite-900 border border-graphite-800 rounded-lg text-xs focus:outline-none focus:border-gold-500 disabled:opacity-50"
          >
            <option value={10}>10s</option>
            <option value={30}>30s</option>
            <option value={60}>1min</option>
            <option value={300}>5min</option>
          </select>
          <button
            onClick={loadMetrics}
            className="p-2 bg-graphite-800 hover:bg-graphite-700 rounded-lg transition-colors"
            title="Atualizar agora"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Database */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="card-premium p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
              Online
            </span>
          </div>
          <div>
            <h5 className="text-xs font-medium text-muted-foreground">Database</h5>
            <p className="text-2xl font-bold mt-1">{metrics?.database.connections}</p>
            <p className="text-xs text-muted-foreground mt-1">Conexões ativas</p>
          </div>
          <div className="pt-2 border-t border-graphite-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Queries/s</span>
              <span className="font-medium">{metrics?.database.queries_per_sec}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Latência média</span>
              <span className="font-medium">{metrics?.database.avg_query_time_ms}ms</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Storage</span>
              <span className="font-medium">
                {metrics?.database.storage_used_gb}GB / {metrics?.database.storage_total_gb}GB
              </span>
            </div>
            <div className="w-full bg-graphite-800 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all"
                style={{ width: `${storagePercent}%` }}
              />
            </div>
          </div>
        </motion.div>

        {/* API */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="card-premium p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
              <Cpu className="w-4 h-4 text-green-400" />
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
              Operacional
            </span>
          </div>
          <div>
            <h5 className="text-xs font-medium text-muted-foreground">API</h5>
            <p className="text-2xl font-bold mt-1">{metrics?.api.requests_per_min}</p>
            <p className="text-xs text-muted-foreground mt-1">Requisições/min</p>
          </div>
          <div className="pt-2 border-t border-graphite-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tempo resposta</span>
              <span className="font-medium">{metrics?.api.avg_response_time_ms}ms</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Taxa de erro</span>
              <span className="font-medium text-green-400">{metrics?.api.error_rate_percent}%</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Sessões ativas</span>
              <span className="font-medium">{metrics?.api.active_sessions}</span>
            </div>
          </div>
        </motion.div>

        {/* LLM */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="card-premium p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <Zap className="w-4 h-4 text-purple-400" />
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400">
              {metrics?.llm.provider}
            </span>
          </div>
          <div>
            <h5 className="text-xs font-medium text-muted-foreground">LLM / IA</h5>
            <p className="text-2xl font-bold mt-1">{metrics?.llm.requests_today}</p>
            <p className="text-xs text-muted-foreground mt-1">Requisições hoje</p>
          </div>
          <div className="pt-2 border-t border-graphite-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Model</span>
              <span className="font-medium">{metrics?.llm.model}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tokens hoje</span>
              <span className="font-medium">
                {(metrics?.llm.tokens_used_today || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Custo hoje</span>
              <span className="font-medium text-gold-400">
                ${metrics?.llm.cost_today_usd.toFixed(2)}
              </span>
            </div>
            <div className="w-full bg-graphite-800 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  llmUsagePercent > 80 ? 'bg-red-500' : llmUsagePercent > 60 ? 'bg-yellow-500' : 'bg-purple-500'
                }`}
                style={{ width: `${llmUsagePercent}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center mt-1">
              {llmUsagePercent.toFixed(1)}% do limite diário
            </p>
          </div>
        </motion.div>

        {/* WhatsApp */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="card-premium p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-green-600/20 border border-green-600/30">
              <MessageSquare className="w-4 h-4 text-green-400" />
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              metrics?.whatsapp.connected 
                ? 'bg-green-500/20 text-green-400' 
                : 'bg-red-500/20 text-red-400'
            }`}>
              {metrics?.whatsapp.connected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
          <div>
            <h5 className="text-xs font-medium text-muted-foreground">WhatsApp</h5>
            <p className="text-2xl font-bold mt-1">{metrics?.whatsapp.messages_today}</p>
            <p className="text-xs text-muted-foreground mt-1">Mensagens hoje</p>
          </div>
          <div className="pt-2 border-t border-graphite-800 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Pendentes</span>
              <span className="font-medium">{metrics?.whatsapp.messages_pending}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Número</span>
              <span className="font-medium">{metrics?.whatsapp.phone_number}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Última conexão</span>
              <span className="font-medium">
                {new Date(metrics?.whatsapp.last_connection || '').toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* System Resources */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Chart */}
        <div className="card-premium p-5">
          <h5 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gold-500" />
            Uso de Recursos do Sistema
          </h5>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={usageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="name" stroke="#666" style={{ fontSize: 12 }} />
              <YAxis stroke="#666" style={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: 8
                }}
              />
              <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                {usageData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-graphite-900/50 rounded-lg">
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="text-sm font-bold mt-1">
                {Math.floor((metrics?.system.uptime_hours || 0) / 24)}d {Math.floor((metrics?.system.uptime_hours || 0) % 24)}h
              </p>
            </div>
            <div className="text-center p-2 bg-graphite-900/50 rounded-lg">
              <p className="text-xs text-muted-foreground">CPU</p>
              <p className="text-sm font-bold mt-1">{metrics?.system.cpu_usage_percent}%</p>
            </div>
            <div className="text-center p-2 bg-graphite-900/50 rounded-lg">
              <p className="text-xs text-muted-foreground">RAM</p>
              <p className="text-sm font-bold mt-1">{metrics?.system.memory_usage_percent}%</p>
            </div>
          </div>
        </div>

        {/* WhatsApp Config */}
        <div className="card-premium p-5">
          <h5 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-gold-500" />
            Configurações WhatsApp
          </h5>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Número de Telefone
              </label>
              <input
                type="text"
                value={metrics?.whatsapp.phone_number}
                disabled
                className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-2">
                Status da Conexão
              </label>
              <div className="flex items-center gap-3 p-3 bg-graphite-900 border border-graphite-800 rounded-xl">
                <div className={`w-3 h-3 rounded-full ${
                  metrics?.whatsapp.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`} />
                <span className="text-sm">
                  {metrics?.whatsapp.connected ? 'Conectado e operacional' : 'Desconectado'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-graphite-900/50 rounded-xl">
                <p className="text-xs text-muted-foreground">Mensagens Hoje</p>
                <p className="text-lg font-bold mt-1">{metrics?.whatsapp.messages_today}</p>
              </div>
              <div className="p-3 bg-graphite-900/50 rounded-xl">
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-lg font-bold mt-1">{metrics?.whatsapp.messages_pending}</p>
              </div>
            </div>

            <button className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Reconectar WhatsApp
            </button>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-200">
                Para conectar um novo dispositivo, escaneie o QR Code gerado pelo sistema.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LLM Config */}
      <div className="card-premium p-5">
        <h5 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-gold-500" />
          Configurações de IA / LLM
        </h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Provider
            </label>
            <select className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="google">Google (Gemini)</option>
              <option value="azure">Azure OpenAI</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Modelo
            </label>
            <select className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20">
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              <option value="claude-3-opus">Claude 3 Opus</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              API Key
            </label>
            <input
              type="password"
              placeholder="sk-..."
              className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Limite Diário de Tokens
            </label>
            <input
              type="number"
              defaultValue={1000000}
              className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Instruções do Sistema (System Prompt)
            </label>
            <textarea
              rows={4}
              placeholder="Você é um assistente financeiro especializado..."
              className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20 font-mono"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <button className="flex-1 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-graphite-900 rounded-xl text-sm font-medium transition-colors">
              Salvar Configurações
            </button>
            <button className="px-4 py-2.5 bg-graphite-800 hover:bg-graphite-700 text-foreground rounded-xl text-sm font-medium transition-colors">
              Testar Conexão
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
