import { useState } from 'react';
import { Star, X, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AIStreamingPanel } from './AIStreamingPanel';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';

export const AIAdvancedButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const { canView } = usePermissions();

  if (!canView('view_ai')) {
    return null;
  }

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 text-white rounded-full p-4 shadow-2xl hover:shadow-purple-500/25 transition-all duration-300 z-40 group"
      >
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <Star className="w-6 h-6 group-hover:animate-pulse" />
        </motion.div>
        
        {/* Tooltip */}
        <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
            IA Avançada
          </div>
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 border-l border-gray-200 dark:border-gray-700"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Star className="w-6 h-6 text-purple-600 animate-pulse" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      IA Avançada
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.name} • {user?.role === 'admin' ? 'Admin' : user?.role === 'franchisee' ? 'Franqueado' : 'Cliente'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-white/20 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="Configurações"
                  >
                    <Settings className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/20 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    title="Fechar"
                  >
                    <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </motion.button>
                </div>
              </div>
              
              {/* Content */}
              <AIStreamingPanel />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};