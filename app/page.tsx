'use client'

import Configurator from '@/components/pages/connfigurator';
import Introduction from '@/components/pages/introduction';
import { hydrateStoreFromLocalStorage, store } from '@/store';
import React, { Suspense, useEffect, useState } from 'react';
import { useSnapshot } from 'valtio';
import { AnimatePresence, motion } from "motion/react"
import { SnapProvider } from '@/snapping-tools/snap-provider';
import { useTexture } from '@react-three/drei';

useTexture.preload('/matcap/mc1.png');
useTexture.preload('/matcap/mc2.png');
useTexture.preload('/matcap/mc3.png');

function BiggerScreen() {
  return
}

function Home() {
  
  
  const snap = useSnapshot(store)



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