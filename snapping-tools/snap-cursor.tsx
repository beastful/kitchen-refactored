import { useSnapContext } from "@/snapping-tools/snap-provider";
import { useSnapCursorTransform } from './hooks/use-cursor-transform';
import { SnapCursorProps, Intersection, BoxArgs } from './types';
import { useFrame } from "@react-three/fiber";
import { buildSnapPlanes, checkIntersectionFast, computeSnappedPosition, distanceSqToAABB, getDominantIntersectionNormal } from "./utils";
import { useRef } from "react";
import { Group, Mesh, Vector3, Box3 } from "three";
import { useSnapCursor } from "./hooks/use-snap-cursor";
import { MAGNET_BOOST, MAGNET_DAMPING, MAGNET_DECAY, MAGNET_SMOOTH, MAX_DT, SNAP_RADIUS, THROTTLE } from "./constants";

const _b1 = new Box3();
const _v1 = new Vector3();
const _v2 = new Vector3();
const _v3 = new Vector3();
const _bConstraint = new Box3();

function createMagnet() {
  const state = {
    current: new Vector3(),
    vel: new Vector3(),
    wasSnapped: false,
    stickTimer: 0,
  };

  return {
    pos: state.current,
    update: (targetPos: Vector3, isSnapped: boolean, rawDt: number) => {
      const dt = Math.min(rawDt, MAX_DT);

      // Сброс таймера при входе в snap
      if (isSnapped && !state.wasSnapped) state.stickTimer = 0;
      if (isSnapped) state.stickTimer += dt;
      state.wasSnapped = isSnapped;

      if (isSnapped) {
        // ─── Режим примагничивания: пружина с демпфированием ───
        const boost = MAGNET_BOOST * Math.exp(-state.stickTimer * MAGNET_DECAY);
        const speed = MAGNET_SMOOTH + boost;
        const t = 1 - Math.exp(-speed * dt);

        _v1.copy(targetPos).sub(state.current).multiplyScalar(t);
        state.vel.add(_v1);
        state.vel.multiplyScalar(Math.exp(-MAGNET_DAMPING * dt));
        state.current.add(state.vel);
      } else {
        // ─── Режим движения: чистый lerp, без физики ───
        const t = 1 - Math.exp(-MAGNET_SMOOTH * dt);
        state.current.lerp(targetPos, t);

        // Важно: обнуляем скорость, чтобы при следующем snap
        // не было рывка от накопленной инерции свободного движения
        state.vel.set(0, 0, 0);
      }
    },
  };
}

export function SnapCursor({ children, ...groupProps }: SnapCursorProps) {
  const snapContext = useSnapContext();
  const { position: cursorPos, rotationYaw, boundingBoxRef, halfExtents } = useSnapCursorTransform();
  const { updateCursorState } = useSnapCursor();

  const visualRef = useRef<Group>(null);
  const hitboxRef = useRef<Mesh>(null);
  const previewRef = useRef<Mesh>(null);
  const frameCount = useRef(0);
  const magnet = useRef(createMagnet()).current;

  const cursorHalf = new Vector3(halfExtents[0], halfExtents[1], halfExtents[2]);
  const boxArgs = halfExtents.map(n => n * 2) as BoxArgs;
  const hitboxArgs = boxArgs.map(n => n + SNAP_RADIUS * 2) as BoxArgs;

  useFrame((_state, dt) => {
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

    if (isSnapped) {
      // ─── Режим snap: магнит с пружиной и затуханием ───
      magnet.update(snapPos, true, dt);
      previewRef.current?.position.copy(magnet.pos);
    } else {
      // ─── Режим движения: мгновенное следование за курсором ───
      previewRef.current?.position.copy(cursorPos);

      // Сбрасываем магнит, чтобы при следующем snap не было рывка
      // от накопленной инерции свободного движения
      magnet.pos.copy(cursorPos);
      magnet.update(cursorPos, false, dt); // обнуляет внутреннюю скорость
    }

    previewRef.current?.rotation.set(0, rotationYaw, 0);

    const snapPlanes = isSnapped ? buildSnapPlanes(intersections) : [];

    updateCursorState({
      position: cursorPos,
      rotation: rotationYaw,
      isSnapped,
      snapPosition: isSnapped ? snapPos : cursorPos,
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
