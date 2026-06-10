import { store } from '@/store';
import { useEffect, useState } from 'react';
import { subscribeKey } from 'valtio/utils';

export function useValtioKey(key: string) {
    const [state, setState] = useState(null)
    useEffect(() => {
        // Create subscription on mount
        const unsubscribe = subscribeKey(store, key, (value) => {
            setState(value)
        });

        // Clean up subscription on unmount
        return unsubscribe;
    }, []);
    return state;
}
