import { useMemo } from 'react'
import { Receipt, AlertCircle, TrendingDown, Clock } from 'lucide-react'

interface APagarReceberCardsProps {
  cnpj: string | string[]
}

export function APagarReceberCards({ cnpj }: APagarReceberCardsProps) {
  const [data, loading] = useMemo(() => {
    // TODO: Buscar dados reais
    const mockData = {
      valorAberto: 493961.66,
      atrasado: 139.79,
      pagosAtraso: 0.88,
      mediaDias: 0,
      inadimplencia: 0.0,
    }
    return [mockData, false]
  }, [cnpj])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card-premium p-4">
            <p className="text-sm text-muted-foreground">Carregando...</p>
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      title: 'Valor em Aberto',
      value: data.valorAberto,
      icon: Receipt,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Atrasado',
      value: data.atrasado,
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
    {
      title: 'Pagos em Atraso',
      value: data.pagosAtraso,
      suffix: '%',
      icon: TrendingDown,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
    },
    {
      title: 'Média de Dias p/ Pagamento',
      value: data.mediaDias,
      icon: Clock,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Inadimplência',
      value: data.inadimplencia,
      suffix: '%',
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <div key={idx} className={`card-premium p-4 ${card.bgColor}`}>
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-5 h-5 ${card.color}`} />
              <span className="text-xs text-muted-foreground">{card.title}</span>
            </div>
            <p className={`text-lg font-semibold ${card.color}`}>
              {typeof card.value === 'number' && card.value >= 1000 && !card.suffix
                ? `R$ ${(card.value / 1000).toFixed(1)}k`
                : card.suffix
                ? `${card.value.toFixed(2)}${card.suffix}`
                : `R$ ${card.value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            </p>
          </div>
        )
      })}
    </div>
  )
}

