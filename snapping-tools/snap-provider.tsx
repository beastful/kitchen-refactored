import { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Vector3 } from 'three';
import {
  StoredPointerEvent,
  SnapContextValue,
  SnapProviderProps,
  StoredConstraint,
  CursorLiveState,
} from './types';

const SnapContext = createContext<SnapContextValue | null>(null);

export function SnapProvider({ children, debug = false }: SnapProviderProps) {
  const pointerEventRef = useRef<StoredPointerEvent>(null);
  const cursorVisibleRef = useRef(false)
  const constraintsMap = useRef<Map<string, StoredConstraint>>(new Map());

  const cursorStateRef = useRef<CursorLiveState>({
    position: new Vector3(),
    rotation: 0,
    isSnapped: false,
    snapPosition: null,
    halfExtents: new Vector3(),
    snapPlanes: [],
  });

  const registerConstraint = (constraint: StoredConstraint) => {
    constraintsMap.current.set(constraint.id, constraint);
    return () => constraintsMap.current.delete(constraint.id);
  };

  const queryConstraints = (callback: (constraint: StoredConstraint) => void) => {
    constraintsMap.current.forEach(callback);
  };

  const updateCursorState = useCallback((partial: Partial<CursorLiveState>) => {
    const s = cursorStateRef.current;
    if (partial.position) s.position.copy(partial.position);
    if (partial.snapPosition) {
      s.snapPosition ??= new Vector3();
      s.snapPosition.copy(partial.snapPosition);
    }
    if (partial.halfExtents) s.halfExtents.copy(partial.halfExtents);
    if (partial.rotation !== undefined) s.rotation = partial.rotation;
    if (partial.isSnapped !== undefined) s.isSnapped = partial.isSnapped;
    if (partial.snapPlanes) s.snapPlanes = partial.snapPlanes;
  }, []);

  const getCursorState = useCallback(() => cursorStateRef.current, []);

  const value: SnapContextValue = {
    debug,
    cursorVisibleRef,
    pointerEventRef,
    registerConstraint,
    queryConstraints,
    cursorStateRef,
    updateCursorState,
    getCursorState,
  };

  return <SnapContext.Provider value={value}>{children}</SnapContext.Provider>;
}

export function useSnapContext() {
  const context = useContext(SnapContext);
  if (!context) throw new Error('useSnapContext must be used within a SnapProvider');
  return context;
}
