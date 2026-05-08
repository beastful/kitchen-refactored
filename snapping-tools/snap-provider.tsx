import { createContext, useContext, useRef, useState, useCallback } from 'react';
import { Euler, Vector3 } from 'three';
import {
  StoredPointerEvent,
  SnapContextValue,
  SnapProviderProps,
  StoredConstraint,
  CursorLiveState,
  CursorDataType
} from './types';
import { SnapBox } from './utils';

const SnapContext = createContext<SnapContextValue | null>(null);

export function SnapProvider({ children, debug = false }: SnapProviderProps) {
  const [pointerEvent, setPointerEvent] = useState<StoredPointerEvent>(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const constraintsMap = useRef<Map<string, StoredConstraint>>(new Map());

  const registerConstraint = (constraint: StoredConstraint) => {
    constraintsMap.current.set(constraint.id, constraint);
    return () => constraintsMap.current.delete(constraint.id);
  };

  const queryConstraints = (callback: (constraint: StoredConstraint) => void) => {
    constraintsMap.current.forEach(callback);
  };

  const cursorData = useRef<CursorDataType>({
    snapbox: new SnapBox({
      position: new Vector3(),
      rotation: new Euler(),
      halfExtents: new Vector3()
    }),
    intersections: []
  })

  const setCursorData = (data: CursorDataType) => {
    cursorData.current = data
  }

  const value: SnapContextValue = {
    debug,
    pointerEvent,
    cursorVisible,
    setPointerEvent,
    setCursorVisible,
    registerConstraint,
    queryConstraints,
    setCursorData,
    cursorData: cursorData.current,
    constraintsMap: constraintsMap.current
  };

  return <SnapContext.Provider value={value}>{children}</SnapContext.Provider>;
}

export function useSnapContext() {
  const context = useContext(SnapContext);
  if (!context) throw new Error('useSnapContext must be used within a SnapProvider');
  return context;
}
