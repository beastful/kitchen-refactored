import { Mesh, Vector3 } from "three";
import { Box3, Object3D, Matrix4 } from 'three';
import { MutableRefObject } from 'react';
import { Intersection, SnapPlane } from "./types";

export function getYawFromNormal(normal: Vector3): number {
    const flatX = normal.x;
    const flatZ = normal.z;
    if (Math.abs(flatX) < 1e-6 && Math.abs(flatZ) < 1e-6) {
        return 0;
    }
    const angle = Math.atan2(flatX, flatZ);
    return angle;
}

const boxA = new Box3();
const boxB = new Box3();

export function checkIntersection(
    refA: MutableRefObject<Object3D | null>,
    refB: MutableRefObject<Object3D | null>
): [boolean, Vector3, Vector3, Vector3, Vector3] {
    const objA = refA.current;
    const objB = refB.current;
    if (!objA || !objB) return [false, new Vector3(), new Vector3(), new Vector3(), new Vector3()];

    boxA.setFromObject(objA);
    boxB.setFromObject(objB);

    const centerA = new Vector3();
    const centerB = new Vector3();

    const sizeA = new Vector3();
    const sizeB = new Vector3();

    boxA.getCenter(centerA);
    boxB.getCenter(centerB);

    boxA.getSize(sizeA);
    boxB.getSize(sizeB);

    return [boxA.intersectsBox(boxB), centerA, centerB, sizeA, sizeB];
}

const _boxA = new Box3();
const _boxB = new Box3();
const _center = new Vector3();
const _size = new Vector3();
const _matrix = new Matrix4();

export function checkIntersectionFast(
    refA: MutableRefObject<Object3D | null>,
    refB: MutableRefObject<Object3D | null>
): [boolean, Vector3, Vector3, Vector3, Vector3] {
    const objA = refA.current;
    const objB = refB.current;

    if (!objA || !objB) {
        return [false, _center.clone(), _center.clone(), _size.clone(), _size.clone()];
    }

    const geoA = (objA as any).geometry;
    const geoB = (objB as any).geometry;

    if (!geoA?.boundingBox || !geoB?.boundingBox) {
        return checkIntersection(refA, refB);
    }

    _boxA.copy(geoA.boundingBox);
    _boxB.copy(geoB.boundingBox);

    objA.updateWorldMatrix(true, false);
    objB.updateWorldMatrix(true, false);

    _boxA.applyMatrix4(objA.matrixWorld);
    _boxB.applyMatrix4(objB.matrixWorld);

    _boxA.getCenter(_center);
    const centerA = _center.clone();

    _boxB.getCenter(_center);
    const centerB = _center.clone();

    _boxA.getSize(_size);
    const sizeA = _size.clone();

    _boxB.getSize(_size);
    const sizeB = _size.clone();

    return [_boxA.intersectsBox(_boxB), centerA, centerB, sizeA, sizeB];
}

export function getBoxFromArgs(mesh: Mesh, outBox: Box3): void {
    const args = (mesh.geometry as any).parameters as { width: number; height: number; depth: number };
    const halfW = args.width / 2;
    const halfH = args.height / 2;
    const halfD = args.depth / 2;

    outBox.min.set(-halfW, -halfH, -halfD);
    outBox.max.set(halfW, halfH, halfD);
    outBox.applyMatrix4(mesh.matrixWorld);
}

export function getDominantIntersectionNormal(
    refA: MutableRefObject<Object3D | null>,
    refB: MutableRefObject<Object3D | null>
): Vector3 | null {
    const objA = refA.current;
    const objB = refB.current;
    if (!objA || !objB) return null;

    const boxA = new Box3().setFromObject(objA);
    const boxB = new Box3().setFromObject(objB);

    if (!boxA.intersectsBox(boxB)) return null;

    const [minA, maxA] = [boxA.min, boxA.max];
    const [minB, maxB] = [boxB.min, boxB.max];

    let bestDepth = Infinity;
    let bestWorldNormal: Vector3 | null = null;

    const axes: [number, Vector3][] = [
        [0, new Vector3(1, 0, 0)],
        [1, new Vector3(0, 1, 0)],
        [2, new Vector3(0, 0, 1)]
    ];

    for (const [idx, axisDir] of axes) {
        const aMin = minA.getComponent(idx);
        const aMax = maxA.getComponent(idx);
        const bMin = minB.getComponent(idx);
        const bMax = maxB.getComponent(idx);

        const depthPos = aMax - bMin;
        if (depthPos > 0 && depthPos < bestDepth) {
            bestDepth = depthPos;
            bestWorldNormal = axisDir.clone();
        }

        const depthNeg = bMax - aMin;
        if (depthNeg > 0 && depthNeg < bestDepth) {
            bestDepth = depthNeg;
            bestWorldNormal = axisDir.clone().negate();
        }
    }

    if (!bestWorldNormal) return null;

    const localNormal = bestWorldNormal.clone().transformDirection(objA.matrixWorld.clone().invert()).normalize();

    return localNormal;
}

export function distanceSqToAABB(point: Vector3, box: Box3): number {
  const dx = Math.max(box.min.x - point.x, 0, point.x - box.max.x);
  const dy = Math.max(box.min.y - point.y, 0, point.y - box.max.y);
  const dz = Math.max(box.min.z - point.z, 0, point.z - box.max.z);
  return dx * dx + dy * dy + dz * dz;
}

export function computeSnappedPosition(
  cursorPos: Vector3,
  intersections: Intersection[],
  cursorHalfExtents: Vector3,
  yaw: number,
  out: Vector3,
): Vector3 {
  out.copy(cursorPos);
  const locked = { x: false, y: false, z: false };

  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const worldHalfX = Math.abs(cursorHalfExtents.x * cos) + Math.abs(cursorHalfExtents.z * sin);
  const worldHalfZ = Math.abs(cursorHalfExtents.x * sin) + Math.abs(cursorHalfExtents.z * cos);

  for (const [center, targetSize, normal] of intersections) {
    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);
    const axis = absX > absY && absX > absZ ? 'x' : absY > absZ ? 'y' : 'z';
    if (locked[axis]) continue;
    locked[axis] = true;

    const dir = Math.sign(normal[axis]);
    const surface = center[axis] + targetSize[axis] * 0.5 * dir;
    const half = axis === 'y' ? cursorHalfExtents.y : (axis === 'x' ? worldHalfX : worldHalfZ);
    out[axis] = surface + half * dir;
  }

  return out;
}

export function buildSnapPlanes(intersections: Intersection[]): SnapPlane[] {
  return intersections.map(([center, targetSize, normal]) => {
    const absX = Math.abs(normal.x);
    const absY = Math.abs(normal.y);
    const absZ = Math.abs(normal.z);
    const axis = absX > absY && absX > absZ ? 'x' : absY > absZ ? 'y' : 'z';
    const dir = Math.sign(normal[axis]);
    const surface = center[axis] + targetSize[axis] * 0.5 * dir;

    const point: [number, number, number] = [center.x, center.y, center.z];
    point[axis === 'x' ? 0 : axis === 'y' ? 1 : 2] = surface;

    return { point, normal: [normal.x, normal.y, normal.z] as [number, number, number] };
  });
}
