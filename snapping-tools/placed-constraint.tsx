import { forwardRef, useEffect, useRef } from 'react';
import { Euler, Group, Vector3 } from 'three';
import { useSnapContext } from './snap-provider';
import { SnapPlane, SnapPlacedObjectProps } from './types';
import { Html } from '@react-three/drei';
import { computeMinimalTranslation } from './hooks/minimal-translation';
import { safeSignZero, SnapBox } from './utils';
import { SNAP_RADIUS } from './constants';

export const SnapPlacedObject = forwardRef<Group, SnapPlacedObjectProps>(
  ({
    id,
    position,
    lockX,
    lockY,
    lockZ,
    lock,
    intersections,
    rotation = [0, 0, 0],
    scale = 1,
    halfExtents,
    useDistance = true,
    beforeCalculate = (v: Vector3, h: Vector3) => v,
    children
  }, forwardedRef) => {
    const groupRef = useRef<Group>(null);
    const snapContext = useSnapContext();

    useEffect(() => {
      if (!snapContext.registerConstraint || !groupRef.current) return;

      const unregister = snapContext.registerConstraint({
        id,
        ref: groupRef as React.MutableRefObject<any>,
        position: [...position],
        rotation: [...rotation],
        halfExtents: [...halfExtents],
        userData: { useDistance, useCursor: false, ignoreNormals: [] },
      });

      return unregister;
    }, [id, useDistance, snapContext, halfExtents]);

    const snap = computeMinimalTranslation(new SnapBox({
      position: new Vector3().fromArray(position),
      rotation: new Euler(0, rotation[1], 0),
      halfExtents: new Vector3().fromArray(halfExtents).addScalar(SNAP_RADIUS),
    }), intersections);

    const cor = new Vector3(
      safeSignZero(snap.x) * -SNAP_RADIUS,
      safeSignZero(snap.y) * -SNAP_RADIUS,
      safeSignZero(snap.z) * -SNAP_RADIUS,
    );

    const final = new Vector3().fromArray(position).clone().add(snap).add(cor);
    const display = new Vector3(
      lockX == true ? lock.x : final.x,
      lockY == true ? lock.y : final.y,
      lockZ == true ? lock.z : final.z
    )
    const calculated = beforeCalculate(display.clone(), new Vector3().fromArray(halfExtents), new Euler(0, rotation[1], 0))

    return (
      <>
        <group ref={groupRef} position={calculated} rotation={rotation} scale={scale}>
          {children}
        </group>
      </>
    );
  }
);
