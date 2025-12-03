import { useEffect, useState } from 'react'
import { Key, UploadCloud, Shield, Download } from 'lucide-react'
import { SupabaseRest } from '../services/supabaseRest'

type ParsedKey = { name: string; value: string; origin: 'Supabase' | 'Env' | 'Upload' }

function mask(value: string) {
  if (!value) return ''
  const len = value.length
  const tail = value.slice(-4)
  return '*'.repeat(Math.max(0, len - 4)) + tail
}

export function AdminKeysTab() {
  const [envKeys, setEnvKeys] = useState<ParsedKey[]>([])
  const [uploadedKeys, setUploadedKeys] = useState<ParsedKey[]>([])
  const [exportReady, setExportReady] = useState<string>('')
  const [fromSupabase, setFromSupabase] = useState<boolean>(false)
  const [showValues, setShowValues] = useState<boolean>(false)

  useEffect(() => {
    (async () => {
      const secrets = await SupabaseRest.getMaskedSecrets()
      if (secrets.length) {
        setFromSupabase(true)
        setEnvKeys(secrets.map(s => ({ name: s.name, value: s.value, origin: 'Supabase' })))
        return
      }
      const entries: ParsedKey[] = Object.entries(import.meta.env as any)
        .filter(([k]) => k.startsWith('VITE_'))
        .map(([name, value]) => ({ name, value: String(value ?? ''), origin: 'Env' as const }))
      setEnvKeys(entries)
    })()
  }, [])

  const handleFile = async (file: File) => {
    const text = await file.text()
    const results: ParsedKey[] = []
    const lines = text.split(/\r?\n/)
    for (const line of lines) {
      const mEq = line.match(/\b([A-Z0-9_]{3,})\b\s*[=:]\s*([^\s#]+)/)
      if (mEq) {
        results.push({ name: mEq[1], value: mEq[2], origin: 'Upload' })
        continue
      }
      const mJson = line.match(/"([A-Za-z0-9_\-]+)"\s*:\s*"([^"]+)"/)
      if (mJson) {
        results.push({ name: mJson[1], value: mJson[2], origin: 'Upload' })
      }
    }
    setUploadedKeys(results)

    const linesOut = results.map(k => `${k.name}=${k.value}`)
    setExportReady(linesOut.join('\n'))
  }

  const exportSupabaseEnv = () => {
    const all = uploadedKeys.length ? uploadedKeys : []
    const lines = all.map(k => `${k.name}=${k.value}`)
    const header = '# Supabase Secrets (.env) — use com: supabase secrets set --env-file supabase-secrets.env\n'
    const content = header + lines.join('\n') + '\n'
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'supabase-secrets.env'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/30">
            <Key className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Chaves e Credenciais</h4>
            <p className="text-xs text-muted-foreground">Visualização segura de variáveis e importação de arquivo</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={showValues} onChange={(e) => setShowValues(e.target.checked)} />
          Mostrar valores mascarados
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-premium p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            <h5 className="text-xs font-semibold">Variáveis de Ambiente</h5>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-graphite-900/50 border-b border-graphite-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs">Nome</th>
                  <th className="px-3 py-2 text-left text-xs">Origem</th>
                  {showValues && <th className="px-3 py-2 text-left text-xs">Valor (mascarado)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-800">
                {envKeys.map(k => (
                  <tr key={k.name}>
                    <td className="px-3 py-2 text-sm font-medium">{k.name}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{k.origin}</td>
                    {showValues && <td className="px-3 py-2 text-xs text-muted-foreground">{mask(k.value)}</td>}
                  </tr>
                ))}
                {envKeys.length === 0 && (
                  <tr>
                    <td className="px-3 py-2 text-sm" colSpan={3}>Nenhuma variável VITE_ detectada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-premium p-5 space-y-4">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-4 h-4" />
            <h5 className="text-xs font-semibold">Importar arquivo de chaves</h5>
          </div>
          <input
            type="file"
            accept=".md,.env,.json,.txt"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            className="w-full text-xs"
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-graphite-900/50 border-b border-graphite-800">
                <tr>
                  <th className="px-3 py-2 text-left text-xs">Nome</th>
                  {showValues && <th className="px-3 py-2 text-left text-xs">Valor (mascarado)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-800">
                {uploadedKeys.map(k => (
                  <tr key={`${k.name}-${k.value.slice(-4)}`}>
                    <td className="px-3 py-2 text-sm font-medium">{k.name}</td>
                    {showValues && <td className="px-3 py-2 text-xs text-muted-foreground">{mask(k.value)}</td>}
                  </tr>
                ))}
                {uploadedKeys.length === 0 && (
                  <tr>
                    <td className="px-3 py-2 text-sm" colSpan={2}>Nenhuma chave carregada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={exportSupabaseEnv}
              disabled={fromSupabase && uploadedKeys.length === 0}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm ${fromSupabase && uploadedKeys.length === 0 ? 'bg-graphite-800/50 cursor-not-allowed' : 'bg-graphite-800 hover:bg-graphite-700'}`}
              title="Exportar .env para Supabase CLI"
            >
              <Download className="w-4 h-4" />
              Exportar .env
            </button>
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">Use o Supabase para armazenar segredos. Em produção, mantenha valores ocultos e rotacione periodicamente.</div>
    </div>
  )
}
