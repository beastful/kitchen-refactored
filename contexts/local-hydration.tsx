"use client"

import { hydrateStoreFromLocalStorage } from "@/store"
import { ReactNode, useEffect } from "react"

interface LocalHydrationProps {
    children: ReactNode
}

export function LocalHydration({ children }: LocalHydrationProps) {

    useEffect(() => {
        hydrateStoreFromLocalStorage()
    }, [])

    return <>{children}</>
}
