import { Euler, Group, Matrix4, Quaternion, Vector3 } from 'three';
import { useSnapContext } from './snap-provider';
import { SnapCursorProps, Intersection, BoxArgs } from './types';
import { getYawFromNormal, SnapBox } from './utils';
import { useEffect, useMemo, useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Box3, Object3D } from 'three';
import { useBoundingBox } from './hooks/use-bounding-box';
import { getDominantXOverlaps, getNonOverlappingXPositions, getOverlapOnWorldAxis, intersectSnapBox } from './utils/intersection-check';
import { computeMinimalTranslation } from './hooks/minimal-translation';

function applyYaw(vector: Vector3, yaw: number) {
  const matrix = new Matrix4().makeRotationY(yaw);
  return vector.clone().applyMatrix4(matrix);
}

function useBounds() {
  const { constraintsMap } = useSnapContext();

  return [...constraintsMap].map((b: any) => {
    const [w, h, d] = b[1].halfExtents;
    return new SnapBox({
      position: b[1].ref.current.position as Vector3,
      halfExtents: new Vector3(w, h, d),
      rotation: b[1].ref.current.rotation as Euler
    })
  });
}

function useIntersections({ cursor, hit, bounds }: {
  cursor: SnapBox,
  hit: SnapBox,
  bounds: SnapBox[]
}) {
  const intersections = useRef<SnapBox[]>([])

  useEffect(() => {
    const int: SnapBox[] = []

    for (const box of bounds) {
      if (intersectSnapBox(box, hit)) {
        int.push(box);
      }
    }

    intersections.current = int
  }, [hit, cursor])

  const getSnapCandiatesX = () => {
    return getDominantXOverlaps(hit, intersections.current)
  }
  const getSnapCandiatesY = () => { }
  const getSnapCandiatesZ = () => { }

  return {
    intersections: intersections.current,
    getSnapCandiatesX,
    getSnapCandiatesY,
    getSnapCandiatesZ
  }
}

export function SnapCursor({ children, ...groupProps }: SnapCursorProps) {
  const { pointerEvent, setCursorData } = useSnapContext()
  const yaw = getYawFromNormal(pointerEvent?.normal || new Vector3())
  const point = pointerEvent?.point || new Vector3();
  const snapVector = new Vector3();
  const visualRef = useRef<Group>(null);
  const bounds = useBounds();
  const [AABBRef, halfExtents] = useBoundingBox()
  const [width, height, depth] = halfExtents
  const treshold = 0.4
  const cursorBox = new SnapBox({
    position: point,
    rotation: new Euler(0, yaw, 0),
    halfExtents: new Vector3(width, height, depth).addScalar(treshold),
  })

  const {
    intersections,
    getSnapCandiatesX,
    getSnapCandiatesY,
    getSnapCandiatesZ
  } = useIntersections({
    cursor: cursorBox,
    hit: cursorBox,
    bounds
  });

  const safeIntersections = intersections.length > 3 ? intersections.filter(i => {
    if (i.halfExtents.x > 2.5 || i.halfExtents.y > 2.5 || i.halfExtents.z > 2.5) {
      return true
    }
    return false
  }) : intersections;

  const snap = computeMinimalTranslation(cursorBox, safeIntersections)

  const EPS = 1e-12;

  function safeSignZero(value: number) {
    return Math.abs(value) < EPS ? 0 : Math.sign(value);
  }

  const cor = new Vector3(
    safeSignZero(snap.x) * -treshold,
    safeSignZero(snap.y) * -treshold,
    safeSignZero(snap.z) * -treshold,
  );

  useEffect(() => {
    setCursorData({
      snapbox: new SnapBox({
        position: point,
        rotation: new Euler(0, yaw, 0),
        halfExtents: new Vector3(width, height, depth).addScalar(treshold),
      }),
      intersections: safeIntersections,
    })
  }, [point]);

  return (
    <>

      <group visible={false} rotation={[0, 0, 0]} ref={AABBRef} {...groupProps}>
        {children}
      </group>

      <mesh rotation={[0, yaw, 0]} position={point}>
        <boxGeometry args={[
          halfExtents.map(n => n * 2 + treshold)[0],
          halfExtents.map(n => n * 2 + treshold)[1],
          halfExtents.map(n => n * 2 + treshold)[2]
        ]} />
        <meshStandardMaterial wireframe={true} color={"red"} />
      </mesh>

      <group rotation={[0, yaw, 0]} position={point.clone().add(snap).add(cor)} {...groupProps}>
        {children}
      </group>
    </>
  );
}
