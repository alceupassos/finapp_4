import { useMemo, useState } from 'react'
import { Settings, Users, Activity, KeyRound, Database } from 'lucide-react'
import { AdminKeysTab } from './AdminKeysTab'
import { UserManagementTab } from './UserManagementTab'
import { NOCTab } from './NOCTab'
import { OnboardingWizard } from './OnboardingWizard'
import { RAGTab } from './RAGTab'

type Tab = 'Chaves' | 'Usuários' | 'NOC' | 'Onboarding' | 'RAG'

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('Chaves')
  const tabs = useMemo(() => (
    [
      { key: 'Chaves', icon: KeyRound },
      { key: 'Usuários', icon: Users },
      { key: 'NOC', icon: Activity },
      { key: 'Onboarding', icon: Settings },
      { key: 'RAG', icon: Database }
    ] as Array<{ key: Tab; icon: any }>
  ), [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gold-500/20 border border-gold-500/30">
            <Settings className="w-5 h-5 text-gold-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Administração</h4>
            <p className="text-xs text-muted-foreground">Chaves, usuários, NOC e onboarding</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${tab === t.key ? 'bg-gold-500 text-graphite-900 border-gold-500' : 'bg-graphite-900 text-foreground border-graphite-800'}`}
          >
            <t.icon className="w-4 h-4" />
            <span className="text-sm font-medium">{t.key}</span>
          </button>
        ))}
      </div>

      {tab === 'Chaves' && <AdminKeysTab />}
      {tab === 'Usuários' && <UserManagementTab />}
      {tab === 'NOC' && <NOCTab />}
      {tab === 'Onboarding' && <OnboardingWizard />}
      {tab === 'RAG' && <RAGTab />}
    </div>
  )
}
