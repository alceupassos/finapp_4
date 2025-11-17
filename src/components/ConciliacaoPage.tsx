import { ModernTransactionsTable } from './ModernTransactionsTable'

export function ConciliacaoPage() {
  return (
    <div className="grid gap-6">
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Extrato de Lançamentos • Dados Reais</p>
        <p className="text-xs text-muted-foreground">Registros financeiros consultados via Supabase</p>
      </div>
      <ModernTransactionsTable />
    </div>
  )
}

