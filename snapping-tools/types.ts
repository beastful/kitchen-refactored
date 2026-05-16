import { ReactNode } from 'react';
import { ThreeElements } from '@react-three/fiber';
import { Vector3, Object3D } from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { RefObject, MutableRefObject } from 'react';

export type Vector3Tuple = [number, number, number] | Vector3;
export type StoredPointerEvent = ThreeEvent<PointerEvent> | null;

export type SnapPlane = {
    point: [number, number, number];
    normal: [number, number, number];
};

export type CursorLiveState = {
    position: Vector3;
    rotation: number;
    isSnapped: boolean;
    snapPosition: Vector3 | null;
    halfExtents: Vector3;
    snapPlanes: SnapPlane[];
};

export type PlacementData = {
    position: [number, number, number];
    rotation: [number, number, number];
    halfExtents: [number, number, number];
    snapPlanes: SnapPlane[];
};

export interface SnapProviderProps {
    children?: ReactNode;
    debug?: boolean;
}

export type SnapConstraintProps = ThreeElements['group'] & {
    id?: string;
    children?: ReactNode;
    radius?: number;
    ignoreNormals?: Vector3Tuple[];
    useCursor?: boolean;
    useDistance?: boolean;
};

export interface SnapConstraintUserDataType {
    useCursor: boolean;
    useDistance: boolean;
    ignoreNormals: Vector3Tuple[];
}

export interface StoredConstraint {
    id: string;
    ref: RefObject<Object3D | null>;
    halfExtents: [number, number, number];
    userData: SnapConstraintUserDataType;
}

export interface SnapContextValue {
    debug: boolean;
    pointerEventRef: RefObject<StoredPointerEvent>;
    cursorVisibleRef: RefObject<Boolean>;
    registerConstraint: (constraint: StoredConstraint) => () => void;
    queryConstraints: (callback: (constraint: StoredConstraint) => void) => void;
    cursorStateRef: MutableRefObject<CursorLiveState>;
    updateCursorState: (partial: Partial<CursorLiveState>) => void;
    getCursorState: () => CursorLiveState;
}

export type SnapCursorProps = ThreeElements['group'] & {
    children?: ReactNode;
    lockY: boolean;
    lock: Vector3;
    flipToFace?: boolean;
};

export type Intersection = [center: Vector3, size: Vector3, normal: Vector3];

export type SnapPlacedObjectProps = {
    id: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
    halfExtents: [number, number, number];
    snapPlanes: SnapPlane[];
    useDistance?: boolean;
    children: React.ReactNode;
    lockY: boolean;
    lock: Vector3;
};

export type PlacementResult = {
    possible: boolean;
    data?: PlacementData;
    reason?: 'not_snapped' | 'overlap' | 'too_narrow';
};

export type BoxArgs = [number, number, number];
