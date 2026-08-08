import { proxy, subscribe } from 'valtio';
import { Color, Vector3 } from 'three';
import { ModuleDef, ModuleEntity, ModulePlacementSource } from './types';
import { data } from '@/data';
import { FLOOR_MODULE_HEIGHT, getFloorModuleCenterY } from '@/lib/placement-geometry';

const STORAGE_KEY = 'room-configurator-store';
const DEFAULT_FLOOR_VALUE = 'assets/laminate_floor_02_diff_1k.jpg';

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
  floorColor: string;
  tabletop: [number, string, number];
  wallHeight: number;
  enableRotate: boolean;
  room: { d: number; w: number; h: number };
  modules: ModuleEntity[];
  currentRawModule: ModulePlacementSource | null;
  openMenuId: string | null;
  /** Origin родительского сайта (yasnaya-mebel.ru) для формирования ссылки «Поделиться» */
  parentOrigin: string | null;
}

const serColor = (c: Color) => {
  if (c instanceof Color) return c.getHex();
  return new Color(c).getHex();
};

const deserColor = (o: string | number) => new Color(o);

const serVec3 = (v: Vector3) => ({ x: v.x, y: v.y, z: v.z });
const deserVec3 = (o: { x: number; y: number; z: number }) =>
  new Vector3(o.x, o.y, o.z);

const findDefByName = (name: string): ModuleDef | undefined =>
  data.find((d) => d.name === name);

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
    model: def?.model ?? snapshot.model ?? null,
    modelPath: def?.modelPath ?? snapshot.modelPath,
    handleColor: deserColor(snapshot.handleColor),
    color: deserColor(snapshot.color),
    size: deserVec3(snapshot.size),
    position: deserVec3(snapshot.position),
    normal: deserVec3(snapshot.normal),
    lock: deserVec3(snapshot.lock),
  } as ModuleEntity;
}

function serializeState(state: Store): any {
  return {
    ...state,
    currentRawModule: null,
    modules: state.modules.map(serializeEntity),
  };
}

function deserializeState(saved: any): Partial<Store> {
  const copy = { ...saved };

  copy.modules = saved.modules?.map(deserializeEntity) ?? [];
  copy.currentRawModule = null;

  copy.floorColor = saved.floorColor ?? DEFAULT_FLOOR_VALUE;
  copy.tabletopColor = saved.tabletopColor ?? '#8E8478';
  copy.roomColor = saved.roomColor ?? '#F9F8F4';
  copy.tabletop = saved.tabletop ?? [0.026, 'Скиф 26', 600];
  copy.wallHeight = saved.wallHeight ?? 0.7;
  copy.room = saved.room ?? { d: 3, w: 4, h: 2 };

  // Projects saved before the floor-height correction contain the old 800 mm
  // slot and its old vertical centre. Migrate only that exact legacy height;
  // future plinth variants keep their own explicit geometry.
  copy.modules = copy.modules.map((module: ModuleEntity) => {
    const legacyHeight = Math.abs(module.size.y - 0.8) <= 0.001;

    if (module.type !== 'floor' || !legacyHeight) {
      return module;
    }

    module.size.y = FLOOR_MODULE_HEIGHT;
    module.position.y = getFloorModuleCenterY(copy.room.h, module.size.y / 2);
    module.lock = new Vector3(module.lock.x, module.position.y, module.lock.z);
    return module;
  });

	return copy;
}

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
  floorColor: DEFAULT_FLOOR_VALUE,
  tabletop: [0.026, 'Скиф 26', 600],
  wallHeight: 0.7,
  enableRotate: true,
  room: { d: 3, w: 4, h: 2 },
  modules: [],
  currentRawModule: null,
  parentOrigin: null,
});

export function hydrateStoreFromLocalStorage() {
  if (typeof window === 'undefined') return;

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

hydrateStoreFromLocalStorage();

subscribe(store, () => {
  if (typeof window === 'undefined') return;

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
