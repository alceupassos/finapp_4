import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'

function sh(cmd) {
  try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' }
}

function readFileSafe(p) {
  try { return fs.readFileSync(p, 'utf8') } catch { return '' }
}

function maskEnv(content) {
  const out = {}
  content.split('\n').filter(Boolean).forEach(line => {
    const i = line.indexOf('=')
    if (i === -1) return
    const k = line.slice(0, i).trim()
    const v = line.slice(i + 1).trim()
    const keep = /^VITE_.*(URL|HOST|PATH)$/i.test(k)
    out[k] = keep ? v : '***'
  })
  return out
}

async function devStatus() {
  try {
    const r = await fetch('http://localhost:3000/', { method: 'GET' })
    return { reachable: r.ok, status: r.status }
  } catch {
    return { reachable: false }
  }
}

async function snapshotOnce() {
  const projectRoot = process.cwd()
  const ts = new Date()
  const stamp = ts.toISOString().replace(/[-:TZ]/g, '').slice(0, 14)
  const dir = path.join(projectRoot, 'var', 'snapshots')
  fs.mkdirSync(dir, { recursive: true })

  const pkg = readFileSafe(path.join(projectRoot, 'package.json'))
  const vite = readFileSafe(path.join(projectRoot, 'vite.config.ts'))
  const envLocal = readFileSafe(path.join(projectRoot, '.env.local'))
  const envProd = readFileSafe(path.join(projectRoot, '.env.production'))

  const snapshot = {
    meta: {
      timestamp: ts.toISOString(),
      project: path.basename(projectRoot)
    },
    git: {
      branch: sh('git rev-parse --abbrev-ref HEAD'),
      status: sh('git status -sb'),
      diffStat: sh('git diff --stat'),
      recent: sh('git log -n 10 --pretty=%h|%ad|%s --date=iso').split('\n').filter(Boolean)
    },
    devServer: await devStatus(),
    project: {
      packageJson: pkg ? JSON.parse(pkg) : null,
      viteConfig: vite
    },
    env: {
      local: maskEnv(envLocal),
      production: maskEnv(envProd)
    }
  }

  const file = path.join(dir, `${stamp}.json`)
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2))
  process.stdout.write(file + '\n')
}

function runWatch() {
  process.stdout.write('[snapshot] watch mode on\n')
  const min = parseInt(process.env.SNAPSHOT_INTERVAL_MIN || '10', 10)
  setInterval(() => { snapshotOnce().catch(()=>{}) }, min * 60 * 1000)
  function watchEnv(file) {
    try {
      let last = 0
      fs.watch(file, { persistent: true }, () => {
        const now = Date.now()
        if (now - last > 5000) { last = now; snapshotOnce().catch(()=>{}) }
      })
    } catch {}
  }
  watchEnv('.env.local')
  watchEnv('.env.production')
  let prev = null
  async function tick() {
    try {
      const r = await fetch('http://localhost:3000/')
      const ok = r.ok
      if (prev === null) prev = ok
      if (prev && !ok) snapshotOnce().catch(()=>{})
      prev = ok
    } catch {
      if (prev === null) prev = false
      if (prev) { snapshotOnce().catch(()=>{}) ; prev = false }
    }
  }
  setInterval(tick, 30000)
}

if (process.argv.includes('--watch')) runWatch(); else snapshotOnce()
