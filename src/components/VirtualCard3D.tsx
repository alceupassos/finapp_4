import { motion } from 'framer-motion';
import { Eye, EyeOff, CreditCard, Copy } from 'lucide-react';
import { useState } from 'react';

export function VirtualCard3D() {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3 }}
      className="neomorphic rounded-3xl p-8 border border-graphite-800/30"
    >
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white font-display mb-1">Cartão Corporativo</h3>
        <p className="text-sm text-graphite-400">Limite e saldo disponível</p>
      </div>

      <motion.div
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="relative preserve-3d cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Front Side */}
        <motion.div
          className="backface-hidden relative"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="bg-gradient-to-br from-gold-500 via-gold-600 to-gold-700 rounded-2xl p-8 shadow-2xl shadow-gold-500/20 relative overflow-hidden group">
            {/* Animated Background Pattern */}
            <motion.div
              className="absolute inset-0 opacity-20"
              animate={{
                backgroundPosition: ['0% 0%', '100% 100%'],
              }}
              transition={{
                duration: 20,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }}
            />

            {/* Glow Effect */}
            <motion.div
              className="absolute -inset-1 bg-gradient-to-r from-gold-400 to-gold-600 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500"
              style={{ zIndex: -1 }}
            />

            {/* Header */}
            <div className="relative z-10 flex items-start justify-between mb-8">
              <div>
                <p className="text-xs text-white/70 font-medium mb-1">Conta Empresarial</p>
                <motion.p
                  className="text-2xl font-bold text-white font-display"
                  animate={{ opacity: showBalance ? 1 : 0 }}
                >
                  {showBalance ? 'R$ 2.847.920,00' : '•••••••'}
                </motion.p>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBalance(!showBalance);
                }}
                className="p-2 rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
              >
                {showBalance ? (
                  <Eye className="w-5 h-5 text-white" />
                ) : (
                  <EyeOff className="w-5 h-5 text-white" />
                )}
              </motion.button>
            </div>

            {/* Chip */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="w-12 h-10 rounded-lg bg-gradient-to-br from-yellow-200 to-yellow-400 mb-8 relative overflow-hidden"
            >
              <div className="absolute inset-1 border border-yellow-600/30 rounded-md" />
              <div className="absolute inset-2 border border-yellow-600/20 rounded-sm" />
            </motion.div>

            {/* Card Number */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-white text-lg font-mono tracking-wider">
                  •••• •••• •••• 8492
                </span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={(e) => e.stopPropagation()}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <Copy className="w-4 h-4 text-white" />
                </motion.button>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-white/70 mb-1">Titular</p>
                <p className="text-sm font-semibold text-white">BPO FINANCIAL LTDA</p>
              </div>

              <div className="text-right">
                <p className="text-xs text-white/70 mb-1">Validade</p>
                <p className="text-sm font-semibold text-white">12/28</p>
              </div>

              <motion.div
                whileHover={{ scale: 1.1 }}
                className="flex flex-col items-end"
              >
                <CreditCard className="w-8 h-8 text-white/90" />
                <span className="text-[10px] text-white/70 font-bold mt-1">CORPORATE</span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Back Side */}
        <motion.div
          className="absolute inset-0 backface-hidden"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          <div className="bg-gradient-to-br from-charcoal-900 to-charcoal-950 rounded-3xl p-6 shadow-2xl h-full">
            {/* Magnetic Stripe */}
            <div className="w-full h-12 bg-gradient-to-r from-graphite-900 to-graphite-800 mt-4 mb-6 rounded-lg" />

            {/* CVV */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/70 mb-1">CVV</p>
                  <p className="text-lg font-mono font-bold text-white">•••</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/70 mb-1">Código de Segurança</p>
                  <p className="text-xs text-white/50">Não compartilhe</p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-3 text-xs text-white/60">
              <p>Este cartão é de uso exclusivo corporativo</p>
              <p>Em caso de perda, bloqueie imediatamente</p>
              <p className="text-gold-400 font-semibold">Suporte: 0800 XXX XXXX</p>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-white/50">Mastercard® Corporate</span>
              <span className="text-xs text-white/50">ID: #BPO-2024-8492</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Hint */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-xs text-graphite-400 mt-3"
      >
        Clique no cartão para visualizar o verso
      </motion.p>
    </motion.div>
  );
}
