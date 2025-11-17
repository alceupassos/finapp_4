import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Bank {
  name: string;
  value: number;
  color: string;
  icon: string;
}

const banks: Bank[] = [
  { name: 'Bradesco', value: 38, color: '#ef4444', icon: '🏦' },
  { name: 'Itaú', value: 32, color: '#f59e0b', icon: '🏛️' },
  { name: 'Santander', value: 20, color: '#3b82f6', icon: '🏢' },
  { name: 'Outros', value: 10, color: '#6b7280', icon: '💼' },
];

const chartData = banks.map(bank => ({ name: bank.name, value: bank.value }));

export function BanksCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="neomorphic neomorphic-hover border border-graphite-800/30 rounded-3xl p-6 overflow-hidden relative group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/5 to-transparent rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-graphite-400">Bancos</h3>
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <span className="text-lg">🏦</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mini Pie Chart */}
          <div className="w-20 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={12}
                  outerRadius={35}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {banks.map((bank, index) => (
                    <Cell key={`cell-${index}`} fill={bank.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex-1 space-y-2">
            {banks.map((bank, idx) => (
              <motion.div
                key={bank.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + idx * 0.08 }}
                className="flex items-center gap-2"
              >
                <div 
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: bank.color }}
                />
                <span className="text-xs text-graphite-300 flex-1">{bank.name}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-white">{bank.value}%</span>
                  <span className="text-sm">{bank.icon}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
