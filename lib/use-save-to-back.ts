import { useState, useCallback, useRef, useEffect } from 'react';

const STORAGE_KEY = 'db save collection';

const isLocalhost = () => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
};

export function useSaveToBack(): [
    (payload: Record<string, unknown> | string) => void,
    boolean,
    boolean
] {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const pendingRef = useRef<Set<string>>(new Set());

    /* ← новое: автосброс зелёной галочки через 5 секунд */
    useEffect(() => {
        if (!success) return;
        const timer = setTimeout(() => setSuccess(false), 5000);
        return () => clearTimeout(timer);
    }, [success]);

    const write = useCallback((payload: Record<string, unknown> | string) => {
        if (typeof window === 'undefined') return;

        setLoading(true);
        setSuccess(false); // сброс при новом сохранении
        const requestId = String(Math.random());
        pendingRef.current.add(requestId);

        let projectName = 'Новый проект';
        let stateData: string;

        if (typeof payload === 'string') {
            stateData = payload;
        } else {
            projectName = (payload.name as string) || 'Новый проект';
            if (typeof payload.state_data === 'string') {
                stateData = payload.state_data;
            } else if (typeof payload.state === 'string') {
                stateData = payload.state;
            } else {
                stateData = JSON.stringify(payload.state ?? payload);
            }
        }

        /* ── LOCALHOST ─────────────────────────── */
        if (isLocalhost()) {
            try {
                const raw = localStorage.getItem(STORAGE_KEY);
                const collection = raw ? JSON.parse(raw) : { states: [] };
                if (!Array.isArray(collection.states)) collection.states = [];

                const newItem = {
                    id: String(Date.now()),
                    name: projectName,
                    state_data: stateData,
                    date_create: new Date().toISOString(),
                    date_update: new Date().toISOString(),
                };

                collection.states.unshift(newItem);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(collection));

                pendingRef.current.delete(requestId);
                setLoading(false);
                setSuccess(true);
            } catch (e) {
                console.error('[useSaveToBack] localStorage failed:', e);
                pendingRef.current.delete(requestId);
                setLoading(false);
                setSuccess(false);
            }
            return;
        }

        /* ── PRODUCTION postMessage ─────────────── */
        const onMessage = (event: MessageEvent) => {
            let data: any;
            try {
                data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            } catch {
                return;
            }
            if (data.requestId === requestId) {
                pendingRef.current.delete(requestId);
                window.removeEventListener('message', onMessage);
                setLoading(false);
                setSuccess(data.status === 'success');
            }
        };

        window.addEventListener('message', onMessage);
        window.parent.postMessage(
            JSON.stringify({
                requestId,
                action: 'save',
                data: { name: projectName, state_data: stateData },
            }),
            '*'
        );

        setTimeout(() => {
            if (pendingRef.current.has(requestId)) {
                pendingRef.current.delete(requestId);
                window.removeEventListener('message', onMessage);
                setLoading(false);
                setSuccess(false);
            }
        }, 10000);
    }, []);

    return [write, loading, success];
}
