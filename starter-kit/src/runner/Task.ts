export type TaskInput = {
  name: string
  args?: Record<string, unknown>
  timeoutMs?: number
}

export type TaskResult = {
  name: string
  success: boolean
  code?: number
  stdout?: string
  stderr?: string
  durationMs: number
}