import { proxy, subscribe } from 'valtio';
import { Color, Vector3 } from 'three';
import { ModuleDef, ModuleEntity } from './types';
import { data } from '@/data';

const STORAGE_KEY = 'room-configurator-store';

export interface Store {
    page: string;
    hints: boolean;
    configWindow: boolean;
    configurableEntity: string | null;
    calculatorWindow: boolean;
    ruler: boolean;
    groupEdit: boolean;
    openAngle: number;
    roomColor: string;
    tabletopColor: string;
    tabletop: [number, string, number];
    wallHeight: number;
    enableRotate: boolean;
    room: { d: number; w: number; h: number };
    modules: ModuleEntity[];
    currentRawModule: ModuleDef | null;
    currentModule: ModuleEntity | null;
    openMenuId: string | null;
}

// ------------------------------------------------------------------
// 1. Three.js serializers
// ------------------------------------------------------------------

const serColor = (c: Color) => {
    if (c instanceof Color) {
        return c.getHex();
    }
    return new Color(c).getHex()
};
const deserColor = (o: string | number) => new Color(o);

const serVec3 = (v: Vector3) => ({ x: v.x, y: v.y, z: v.z });
const deserVec3 = (o: { x: number; y: number; z: number }) => new Vector3(o.x, o.y, o.z);

// ------------------------------------------------------------------
// 2. Catalog lookup
// ------------------------------------------------------------------

const findDefByName = (name: string): ModuleDef | undefined =>
    data.find((d) => d.name === name);

// ------------------------------------------------------------------
// 3. Entity serialization
// ------------------------------------------------------------------

function serializeEntity(entity: ModuleEntity): any {
    return {
        ...entity,
        model: undefined,
        handleColor: serColor(entity.handleColor),
        color: serColor(entity.color),
        size: serVec3(entity.size),
        position: serVec3(entity.position),
        normal: serVec3(entity.normal),
        lock: serVec3(entity.lock),
    };
}

function deserializeEntity(snapshot: any): ModuleEntity {
    const def = findDefByName(snapshot.name);

    return {
        ...snapshot,
        model: def?.model ?? null,
        handleColor: deserColor(snapshot.handleColor),
        color: deserColor(snapshot.color),
        size: deserVec3(snapshot.size),
        position: deserVec3(snapshot.position),
        normal: deserVec3(snapshot.normal),
        lock: deserVec3(snapshot.lock),
    } as ModuleEntity;
}

// ------------------------------------------------------------------
// 4. State serialization / deserialization
// ------------------------------------------------------------------

function serializeState(state: Store): any {
    return {
        ...state,
        modules: state.modules.map(serializeEntity),
        currentModule: state.currentModule ? serializeEntity(state.currentModule) : null,
        currentRawModuleName: state.currentRawModule?.name ?? null,
    };
}

function deserializeState(saved: any): Partial<Store> {
    const copy = { ...saved };
    delete copy.currentRawModuleName;

    copy.modules = saved.modules?.map(deserializeEntity) ?? [];
    copy.currentModule = saved.currentModule
        ? deserializeEntity(saved.currentModule)
        : null;
    copy.currentRawModule = saved.currentRawModuleName
        ? findDefByName(saved.currentRawModuleName) ?? null
        : null;

    return copy;
}

// ------------------------------------------------------------------
// 5. Store (defaults only)
// ------------------------------------------------------------------

export const store = proxy<Store>({
    openMenuId: null,
    page: 'starter',
    hints: true,
    configWindow: false,
    configurableEntity: null,
    calculatorWindow: false,
    ruler: false,
    groupEdit: false,
    openAngle: 0,
    roomColor: '#F9F8F4',
    tabletopColor: '#8E8478',
    tabletop: [0.026, 'Скиф 26', 600],
    wallHeight: 0.7,
    enableRotate: true,
    room: { d: 3, w: 4, h: 2 },
    modules: [],
    currentRawModule: null,
    currentModule: null,
});

// ------------------------------------------------------------------
// 6. Hydration (вынесена в функцию + вызывается сразу как раньше)
// ------------------------------------------------------------------

export function hydrateStoreFromLocalStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            Object.assign(store, deserializeState(parsed));
        }
    } catch (e) {
        console.error('[Store] Failed to hydrate from localStorage:', e);
    }
}

// Как и раньше — восстанавливаем состояние при импорте модуля
hydrateStoreFromLocalStorage();

// ------------------------------------------------------------------
// 7. Persist on every mutation (как было изначально)
// ------------------------------------------------------------------

subscribe(store, () => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serializeState(store)));
    } catch (e) {
        console.error('[Store] Failed to persist to localStorage:', e);
    }
});


export function getJson(): string {
    return JSON.stringify(serializeState(store));
}

export function setJson(json: string): void {
    try {
        const parsed = JSON.parse(json);
        Object.assign(store, deserializeState(parsed));
    } catch (e) {
        console.error('[Store] Failed to set state from JSON:', e);
        throw new Error('Invalid state JSON');
    }
}
