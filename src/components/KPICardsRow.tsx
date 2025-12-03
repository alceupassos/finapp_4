import { AnimatedKPICard } from './AnimatedKPICard'

interface KPICardsRowProps {
  receitaBruta: number
  impostos: number
  lucroBruto: number
  ebitda: number
  lucroLiquido: number
}

import { formatCurrency } from '../lib/formatters'

export function KPICardsRow({
  receitaBruta,
  impostos,
  lucroBruto,
  ebitda,
  lucroLiquido,
}: KPICardsRowProps) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Receita Bruta - Verde */}
      <AnimatedKPICard
        title="Receita Bruta"
        value={formatCurrency(receitaBruta)}
        change={receitaBruta > 0 ? 12 : 0}
        icon="TrendingUp"
        trend="up"
        color="green"
        delay={0}
      />

      {/* Impostos - Vermelho */}
      <AnimatedKPICard
        title="Impostos"
        value={formatCurrency(impostos)}
        change={impostos > 0 ? -5 : 0}
        icon="TrendingDown"
        trend="down"
        color="red"
        delay={0.1}
      />

      {/* Lucro Bruto - Verde/Vermelho conforme sinal */}
      <AnimatedKPICard
        title="Lucro Bruto"
        value={formatCurrency(lucroBruto)}
        change={lucroBruto > 0 ? 15 : -10}
        icon="Wallet"
        trend={lucroBruto > 0 ? 'up' : 'down'}
        color={lucroBruto > 0 ? 'green' : 'red'}
        delay={0.2}
      />

      {/* EBITDA - Azul */}
      <AnimatedKPICard
        title="EBITDA"
        value={formatCurrency(ebitda)}
        change={ebitda > 0 ? 18 : -8}
        icon="Target"
        trend={ebitda > 0 ? 'up' : 'down'}
        color="blue"
        delay={0.3}
      />

      {/* Lucro Líquido - Verde/Vermelho conforme sinal */}
      <AnimatedKPICard
        title="Lucro Líquido"
        value={formatCurrency(lucroLiquido)}
        change={lucroLiquido > 0 ? 20 : -12}
        icon="Wallet"
        trend={lucroLiquido > 0 ? 'up' : 'down'}
        color={lucroLiquido > 0 ? 'green' : 'red'}
        delay={0.4}
      />
    </div>
  )
}

