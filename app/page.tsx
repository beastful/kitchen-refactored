'use client'

import Configurator from '@/components/pages/connfigurator';
import Introduction from '@/components/pages/introduction';
import { store, setJson } from '@/store';
import React, { useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { AnimatePresence, motion } from "motion/react"
import { SnapProvider } from '@/snapping-tools/snap-provider';
import { useTexture } from '@react-three/drei';
import { loadProductFromBitrix, loadSharedFromBitrix } from '@/lib/get-states';

useTexture.preload('matcaps/mc1.png');
useTexture.preload('matcaps/mc2.png');
useTexture.preload('matcaps/mc3.png');

function getQueryParam(param: string): string | null {
    if (typeof window === 'undefined') return null;
    const search = window.location.search;
    if (!search) return null;
    const params = new URLSearchParams(search);
    return params.get(param);
}

function Home() {

    const [sceneReady, setSceneReady] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const snap = useSnapshot(store);

    useEffect(() => {
        const productId = getQueryParam('product_id');
        const stateId = getQueryParam('state_id');

        // Сохраняем origin родительского сайта для ссылки «Поделиться»
        const parentOrigin = getQueryParam('parent_origin');
        if (parentOrigin) {
            store.parentOrigin = parentOrigin;
        }

        // Если есть state_id — загружаем проект по ссылке (публичный доступ)
        if (stateId) {
            loadSharedFromBitrix(stateId, (stateData: unknown) => {
                try {
                    if (stateData && typeof stateData === 'object') {
                        setJson(JSON.stringify(stateData));
                    }
                    setSceneReady(true);
                } catch (e) {
                    console.error('[Home] Failed to hydrate store from shared scene:', e);
                    setLoadError('Не удалось загрузить проект');
                    setTimeout(() => setSceneReady(true), 3000);
                }
            });

            const fallbackTimer = setTimeout(() => {
                console.warn('[Home] Shared scene load timeout, opening empty scene');
                setLoadError('Загрузка заняла больше времени, чем ожидалось');
                setTimeout(() => setSceneReady(true), 3000);
            }, 10000);

            return () => clearTimeout(fallbackTimer);
        }

        if (productId) {
            loadProductFromBitrix(productId, (stateData: unknown) => {
                try {
                    if (stateData && typeof stateData === 'object') {
                        setJson(JSON.stringify(stateData));
                    }
                    setSceneReady(true);
                } catch (e) {
                    console.error('[Home] Failed to hydrate store from product:', e);
                    setLoadError('Не удалось загрузить конфигурацию кухни');
                    // Fall back to empty scene after showing error briefly
                    setTimeout(() => setSceneReady(true), 3000);
                }
            });

            const fallbackTimer = setTimeout(() => {
                console.warn('[Home] Product load timeout, opening empty scene');
                setLoadError('Загрузка заняла больше времени, чем ожидалось');
                setTimeout(() => setSceneReady(true), 3000);
            }, 10000);

            return () => clearTimeout(fallbackTimer);
        }

        // Ничего нет — просто открываем пустой конструктор
        setSceneReady(true);
    }, []);

    if (!sceneReady) {
        return (
            <div className="w-full h-[100vh] flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #faf0ea 0%, #f5e6d8 100%)' }}>
                <div className="flex flex-col items-center gap-6">
                    {/* Логотип */}
                    <img src="logo.png" alt="Ясная Мебель" className="h-10 mb-2" />
                    
                    {/* Спиннер */}
                    <div className="relative w-16 h-16">
                        <div className="absolute inset-0 rounded-full border-4 border-[#f0d5c0]"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#F06900] animate-spin"></div>
                    </div>
                    
                    {loadError ? (
                        <>
                            <p className="text-[#8B4513] text-lg font-medium">{loadError}</p>
                            <p className="text-[#a08070] text-sm">Откроется пустая сцена через несколько секунд</p>
                        </>
                    ) : (
                        <>
                            <p className="text-[#8B4513] text-lg font-medium">Загружаем конфигурацию кухни</p>
                            <p className="text-[#a08070] text-sm">Пожалуйста, подождите…</p>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
    <SnapProvider>
      <div className='w-full h-[100vh] overflow-hidden'>

        {snap.page == 'starter' && <AnimatePresence>
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}>
            <Introduction />
          </motion.div>
        </AnimatePresence>}

        {snap.page == 'config' && <AnimatePresence>
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}>

            <Configurator />

          </motion.div>
        </AnimatePresence>}

      </div>
    </SnapProvider>
  );
}

export default Home;