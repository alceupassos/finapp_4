export function getEnv(name: string, fallback = ''): string {
  const v = process.env[name]
  return v && v.trim() ? v : fallback
}