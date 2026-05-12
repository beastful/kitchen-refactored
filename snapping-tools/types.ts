import { ReactNode } from 'react';
import { ThreeElements } from '@react-three/fiber';
import { Vector3, Object3D } from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { RefObject } from 'react';
import { SnapBox } from './utils';

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
    position: [number, number, number];
    rotation: [number, number, number];
    halfExtents: [number, number, number];
    userData: SnapConstraintUserDataType;
}

export interface CursorDataType {
    snapbox: SnapBox;
    intersections: SnapBox[];
}

export interface SnapContextValue {
    debug: boolean;
    pointerEvent: StoredPointerEvent;
    cursorVisible: boolean;
    setPointerEvent: (event: StoredPointerEvent) => void;
    setCursorVisible: (visible: boolean) => void;
    registerConstraint: (constraint: StoredConstraint) => () => void;
    queryConstraints: (callback: (constraint: StoredConstraint) => void) => void;
    cursorData: CursorDataType;
    setCursorData: (data: CursorDataType) => void;
    constraintsMap: Map<string, StoredConstraint>
}

export type SnapCursorProps = ThreeElements['group'] & {
    children?: ReactNode;
    flipToFace?: boolean;
    lock: Vector3;
    lockX: boolean;
    lockY: boolean;
    lockZ: boolean;
};

export type Intersection = [center: Vector3, size: Vector3, normal: Vector3];

export type SnapPlacedObjectProps = {
    id: string;
    position: [number, number, number];
    rotation?: [number, number, number];
    scale?: number | [number, number, number];
    halfExtents: [number, number, number];
    useDistance?: boolean;
    children: React.ReactNode;
    intersections: SnapBox[];
    lockX: boolean;
    lockY: boolean;
    lockZ: boolean;
    lock: Vector3;
};

export type PlacementResult = {
    possible: boolean;
    data?: PlacementData;
    reason?: 'not_snapped' | 'overlap' | 'too_narrow';
};

export type BoxArgs = [number, number, number];
