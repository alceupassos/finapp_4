import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface ProcessingStatsCardProps {
  payments: number;
  receipts: number;
  paymentsChange: number;
  receiptsChange: number;
}

const mockData = [
  { value: 42 },
  { value: 48 },
  { value: 45 },
  { value: 52 },
  { value: 58 },
  { value: 65 },
  { value: 70 },
];

export function ProcessingStatsCard({ payments, receipts, paymentsChange, receiptsChange }: ProcessingStatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="neomorphic neomorphic-hover border border-graphite-800/30 rounded-3xl p-6 overflow-hidden relative group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-graphite-400">Processamento</h3>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <span className="text-lg">📊</span>
          </div>
        </div>

        <div className="space-y-3">
          {/* Pagamentos */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-graphite-400 mb-0.5">Pagamentos</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white">{payments.toLocaleString()}</p>
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  paymentsChange >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {paymentsChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(paymentsChange)}%
                </div>
              </div>
            </div>
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData}>
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recebimentos */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-graphite-400 mb-0.5">Recebimentos</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold text-white">{receipts.toLocaleString()}</p>
                <div className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold ${
                  receiptsChange >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {receiptsChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(receiptsChange)}%
                </div>
              </div>
            </div>
            <div className="w-16 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockData}>
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
