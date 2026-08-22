import { useState, useCallback, useRef, useEffect } from 'react';

const STORAGE_KEY = 'db save collection';

function parseMessageData(value: unknown): Record<string, unknown> | null {
    let parsed: unknown = value;
    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed) as unknown;
        } catch {
            return null;
        }
    }
    return parsed !== null && typeof parsed === 'object'
        ? parsed as Record<string, unknown>
        : null;
}

const isLocalhost = () => {
    if (typeof window === 'undefined') return false;
    const h = window.location.hostname;
    return h === 'localhost' || h === '127.0.0.1';
};

export function useSaveToBack(): [
    (payload: Record<string, unknown> | string, onSuccess?: (id: string) => void) => void,
    boolean,
    boolean,
    string | null
] {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [savedId, setSavedId] = useState<string | null>(null);
    const pendingRef = useRef<Set<string>>(new Set());

    /* автосброс зелёной галочки через 10 секунд (чтобы успели скопировать ссылку) */
    useEffect(() => {
        if (!success) return;
        const timer = setTimeout(() => {
            setSuccess(false);
            setSavedId(null);
        }, 10000);
        return () => clearTimeout(timer);
    }, [success]);

    const write = useCallback((payload: Record<string, unknown> | string, onSuccess?: (id: string) => void) => {
        if (typeof window === 'undefined') return;

        setLoading(true);
        setSuccess(false);
        setSavedId(null); // сброс id при новом сохранении
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

                const localId = String(Date.now());
                const newItem = {
                    id: localId,
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
                setSavedId(localId);
                onSuccess?.(localId);
            } catch (e) {
                console.error('[useSaveToBack] localStorage failed:', e);
                pendingRef.current.delete(requestId);
                setLoading(false);
                setSuccess(false);
                setSavedId(null);
            }
            return;
        }

        /* ── PRODUCTION postMessage ─────────────── */
        const onMessage = (event: MessageEvent) => {
            const data = parseMessageData(event.data);
            if (!data) return;
            if (data.requestId === requestId) {
                pendingRef.current.delete(requestId);
                window.removeEventListener('message', onMessage);
                setLoading(false);
                const isSuccess = data.status === 'success';
                setSuccess(isSuccess);
                if (isSuccess && data.id) {
                    setSavedId(String(data.id));
                    onSuccess?.(String(data.id));
                } else {
                    setSavedId(null);
                }
            }
        };

        window.addEventListener('message', onMessage);
        // Извлекаем previewUrl из payload, если передан
        let previewUrl = '';
        if (typeof payload === 'object' && payload !== null) {
            previewUrl = (payload as Record<string, unknown>).previewUrl as string || '';
        }

        window.parent.postMessage(
            JSON.stringify({
                requestId,
                action: 'save',
                data: { name: projectName, state_data: stateData, previewUrl },
            }),
            '*'
        );

        setTimeout(() => {
            if (pendingRef.current.has(requestId)) {
                pendingRef.current.delete(requestId);
                window.removeEventListener('message', onMessage);
                setLoading(false);
                setSuccess(false);
                setSavedId(null);
            }
        }, 10000);
    }, []);

    return [write, loading, success, savedId];
}
