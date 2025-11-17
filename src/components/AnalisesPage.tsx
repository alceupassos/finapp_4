import { DashboardOverview } from './DashboardOverview'
import { ModernCashflowChart } from './ModernCashflowChart'
import { DREMonthlyTable } from './DREMonthlyTable'

export function AnalisesPage() {
  return (
    <div className="grid gap-6">
      <DashboardOverview period={'Ano'} />
      <DREMonthlyTable />
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">KPIs complementares</p>
        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ModernCashflowChart period={'Mês'} />
          <ModernCashflowChart period={'Semana'} />
        </div>
      </div>
    </div>
  )
}

