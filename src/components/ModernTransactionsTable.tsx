import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, MoreVertical, Search } from 'lucide-react';

const transactions = [
  { id: 1, company: 'Shopify', amount: 145000, type: 'income', status: 'success', date: '12 Nov', icon: '🛒' },
  { id: 2, company: 'Stripe', amount: 89500, type: 'income', status: 'success', date: '12 Nov', icon: '💳' },
  { id: 3, company: 'AWS', amount: -32000, type: 'expense', status: 'success', date: '11 Nov', icon: '☁️' },
  { id: 4, company: 'Google Ads', amount: -45000, type: 'expense', status: 'pending', date: '11 Nov', icon: '📢' },
  { id: 5, company: 'Microsoft', amount: 125000, type: 'income', status: 'success', date: '10 Nov', icon: '💻' },
  { id: 6, company: 'Salesforce', amount: -18000, type: 'expense', status: 'failed', date: '10 Nov', icon: '⚡' },
  { id: 7, company: 'Adobe', amount: -28000, type: 'expense', status: 'success', date: '09 Nov', icon: '🎨' },
  { id: 8, company: 'Zoom', amount: -12000, type: 'expense', status: 'success', date: '09 Nov', icon: '📹' },
];

const statusConfig = {
  success: { label: 'Concluído', color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  pending: { label: 'Pendente', color: 'gold', bg: 'bg-gold-500/10', text: 'text-gold-400', border: 'border-gold-500/20' },
  failed: { label: 'Falhou', color: 'red', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export function ModernTransactionsTable() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="neomorphic neomorphic-hover border border-graphite-800/30 rounded-3xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-8 border-b border-graphite-800/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-white font-display">Transações Recentes</h3>
            <p className="text-sm text-graphite-400 mt-1">Últimas movimentações financeiras</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-graphite-400" />
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-9 pr-3 py-2 neomorphic-inset border border-graphite-800/20 rounded-xl text-sm text-white placeholder-graphite-500 focus:outline-none focus:border-gold-500 transition-all w-48"
              />
            </div>

            {/* Period Filter */}
            <select className="px-4 py-2 neomorphic-inset border border-graphite-800/20 rounded-xl text-sm text-white focus:outline-none focus:border-gold-500 transition-all">
              <option>Todos</option>
              <option>Hoje</option>
              <option>Esta Semana</option>
              <option>Este Mês</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-graphite-800">
              <th className="px-6 py-4 text-left text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Empresa
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Data
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Valor
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-semibold text-graphite-400 uppercase tracking-wider">
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => {
              const status = statusConfig[transaction.status as keyof typeof statusConfig];
              return (
                <motion.tr
                  key={transaction.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  whileHover={{ backgroundColor: 'rgba(255, 122, 0, 0.03)' }}
                  className="border-b border-graphite-800/50 last:border-0 transition-colors group"
                >
                  {/* Company */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-10 h-10 rounded-xl bg-gradient-to-br from-graphite-800 to-graphite-900 flex items-center justify-center text-xl group-hover:shadow-lg transition-shadow"
                      >
                        {transaction.icon}
                      </motion.div>
                      <div>
                        <p className="text-sm font-semibold text-white">{transaction.company}</p>
                        <p className="text-xs text-graphite-400">Pagamento {transaction.type === 'income' ? 'recebido' : 'enviado'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="px-6 py-4">
                    <p className="text-sm text-graphite-300">{transaction.date}</p>
                  </td>

                  {/* Amount */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-lg ${transaction.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                        {transaction.type === 'income' ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                      <span className={`text-sm font-bold ${transaction.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {transaction.amount > 0 ? '+' : ''}
                        {transaction.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-semibold border ${status.bg} ${status.text} ${status.border}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${status.text.replace('text-', 'bg-')} mr-2`} />
                      {status.label}
                    </motion.span>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2 rounded-lg hover:bg-graphite-800 text-graphite-400 hover:text-white transition-all"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </motion.button>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-graphite-800 flex items-center justify-between">
        <p className="text-sm text-graphite-400">
          Mostrando <span className="text-white font-semibold">8</span> de <span className="text-white font-semibold">142</span> transações
        </p>
        <div className="flex items-center gap-2">
          <button className="px-4 py-2 bg-graphite-800 hover:bg-graphite-700 text-white rounded-xl text-sm font-medium transition-colors">
            Anterior
          </button>
          <button className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-white rounded-xl text-sm font-medium transition-colors shadow-glow-sm">
            Próxima
          </button>
        </div>
      </div>
    </motion.div>
  );
}
