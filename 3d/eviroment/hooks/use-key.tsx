import { Store, store } from '@/store';
import { useEffect, useState } from 'react';
import { subscribeKey } from 'valtio/utils';

export function useValtioKey<K extends keyof Store>(key: K) {
    const [state, setState] = useState<Store[K] | null>(null)
    useEffect(() => {
        // Create subscription on mount
        const unsubscribe = subscribeKey(store, key, (value) => {
            setState(value)
        });

        // Clean up subscription on unmount
        return unsubscribe;
    }, [key]);
    return state;
}
