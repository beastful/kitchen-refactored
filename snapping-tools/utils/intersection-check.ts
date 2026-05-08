import { Vector3, Euler } from 'three';

class SnapBox {
    position: Vector3;
    rotation: Euler;
    halfExtents: Vector3;

    constructor({ position, rotation, halfExtents }: { position: Vector3; rotation: Euler; halfExtents: Vector3 }) {
        this.position = position;
        this.rotation = rotation;
        this.halfExtents = halfExtents;
    }
}

// Get the three local axes (normalised) after applying the Euler rotation
function getAxes(rotation: Euler): [Vector3, Vector3, Vector3] {
    const xAxis = new Vector3(1, 0, 0).applyEuler(rotation);
    const yAxis = new Vector3(0, 1, 0).applyEuler(rotation);
    const zAxis = new Vector3(0, 0, 1).applyEuler(rotation);
    return [xAxis, yAxis, zAxis];
}

// Project an OBB onto an axis, returns [min, max]
function projectOBB(
    position: Vector3,
    halfExtents: Vector3,
    axes: [Vector3, Vector3, Vector3],
    axis: Vector3
): [number, number] {
    const centerProjection = position.dot(axis);
    const rx = halfExtents.x * Math.abs(axes[0].dot(axis));
    const ry = halfExtents.y * Math.abs(axes[1].dot(axis));
    const rz = halfExtents.z * Math.abs(axes[2].dot(axis));
    const extent = rx + ry + rz;
    return [centerProjection - extent, centerProjection + extent];
}

// SAT test between two oriented bounding boxes
export function intersectSnapBox(box1: SnapBox, box2: SnapBox): boolean {
    const axes1 = getAxes(box1.rotation);
    const axes2 = getAxes(box2.rotation);

    // Test axes: 3 from box1, 3 from box2, and 9 cross products
    const testAxes: Vector3[] = [...axes1, ...axes2];

    // Add cross product axes
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const cross = new Vector3().crossVectors(axes1[i], axes2[j]);
            if (cross.length() > 1e-6) {
                testAxes.push(cross.clone().normalize());
            }
        }
    }

    for (const axis of testAxes) {
        const [min1, max1] = projectOBB(box1.position, box1.halfExtents, axes1, axis);
        const [min2, max2] = projectOBB(box2.position, box2.halfExtents, axes2, axis);
        if (max1 < min2 || max2 < min1) {
            return false; // Separating axis found
        }
    }
    return true; // Overlap
}

export function getOverlapOnWorldAxis(box1: SnapBox, box2: SnapBox, worldAxis: Vector3): number {
    const axes1 = getAxes(box1.rotation);
    const axes2 = getAxes(box2.rotation);
    const [min1, max1] = projectOBB(box1.position, box1.halfExtents, axes1, worldAxis);
    const [min2, max2] = projectOBB(box2.position, box2.halfExtents, axes2, worldAxis);
    const overlap = Math.min(max1, max2) - Math.max(min1, min2);
    return Math.max(0, overlap);
}

export function getNonOverlappingXPositions(hit: SnapBox, intersections: SnapBox[]): number[] {
    // Calculate hit's X interval
    const hitMinX = hit.position.x - hit.halfExtents.x;
    const hitMaxX = hit.position.x + hit.halfExtents.x;
    const hitSizeX = hit.halfExtents.x * 2;

    const positions: number[] = [];

    for (const other of intersections) {
        // Calculate other's X interval
        const otherMinX = other.position.x - other.halfExtents.x;
        const otherMaxX = other.position.x + other.halfExtents.x;
        const otherSizeX = other.halfExtents.x * 2;

        // Check if they overlap on X axis
        const overlapOnX = hitMinX < otherMaxX && hitMaxX > otherMinX;

        if (overlapOnX) {
            // Calculate the two possible non-overlapping positions:
            // Place hit to the RIGHT of other: other's right edge + hit's half-width
            const rightPosition = otherMaxX + hit.halfExtents.x;

            // Place hit to the LEFT of other: other's left edge - hit's half-width
            const leftPosition = otherMinX - hit.halfExtents.x;

            // Add both candidates (caller decides which to use based on cursor proximity)
            positions.push(rightPosition, leftPosition);
        }
    }

    return positions;
}

import { Matrix4 } from 'three'; // or your math library

/**
 * Returns the three local axes of a box (unit vectors in world space)
 * given its rotation as an Euler.
 */
function getLocalAxes(rotation: Euler): Vector3[] {
    const matrix = new Matrix4().makeRotationFromEuler(rotation);
    const localX = new Vector3(1, 0, 0).applyMatrix4(matrix);
    const localY = new Vector3(0, 1, 0).applyMatrix4(matrix);
    const localZ = new Vector3(0, 0, 1).applyMatrix4(matrix);
    return [localX, localY, localZ];
}

/**
 * Projected half‑extent of a box onto a world direction vector (axis).
 * r = hx * |axis·localX| + hy * |axis·localY| + hz * |axis·localZ|
 */
function getProjectedHalfExtent(box: SnapBox, axis: Vector3): number {
    const [localX, localY, localZ] = getLocalAxes(box.rotation);
    const hx = box.halfExtents.x;
    const hy = box.halfExtents.y;
    const hz = box.halfExtents.z;

    return hx * Math.abs(axis.dot(localX)) +
        hy * Math.abs(axis.dot(localY)) +
        hz * Math.abs(axis.dot(localZ));
}

/**
 * Overlap depth (penetration) between two boxes on a given world axis.
 * Returns 0 if the projections do not intersect.
 */
function getOverlapDepthOnAxis(boxA: SnapBox, boxB: SnapBox, axis: Vector3): number {
    const centerA = boxA.position.dot(axis);
    const centerB = boxB.position.dot(axis);
    const rA = getProjectedHalfExtent(boxA, axis);
    const rB = getProjectedHalfExtent(boxB, axis);

    const minA = centerA - rA;
    const maxA = centerA + rA;
    const minB = centerB - rB;
    const maxB = centerB + rB;

    const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
    return Math.max(0, overlap);
}

export function getDominantXOverlaps(hit: SnapBox, intersections: SnapBox[]): number[] {
    const positions: number[] = [];
    const xAxis = new Vector3(1, 0, 0);
    const yAxis = new Vector3(0, 1, 0);
    const zAxis = new Vector3(0, 0, 1);

    for (const other of intersections) {
        // Penetration depths on the three world axes
        const overlapX = getOverlapDepthOnAxis(hit, other, xAxis);
        const overlapY = getOverlapDepthOnAxis(hit, other, yAxis);
        const overlapZ = getOverlapDepthOnAxis(hit, other, zAxis);

        // Only consider if X penetration is strictly larger than both Y and Z
        if (overlapX > 0 && overlapX > overlapY && overlapX > overlapZ) {
            const rHitX = getProjectedHalfExtent(hit, xAxis);
            const rOtherX = getProjectedHalfExtent(other, xAxis);

            // Projected interval of 'other' onto the X axis
            const otherCenterX = other.position.x;  // = other.position.dot(xAxis)
            const otherMinX = otherCenterX - rOtherX;
            const otherMaxX = otherCenterX + rOtherX;

            // Candidate X positions for 'hit' to resolve the collision:
            // Right side escape (hit’s left side touches other’s right side)
            positions.push(otherMaxX + rHitX);
            // Left side escape (hit’s right side touches other’s left side)
            positions.push(otherMinX - rHitX);
        }
    }

    return positions;
}
