import { forwardRef, useEffect, useRef } from 'react';
import { Group, Vector3 } from 'three';
import { useSnapContext } from './snap-provider';
import { SnapPlane, SnapPlacedObjectProps } from './types';
import { useSnapshot } from 'valtio';
import { store } from '@/store';
import { Html } from '@react-three/drei';
import { usePointerMove } from './hooks/use-pointer-move';
import { useFrame } from '@react-three/fiber';

const _result = new Vector3();
const _planePoint = new Vector3();
const _planeNormal = new Vector3();

function getWorldHalf(half: [number, number, number], yaw: number) {
  const cos = Math.round(Math.cos(yaw));
  const sin = Math.round(Math.sin(yaw));
  return {
    x: Math.abs(half[0] * cos) + Math.abs(half[2] * sin),
    y: half[1],
    z: Math.abs(half[0] * sin) + Math.abs(half[2] * cos),
  };
}

function recalculate(
  group: Group | null,
  half: [number, number, number],
  planes: SnapPlane[],
  lock: Vector3,
  lockY: boolean
) {
  if (!group) return;

  // Only run plane snapping when there are planes
  if (planes.length > 0) {
    const yaw = group.rotation.y;
    const worldHalf = getWorldHalf(half, yaw);
    const locked = { x: false, y: false, z: false };

    _result.set(group.position.x, group.position.y, group.position.z);

    for (const p of planes) {
      _planePoint.set(...p.point);
      _planeNormal.set(...p.normal);

      const absX = Math.abs(_planeNormal.x);
      const absY = Math.abs(_planeNormal.y);
      const absZ = Math.abs(_planeNormal.z);
      const axis = absX > absY && absX > absZ ? 'x' : absY > absZ ? 'y' : 'z';
      if (locked[axis]) continue;
      locked[axis] = true;

      const dir = Math.sign(_planeNormal[axis]);
      const h = axis === 'x' ? worldHalf.x : axis === 'y' ? worldHalf.y : worldHalf.z;
      _result[axis] = _planePoint[axis] + h * dir;
    }

    group.position.copy(_result);
    if(lockY) group.position.y = lock.y;
  }
}

export const SnapPlacedObject = forwardRef<Group, SnapPlacedObjectProps>(
  ({ id, position, rotation = [0, 0, 0], scale = 1, halfExtents, snapPlanes, useDistance = true, children, lock, lockY }, forwardedRef) => {
    const groupRef = useRef<Group>(null);
    const snapContext = useSnapContext();
    const snap = useSnapshot(store)

    useEffect(() => {
      if (!snapContext.registerConstraint || !groupRef.current) return;

      const unregister = snapContext.registerConstraint({
        id,
        ref: groupRef as React.MutableRefObject<any>,
        halfExtents: halfExtents,
        userData: { useDistance, useCursor: false, ignoreNormals: [] },
      });

      return unregister;
    }, [id, useDistance, snapContext, halfExtents]);

    useEffect(() => {
      recalculate(groupRef.current, halfExtents, snapPlanes, lock, lockY);
    }, [lock.y, lockY]); // eslint-disable-line

    useEffect(() => {
      recalculate(groupRef.current, halfExtents, snapPlanes, lock, lockY);
    }, [rotation[1], halfExtents, snapPlanes, lock.y, lockY, snap]);

    return (
      <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
        {children}
      </group>
    );
  }
);
