import http from 'node:http'
import { URL } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

function send(res, status, data) {
  const body = typeof data === 'string' ? data : JSON.stringify(data)
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(body)
}

async function handleWebhook(payload) {
  const record = {
    source: 'whatsapp',
    action: 'webhook_received',
    status: 'received',
    details: payload,
    created_at: new Date().toISOString(),
  }
  if (!supabase) return
  try {
    await supabase.from('app_logs').insert(record)
  } catch {}
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  if (req.method === 'GET' && url.pathname === '/health') {
    return send(res, 200, { status: 'ok', port })
  }
  if (req.method === 'POST' && (url.pathname === '/webhook/whatsapp' || url.pathname === '/webhook/wasender')) {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end', async () => {
      try {
        const payload = JSON.parse(data || '{}')
        await handleWebhook(payload)
        return send(res, 200, { success: true })
      } catch {
        return send(res, 400, { error: 'invalid_json' })
      }
    })
    return
  }
  send(res, 404, { error: 'not_found' })
})

server.listen(port, () => {})