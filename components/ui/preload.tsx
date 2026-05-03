import { useProgress } from '@react-three/drei'
import { useEffect, useState } from 'react'

export function PreloaderOverlay() {
    const { progress } = useProgress()

    if (progress > 99) return null

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white transition-opacity duration-500">
            <div className="flex items-center gap-4 mb-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#F06900]/20 border-t-[#F06900]" />
            </div>
            <div className="h-1 w-64 overflow-hidden rounded-full bg-gray-200">
                <div
                    className="h-full w-full origin-left rounded-full bg-[#F06900] transition-transform duration-200"
                    style={{ transform: `scaleX(${progress / 100})` }}
                />
            </div>
            <div className="mt-3 text-sm font-medium text-gray-600">
                {Math.floor(progress)}%
            </div>
            <div className="mt-6 text-xs uppercase tracking-wider text-gray-400">
                загрузка 3D-конструктора
            </div>
        </div>
    )
}
