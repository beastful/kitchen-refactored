import { useState, useEffect, useRef, useMemo } from 'react';
import { Loader2, Calendar, FileText, Download, Clock, History, Star } from 'lucide-react';

interface StateItem {
  id: string;
  name: string;
  date_create: string | null;
  date_update?: string | null;
}

interface GetStatesProps {
  /** Called when a project is fetched. Receives the PARSED state_data object and the id. */
  onProjectGet?: (state: any, id: string) => void;
}

const STORAGE_KEY = 'db save collection';

const isLocalhost = () => {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

export function GetStates({ onProjectGet }: GetStatesProps) {
  const [list, setList] = useState<StateItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const pendingRef = useRef<Set<string>>(new Set());

  /* ── Fetch list ───────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const requestId = String(Math.random());
    pendingRef.current.add(requestId);
    setLoadingList(true);

    // LOCALHOST
    if (isLocalhost()) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const collection = raw ? JSON.parse(raw) : { states: [] };
        setList(Array.isArray(collection.states) ? collection.states : []);
      } catch (e) {
        console.error('[GetStates] localStorage read failed:', e);
        setList([]);
      }
      setLoadingList(false);
      pendingRef.current.delete(requestId);
      return;
    }

    // PRODUCTION
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

        const responseData = data.states || data.data || data.result || data.list;
        if (Array.isArray(responseData)) {
          setList(responseData);
        } else if (responseData && typeof responseData === 'object') {
          setList(responseData.items || responseData.records || []);
        } else {
          setList([]);
        }
        setLoadingList(false);
      }
    };

    window.addEventListener('message', onMessage);
    window.parent.postMessage(
      JSON.stringify({ requestId, action: 'list', data: {} }),
      '*'
    );

    const timeout = setTimeout(() => {
      if (pendingRef.current.has(requestId)) {
        pendingRef.current.delete(requestId);
        window.removeEventListener('message', onMessage);
        setLoadingList(false);
      }
    }, 10000);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener('message', onMessage);
      pendingRef.current.delete(requestId);
    };
  }, []);

  /* ── Sort by creation time (newest first) ─────────────────── */
  const sortedList = useMemo(() => {
    return [...list].sort((a, b) => {
      const ta = a.date_create ? new Date(a.date_create).getTime() : 0;
      const tb = b.date_create ? new Date(b.date_create).getTime() : 0;
      return tb - ta;
    });
  }, [list]);

  const latest = sortedList[0];
  const history = sortedList.slice(1);

  /* ── Load by id ───────────────────────────────────────────── */
  const handleLoad = (id: string) => {
    if (loadingId || typeof window === 'undefined') return;

    setLoadingId(id);
    const requestId = String(Math.random());
    pendingRef.current.add(requestId);

    // LOCALHOST
    if (isLocalhost()) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const collection = raw ? JSON.parse(raw) : { states: [] };
        const found = collection.states?.find((s: any) => String(s.id) === String(id));

        if (found?.state_data) {
          const parsed = JSON.parse(found.state_data);
          onProjectGet?.(parsed, id);
        } else {
          console.warn('[GetStates] State not found in localStorage:', id);
        }
      } catch (e) {
        console.error('[GetStates] localStorage load failed:', e);
      }

      setLoadingId(null);
      pendingRef.current.delete(requestId);
      return;
    }

    // PRODUCTION
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
        setLoadingId(null);

        const wrapper = data.state || data.data || data.result;
        let payload = wrapper;

        if (wrapper?.state_data && typeof wrapper.state_data === 'string') {
          try {
            payload = JSON.parse(wrapper.state_data);
          } catch {
            payload = wrapper.state_data;
          }
        }

        onProjectGet?.(payload, id);
      }
    };

    window.addEventListener('message', onMessage);
    window.parent.postMessage(
      JSON.stringify({ requestId, action: 'get', data: { id } }),
      '*'
    );

    const timeout = setTimeout(() => {
      if (pendingRef.current.has(requestId)) {
        pendingRef.current.delete(requestId);
        window.removeEventListener('message', onMessage);
        setLoadingId(null);
      }
    }, 10000);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const formatRelative = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);

      if (diffMin < 1) return 'только что';
      if (diffMin < 60) return `${diffMin} мин. назад`;
      if (diffHour < 24) return `${diffHour} ч. назад`;
      if (diffDay === 1) return 'вчера';
      if (diffDay < 7) return `${diffDay} дн. назад`;
      return formatDate(dateStr);
    } catch {
      return dateStr;
    }
  };

  if (loadingList) {
    return (
      <div className='w-80 p-4 text-center text-gray-400 bg-white rounded-lg shadow-xl border border-gray-200'>
        <Loader2 className='w-5 h-5 animate-spin mx-auto mb-2' />
        Загрузка списка...
      </div>
    );
  }

  return (
    <div className='w-80 max-h-[28rem] overflow-y-auto bg-white rounded-xl shadow-xl border border-gray-100'>
      
      {/* Header */}
      <div className='sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3 z-10'>
        <h3 className='font-semibold text-gray-800 flex items-center gap-2'>
          <History className='w-4 h-4 text-[#F06900]' />
          История проектов
        </h3>
      </div>

      {sortedList.length === 0 ? (
        <div className='p-6 text-center text-gray-400 text-sm'>
          Нет сохраненных проектов
        </div>
      ) : (
        <div className='divide-y divide-gray-50'>
          
          {/* ── Последний сохраненный проект ───────────────── */}
          {latest && (
            <div className='p-4 bg-orange-50/50'>
              <div className='flex items-center gap-1.5 mb-2 text-xs font-medium text-[#F06900] uppercase tracking-wide'>
                <Star className='w-3.5 h-3.5' />
                Последний сохраненный проект
              </div>
              
              <div className='bg-white rounded-lg p-3 shadow-sm border border-orange-100'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2 mb-1'>
                      <FileText className='w-4 h-4 text-[#F06900] shrink-0' />
                      <span className='font-semibold text-gray-900 truncate'>
                        {latest.name}
                      </span>
                    </div>
                    
                    <div className='flex items-center gap-1.5 text-xs text-gray-500 mb-1'>
                      <Calendar className='w-3 h-3' />
                      <span>Создан: {formatDate(latest.date_create)}</span>
                    </div>

                    {latest.date_update && (
                      <div className='flex items-center gap-1.5 text-xs text-gray-400'>
                        <Clock className='w-3 h-3' />
                        <span>В последний раз редактировано: {formatRelative(latest.date_update)}</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleLoad(latest.id)}
                    disabled={loadingId === latest.id}
                    className='flex items-center gap-1 px-3 py-1.5 text-sm bg-[#F06900] text-white rounded-md hover:bg-[#d85e00] disabled:opacity-50 transition shrink-0'
                  >
                    {loadingId === latest.id ? (
                      <Loader2 className='w-3 h-3 animate-spin' />
                    ) : (
                      <Download className='w-3 h-3' />
                    )}
                    Загрузить
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Ранее сохраненные ──────────────────────────── */}
          {history.length > 0 && (
            <div className='px-4 py-2 bg-gray-50/50'>
              <span className='text-xs font-medium text-gray-400 uppercase tracking-wide'>
                Ранее сохраненные
              </span>
            </div>
          )}

          {history.map((item) => (
            <div key={item.id} className='px-4 py-3 hover:bg-orange-50/40 transition'>
              <div className='flex items-start justify-between gap-3'>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center gap-2 mb-1'>
                    <FileText className='w-4 h-4 text-gray-400 shrink-0' />
                    <span className='font-medium text-gray-700 truncate'>
                      {item.name}
                    </span>
                  </div>
                  
                  <div className='flex items-center gap-1.5 text-xs text-gray-400'>
                    <Calendar className='w-3 h-3' />
                    <span>{formatDate(item.date_create)}</span>
                  </div>

                  {item.date_update && item.date_update !== item.date_create && (
                    <div className='flex items-center gap-1.5 text-xs text-gray-400 mt-0.5'>
                      <Clock className='w-3 h-3' />
                      <span>Изменен: {formatRelative(item.date_update)}</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleLoad(item.id)}
                  disabled={loadingId === item.id}
                  className='flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-[#F06900] hover:text-white disabled:opacity-50 transition shrink-0'
                >
                  {loadingId === item.id ? (
                    <Loader2 className='w-3 h-3 animate-spin' />
                  ) : (
                    <Download className='w-3 h-3' />
                  )}
                  Загрузить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
