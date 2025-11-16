import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Sparkles, Brain, Zap, X, Settings, ChevronRight, Activity } from 'lucide-react';
import { AIStreamingPanel } from './AIStreamingPanel';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export const ModernAIAdvancedButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const controls = useAnimation();
  const { user } = useAuth();
  const { canView } = usePermissions();

  useEffect(() => {
    if (isHovered) {
      controls.start({
        scale: [1, 1.1, 1],
        transition: { duration: 0.6, repeat: Infinity }
      });
    } else {
      controls.stop();
      controls.set({ scale: 1 });
    }
  }, [isHovered, controls]);

  if (!canView('view_ai')) {
    return null;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="fixed bottom-8 right-8 z-50"
      >
        <motion.button
          animate={controls}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          onClick={() => setIsOpen(true)}
          className="relative group"
        >
          {/* Background gradient animation */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 rounded-full blur-xl opacity-75 group-hover:opacity-100 transition-opacity"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          
          {/* Main button */}
          <motion.div
            className="relative bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 text-white rounded-full p-5 shadow-2xl backdrop-blur-sm border border-white/20"
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
            }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="relative">
              <Brain className="w-8 h-8 group-hover:animate-pulse" />
              <motion.div
                className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0.5, 1]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity
                }}
              />
            </div>
          </motion.div>

          {/* Floating particles */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-purple-400 rounded-full"
              style={{
                top: '50%',
                left: '50%',
              }}
              animate={{
                x: [0, Math.cos(i * 60 * Math.PI / 180) * 40],
                y: [0, Math.sin(i * 60 * Math.PI / 180) * 40],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeOut"
              }}
            />
          ))}

          {/* Tooltip */}
          <motion.div
            className="absolute bottom-full right-0 mb-3 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="bg-gradient-to-r from-purple-900 to-blue-900 text-white text-sm rounded-lg py-2 px-4 whitespace-nowrap shadow-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>IA Avançada</span>
              </div>
              <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-purple-900"></div>
            </div>
          </motion.div>
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Enhanced overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-gradient-to-br from-purple-900/50 via-blue-900/50 to-pink-900/50 backdrop-blur-md z-50"
            />

            {/* Modern panel */}
            <motion.div
              initial={{ x: 500, opacity: 0, rotateY: -15 }}
              animate={{ x: 0, opacity: 1, rotateY: 0 }}
              exit={{ x: 500, opacity: 0, rotateY: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-[450px] bg-gradient-to-br from-white/95 via-purple-50/95 to-blue-50/95 dark:from-gray-900/95 dark:via-purple-900/20 dark:to-blue-900/20 backdrop-blur-2xl shadow-2xl z-50 border-l border-white/20"
            >
              {/* Modern header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-between p-6 border-b border-white/20 bg-gradient-to-r from-purple-500/10 via-transparent to-blue-500/10"
              >
                <div className="flex items-center space-x-4">
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      duration: 4,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    className="relative"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full blur-lg opacity-50"></div>
                    <Brain className="w-8 h-8 text-purple-600 relative z-10" />
                  </motion.div>
                  
                  <div>
                    <motion.h3
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
                    >
                      IA Avançada
                    </motion.h3>
                    <motion.p
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1"
                    >
                      <Activity className="w-3 h-3" />
                      {user?.name} • {user?.role === 'admin' ? 'Administrador' : user?.role === 'franchisee' ? 'Franqueado' : 'Cliente'}
                    </motion.p>
                  </div>
                </div>
                
                <motion.div className="flex items-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-3 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full hover:shadow-lg transition-all duration-200"
                    title="Configurações"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(false)}
                    className="p-3 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-full hover:shadow-lg transition-all duration-200"
                    title="Fechar"
                  >
                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </motion.button>
                </motion.div>
              </motion.div>
              
              {/* Enhanced content area */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="h-full overflow-hidden"
              >
                <AIStreamingPanel />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};