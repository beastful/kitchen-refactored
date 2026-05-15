'use client'

import { ModuleDef } from '@/types'
import { store } from '@/store'
import React, { useCallback, useEffect, useRef } from 'react'
import { CATEGORY_TECH } from '@/constants'

export function ModuleCard({ module }: { module: ModuleDef }) {
  const { price, name, image, displayName } = module
  const isDragging = useRef(false)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    isDragging.current = true
    store.currentRawModule = module
  }, [module])

  // Глобальный pointerup — сбрасываем даже если курсор ушёл за пределы карточки
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isDragging.current) {
        isDragging.current = false
        store.currentRawModule = null
      }
    }

    window.addEventListener('pointerup', handleGlobalPointerUp)
    return () => window.removeEventListener('pointerup', handleGlobalPointerUp)
  }, [])

    const m_name = name.split("_");
    const m_folder = `${m_name?.[1]}`
    const isTech = module.tags.includes(CATEGORY_TECH)

  return (
    <div
      onPointerDown={handlePointerDown}
      className="w-full flex flex-col select-none gap-2.5 rounded-lg shadow cursor-grab active:cursor-grabbing"
    >
      <img
        draggable={false}
        className="w-full object-cover drop-shadow-lg brightness-110 pointer-events-none"
        src={isTech != true ? `previews/${m_folder}/${name}.png` : module.image}
        alt={displayName || name}
      />
      <div className="flex flex-col gap-2.5 px-4 pb-4">
        <div className="font-semibold text-sm">{displayName}</div>
        <div className="font-semibold text-xs text-gray-500">{name}</div>
        <div>
          <span className="rounded-lg px-1.5 py-1 bg-[#F5E8DC99] text-[#F06900] text-[13px] font-medium">
            От {price} ₽
          </span>
        </div>
      </div>
    </div>
  )
}
