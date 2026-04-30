import { proxy } from 'valtio';
import { Vector3, Color } from 'three';
import { ModuleDef, ModuleEntity } from './types';

export interface Store {
    page: string;
    hints: boolean;
    configWindow: boolean;
    configurableEntity: ModuleEntity | null;
    calculatorWindow: boolean;
    ruler: boolean;
    groupEdit: boolean;
    openAngle: number;
    roomColor: string;
    tabletopColor: string;
    tabletop: [number, string, number];
    wallHeight: number;
    enableRotate: boolean;
    room: {
        d: number;
        w: number;
        h: number;
    };
    modules: ModuleEntity[];
    currentRawModule: ModuleDef | null;
    currentModule: ModuleEntity | null;
}

export const store = proxy<Store>({
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
    room: {
        d: 5,
        w: 3,
        h: 2,
    },
    modules: [],
    currentRawModule: null,
    currentModule: null
});