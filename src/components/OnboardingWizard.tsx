import { useEffect, useState } from 'react'
import { CheckCircle2, ArrowRight, UserPlus, ShieldCheck, KeyRound } from 'lucide-react'
import { SupabaseRest } from '../services/supabaseRest'

type Step = 1 | 2 | 3 | 4

export function OnboardingWizard() {
  const [step, setStep] = useState<Step>(1)
  const [companies, setCompanies] = useState<Array<{ cnpj: string; cliente_nome: string; grupo_empresarial: string }>>([])
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([])
  const [userData, setUserData] = useState({ name: '', email: '', role: 'cliente', password: '' })
  const [rules, setRules] = useState({ accessAll: false, notifications: true, auditTrail: true })

  useEffect(() => {
    SupabaseRest.getCompanies().then(setCompanies).catch(() => {})
  }, [])

  const next = () => setStep((s) => (s < 4 ? ((s + 1) as Step) : s))
  const back = () => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold">Wizard de Onboarding</h4>
          <p className="text-xs text-muted-foreground">Configuração inicial para novos projetos ou ajustes</p>
        </div>
      </div>

      <div className="card-premium p-5">
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              <h5 className="text-xs font-semibold">Seleção de Empresas</h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
              {companies.map((c) => (
                <label key={c.cnpj} className="flex items-start gap-3 p-2 rounded-lg hover:bg-graphite-800/50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedCompanies.includes(c.cnpj)}
                    onChange={() => {
                      setSelectedCompanies((prev) =>
                        prev.includes(c.cnpj) ? prev.filter((x) => x !== c.cnpj) : [...prev, c.cnpj]
                      )
                    }}
                    className="mt-0.5 w-4 h-4 rounded border-graphite-700 text-gold-500"
                  />
                  <div>
                    <div className="text-sm font-medium">{c.cliente_nome}</div>
                    <div className="text-xs text-muted-foreground">CNPJ: {c.cnpj} • {c.grupo_empresarial}</div>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <button onClick={next} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-graphite-900 rounded-xl text-sm font-medium flex items-center gap-2">
                Próximo
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              <h5 className="text-xs font-semibold">Criação de Usuário</h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                placeholder="Nome"
                value={userData.name}
                onChange={(e) => setUserData({ ...userData, name: e.target.value })}
                className="px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm"
              />
              <input
                placeholder="Email"
                value={userData.email}
                onChange={(e) => setUserData({ ...userData, email: e.target.value })}
                className="px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm"
              />
              <select
                value={userData.role}
                onChange={(e) => setUserData({ ...userData, role: e.target.value })}
                className="px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm"
              >
                <option value="cliente">Cliente</option>
                <option value="franqueado">Franqueado</option>
                <option value="admin">Administrador</option>
                <option value="personalizado">Personalizado</option>
              </select>
              <input
                type="password"
                placeholder="Senha"
                value={userData.password}
                onChange={(e) => setUserData({ ...userData, password: e.target.value })}
                className="px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm"
              />
            </div>
            <div className="flex justify-between">
              <button onClick={back} className="px-4 py-2 bg-graphite-800 hover:bg-graphite-700 rounded-xl text-sm">Voltar</button>
              <button onClick={next} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-graphite-900 rounded-xl text-sm font-medium">Próximo</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <h5 className="text-xs font-semibold">Regras de Acesso</h5>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={rules.accessAll} onChange={(e) => setRules({ ...rules, accessAll: e.target.checked })} />
                Acesso a todas as empresas
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={rules.notifications} onChange={(e) => setRules({ ...rules, notifications: e.target.checked })} />
                Notificações automáticas
              </label>
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={rules.auditTrail} onChange={(e) => setRules({ ...rules, auditTrail: e.target.checked })} />
                Auditoria de ações
              </label>
            </div>
            <div className="flex justify-between">
              <button onClick={back} className="px-4 py-2 bg-graphite-800 hover:bg-graphite-700 rounded-xl text-sm">Voltar</button>
              <button onClick={next} className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-graphite-900 rounded-xl text-sm font-medium">Próximo</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="text-sm">Revisão</div>
            <div className="text-xs text-muted-foreground">Empresas: {selectedCompanies.length}</div>
            <div className="text-xs text-muted-foreground">Usuário: {userData.email} • {userData.role}</div>
            <div className="flex justify-between">
              <button onClick={back} className="px-4 py-2 bg-graphite-800 hover:bg-graphite-700 rounded-xl text-sm">Voltar</button>
              <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-graphite-900 rounded-xl text-sm font-medium">Concluir</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

