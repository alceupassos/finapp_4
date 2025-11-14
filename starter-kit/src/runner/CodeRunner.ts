import { spawn } from 'child_process'
import { TaskInput, TaskResult } from './Task'
import { logger } from '../utils/logger'

export async function runTask(input: TaskInput): Promise<TaskResult> {
  const start = Date.now()
  const cmd = input.name
  const args = input.args ? JSON.stringify(input.args) : '{}'
  const child = spawn('node', ['-e', `console.log(${args})`], { stdio: ['ignore', 'pipe', 'pipe'] })
  let stdout = ''
  let stderr = ''
  const timeoutMs = input.timeoutMs ?? 10000
  const timer = setTimeout(() => {
    try { child.kill('SIGKILL') } catch {}
  }, timeoutMs)
  child.stdout.on('data', d => { stdout += d.toString() })
  child.stderr.on('data', d => { stderr += d.toString() })
  const code: number = await new Promise(resolve => child.on('close', c => resolve(typeof c === 'number' ? c : 0)))
  clearTimeout(timer)
  const durationMs = Date.now() - start
  const success = code === 0
  logger.info({ cmd, durationMs, success })
  return { name: cmd, success, code, stdout, stderr, durationMs }
}