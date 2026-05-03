'use client';

import { store } from "@/store";
import { Move, Rotate3D, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useSnapshot } from "valtio";
import { useEffect, useCallback } from "react";

export function HintScreen() {
  const snap = useSnapshot(store);

  const handleDismiss = useCallback(() => {
    store.hints = false;
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape' && snap.hints) {
      handleDismiss();
    }
  }, [snap.hints, handleDismiss]);

  useEffect(() => {
    if (snap.hints) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [snap.hints, handleKeyDown]);

  return (
    <AnimatePresence>
      {snap.hints && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, x: 0 }}
            animate={{ scale: 1, opacity: 1, x: '-0%' }}
            exit={{ scale: 0.9, opacity: 0, x: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 max-w-2xl mx-4 border border-white/20"
            style={{ left: '-300px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              aria-label="Закрыть подсказки"
            >
              <X size={20} className="text-white" />
            </button>

            <div className="text-center space-y-6">
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Управление сценой
              </h2>
              <p className="text-white/70 text-sm">
                Основные жесты для навигации в 3D-пространстве
              </p>

              {/* Controls grid - slightly tighter gap */}
              <div className="flex flex-col sm:flex-row gap-5 justify-center items-stretch">
                <div className="flex-1 bg-white/5 rounded-2xl p-5 backdrop-blur-sm border border-white/10 transition hover:bg-white/10">
                  <div className="flex justify-center mb-3">
                    <div className="p-2.5 bg-white/10 rounded-full">
                      <Rotate3D size={40} className="text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Вращение
                  </h3>
                  <p className="text-white/60 text-xs">
                    Левая кнопка мыши + перетаскивание
                  </p>
                </div>

                <div className="flex-1 bg-white/5 rounded-2xl p-5 backdrop-blur-sm border border-white/10 transition hover:bg-white/10">
                  <div className="flex justify-center mb-3">
                    <div className="p-2.5 bg-white/10 rounded-full">
                      <Move size={40} className="text-white" />
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-1">
                    Перемещение
                  </h3>
                  <p className="text-white/60 text-xs">
                    Правая кнопка мыши + перетаскивание
                  </p>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="mt-2 px-8 py-2.5 bg-white text-gray-900 font-semibold rounded-xl shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                Понятно, приступаем
              </button>

              <p className="text-white/40 text-xs">
                Нажмите Esc или кликните вне окна, чтобы закрыть
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}