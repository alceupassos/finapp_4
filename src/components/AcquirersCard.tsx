import { motion } from 'framer-motion';
import { BarChart, Bar, ResponsiveContainer } from 'recharts';

interface Acquirer {
  name: string;
  value: number;
  color: string;
}

const acquirers: Acquirer[] = [
  { name: 'Stone', value: 35, color: '#10b981' },
  { name: 'Cielo', value: 28, color: '#3b82f6' },
  { name: 'Rede', value: 22, color: '#f59e0b' },
  { name: 'GetNet', value: 15, color: '#8b5cf6' },
];

const chartData = [
  { name: 'Jan', stone: 32, cielo: 25, rede: 20, getnet: 12 },
  { name: 'Fev', stone: 34, cielo: 27, rede: 21, getnet: 14 },
  { name: 'Mar', stone: 35, cielo: 28, rede: 22, getnet: 15 },
];

export function AcquirersCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="neomorphic neomorphic-hover border border-graphite-800/30 rounded-3xl p-6 overflow-hidden relative group"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/5 to-transparent rounded-full blur-2xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-graphite-400">Adquirentes</h3>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <span className="text-lg">💳</span>
          </div>
        </div>

        <div className="space-y-2.5 mb-4">
          {acquirers.map((acquirer, idx) => (
            <div key={acquirer.name} className="flex items-center gap-2">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-graphite-300 font-medium">{acquirer.name}</span>
                  <span className="text-xs font-bold text-white">{acquirer.value}%</span>
                </div>
                <div className="h-1.5 bg-graphite-900 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${acquirer.value}%` }}
                    transition={{ delay: 0.4 + idx * 0.1, duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: acquirer.color }}
                  />
                </div>
              </div>
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: acquirer.color }}
              />
            </div>
          ))}
        </div>

        <div className="h-16 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <Bar dataKey="stone" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="cielo" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="rede" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="getnet" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}
