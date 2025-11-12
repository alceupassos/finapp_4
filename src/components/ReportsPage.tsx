export function ReportsPage() {
  return (
    <div className="grid gap-6">
      <div className="card-premium p-6">
        <p className="text-sm text-muted-foreground">Relatórios Gerenciais</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          {['DRE Consolidada','Fluxo de Caixa','Receita por Cliente'].map((t)=>(
            <div key={t} className="p-4 rounded-xl bg-graphite-900 border border-graphite-800">
              <p className="text-sm">{t}</p>
              <p className="text-xs text-muted-foreground">Mock</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

