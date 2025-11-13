import { useMemo } from 'react'
import { Card } from './ui/card'

export function AdminCockpit() {
  const stats = useMemo(()=>({ users: 3, companies: 3, newsItems: 6, indicators: 5 }),[])
  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Usuários</p><p className="text-sm font-semibold">{stats.users}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Empresas</p><p className="text-sm font-semibold">{stats.companies}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Notícias</p><p className="text-sm font-semibold">{stats.newsItems}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Indicadores</p><p className="text-sm font-semibold">{stats.indicators}</p></Card>
      </div>
      <div className="rounded-3xl bg-card border border-border shadow-card p-4">
        <p className="text-sm text-muted-foreground">Gestão de Usuários e Permissões • Mock</p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card className="p-4"><p className="text-xs text-muted-foreground">Criar usuário</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Alterar permissões</p></Card>
        </div>
      </div>
    </div>
  )
}

