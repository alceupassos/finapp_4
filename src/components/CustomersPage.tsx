const customers = Array.from({ length: 12 }).map((_, i) => ({ id: i+1, name: `Cliente ${i+1}`, cnpj: `00.000.000/000${i+1}-00`, revenue: Math.round(20000 + Math.random()*80000) }))

export function CustomersPage() {
  return (
    <div className="card-premium p-6">
      <p className="text-sm text-muted-foreground">Clientes • Mock</p>
      <div className="mt-4 rounded-2xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-graphite-900">
            <tr>
              <th className="text-left p-3">Cliente</th>
              <th className="text-left p-3">CNPJ</th>
              <th className="text-right p-3">Receita</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-3">{c.name}</td>
                <td className="p-3">{c.cnpj}</td>
                <td className="p-3 text-right">R$ {c.revenue.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

