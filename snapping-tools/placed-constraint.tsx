import { forwardRef, useEffect, useRef } from 'react';
import { Group, Vector3 } from 'three';
import { useSnapContext } from './snap-provider';
import { SnapPlane, SnapPlacedObjectProps } from './types';

export const SnapPlacedObject = forwardRef<Group, SnapPlacedObjectProps>(
  ({ id, position, rotation = [0, 0, 0], scale = 1, halfExtents, snapPlanes, useDistance = true, children }, forwardedRef) => {
    const groupRef = useRef<Group>(null);
    const snapContext = useSnapContext();

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

    return (
      <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
        {children}
      </group>
    );
  }
);
