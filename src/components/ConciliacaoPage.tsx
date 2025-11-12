import { ModernTransactionsTable } from './ModernTransactionsTable'

export function ConciliacaoPage() {
  return (
    <div className="grid gap-6">
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Conciliação Bancária • Mock</p>
        <p className="text-xs text-muted-foreground">Registros pendentes e reconciliados em destaque</p>
      </div>
      <ModernTransactionsTable />
    </div>
  )
}

