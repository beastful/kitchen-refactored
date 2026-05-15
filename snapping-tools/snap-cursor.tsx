import { useSnapContext } from "@/snapping-tools/snap-provider";
import { useSnapCursorTransform } from './hooks/use-cursor-transform';
import { SnapCursorProps, Intersection, BoxArgs } from './types';
import { useFrame } from "@react-three/fiber";
import { buildSnapPlanes, checkIntersectionFast, computeSnappedPosition, distanceSqToAABB, getDominantIntersectionNormal } from "./utils";
import { useRef } from "react";
import { Group, Mesh, Vector3, Box3 } from "three";
import { useSnapCursor } from "./hooks/use-snap-cursor";
import { SNAP_RADIUS, THROTTLE } from "./constants";

const _v1 = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _bConstraint = new Box3();

export function SnapCursor({ children, lockY = true, lock, ...groupProps }: SnapCursorProps) {
  const snapContext = useSnapContext();
  const { position: cursorActualPos, rotationYaw, boundingBoxRef, halfExtents } = useSnapCursorTransform();
  const { updateCursorState } = useSnapCursor();

  const visualRef = useRef<Group>(null);
  const hitboxRef = useRef<Mesh>(null);
  const previewRef = useRef<Mesh>(null);
  const frameCount = useRef(0);

  const cursorHalf = new Vector3(halfExtents[0], halfExtents[1], halfExtents[2]);
  const boxArgs = halfExtents.map(n => n * 2) as BoxArgs;
  const hitboxArgs = boxArgs.map(n => n + SNAP_RADIUS * 2) as BoxArgs;
  const cursorPos = new Vector3(
    cursorActualPos.x,
    lockY == true ? lock.y :  cursorActualPos.y,
    cursorActualPos.z,
  )

  useFrame((_state, _dt) => {
    visualRef.current?.position.copy(cursorPos);
    visualRef.current?.rotation.set(0, rotationYaw, 0);
    hitboxRef.current?.position.copy(cursorPos);
    hitboxRef.current?.rotation.set(0, rotationYaw, 0);
    hitboxRef.current?.updateMatrixWorld();

    if (++frameCount.current % THROTTLE !== 0) return;

    const intersections: Intersection[] = [];
    const MAX_DIST_SQ = 4; // 2²

    const cursorWorldPos = _v1.copy(cursorPos);

    visualRef.current?.localToWorld(cursorWorldPos);

    snapContext.queryConstraints(({ ref: constraint, userData }) => {
      if (!userData.useDistance) return;

      const constraintObj = constraint.current;
      if (!constraintObj) return;

      _bConstraint.setFromObject(constraintObj);
      const distSq = distanceSqToAABB(cursorWorldPos, _bConstraint);

      if (distSq > MAX_DIST_SQ) return;

      const [hits, targetCenter, , targetSize] = checkIntersectionFast(constraint, hitboxRef);
      if (!hits) return;

      const normal = getDominantIntersectionNormal(constraint, hitboxRef);
      if (!normal) return;

      _v2.copy(normal).transformDirection(constraintObj.matrixWorld).normalize();
      intersections.push([targetCenter, targetSize, _v2.clone()]);
    });

    const isSnapped = intersections.length > 0;
    const snapPos = isSnapped
      ? computeSnappedPosition(cursorPos, intersections, cursorHalf, rotationYaw, _v3)
      : cursorPos;

    const snapPosition = isSnapped ? snapPos : cursorPos;

    previewRef.current?.position.copy(snapPosition);
    previewRef.current?.rotation.set(0, rotationYaw, 0);

    const snapPlanes = isSnapped ? buildSnapPlanes(intersections) : [];

    updateCursorState({
      position: cursorPos,
      rotation: rotationYaw,
      isSnapped,
      snapPosition: snapPosition,
      halfExtents: cursorHalf,
      snapPlanes,
    });
  });

  return (
    <>
      <group scale={groupProps.scale} visible={false} ref={boundingBoxRef}>
        {children}
      </group>

      {snapContext.cursorVisible && (
        <>
          <group ref={visualRef} scale={groupProps.scale}>
            {children}
          </group>

          <mesh ref={hitboxRef} visible={false}>
            <boxGeometry args={hitboxArgs} />
          </mesh>

          <mesh ref={previewRef}>
            <boxGeometry args={boxArgs} />
            <meshStandardMaterial wireframe color="violet" />
          </mesh>
        </>
      )}
    </>
  );
}
