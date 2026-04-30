import { useRef, useState, useEffect, useCallback } from 'react';
import { useSnapContext } from '../snap-provider';
import { CursorLiveState, SnapPlane, PlacementResult } from '../types';

// Императивный доступ для R3F useFrame
export function useSnapCursor() {
  const { cursorStateRef, updateCursorState, getCursorState } = useSnapContext();
  return { cursorStateRef, updateCursorState, getCursorState };
}

// Реактивный доступ для React UI (раз в 100мс)
export function useSnapCursorReactive() {
  const { getCursorState } = useSnapCursor();
  const [state, setState] = useState<CursorLiveState>(() => getCursorState());

  useEffect(() => {
    const id = setInterval(() => setState(getCursorState()), 100);
    return () => clearInterval(id);
  }, [getCursorState]);

  return state;
}

// Хук для создания SnapPlacedObject из текущего курсора
export function usePlaceObject() {
  const { getCursorState } = useSnapCursor();
  const placedObjects = useRef<Array<{
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    halfExtents: [number, number, number];
    snapPlanes: SnapPlane[];
  }>>([]);

  const place = useCallback(() => {
    const s = getCursorState();
    if (!s.isSnapped || !s.snapPosition) return null;

    const data = {
      id: crypto.randomUUID(),
      position: [s.snapPosition.x, s.snapPosition.y, s.snapPosition.z] as [number, number, number],
      rotation: [0, s.rotation, 0] as [number, number, number],
      halfExtents: [s.halfExtents.x, s.halfExtents.y, s.halfExtents.z] as [number, number, number],
      snapPlanes: s.snapPlanes,
    };

    placedObjects.current.push(data);
    return data;
  }, [getCursorState]);

  return { place, placedObjects: placedObjects.current };
}
