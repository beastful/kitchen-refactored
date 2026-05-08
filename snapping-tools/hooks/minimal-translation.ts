// ----------------------------------------------------------------------
// Minimal Vector3 class – replace with your own if needed
// ----------------------------------------------------------------------
class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    clone() { return new Vector3(this.x, this.y, this.z); }
    add(v) { this.x += v.x; this.y += v.y; this.z += v.z; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; this.z -= v.z; return this; }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) { return new Vector3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x); }
    length() { return Math.hypot(this.x, this.y, this.z); }
    normalize() { const len = this.length(); if (len > 1e-8) { this.x /= len; this.y /= len; this.z /= len; } return this; }
    scale(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    static sub(a, b) { return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z); }
    static dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
    static cross(a, b) { return new Vector3(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x); }
}

// ----------------------------------------------------------------------
// Convert an Euler (XYZ order) to a 3x3 rotation matrix (array of 3 Vector3 columns)
// ----------------------------------------------------------------------
function eulerToMatrix(euler) {
    const cx = Math.cos(euler.x), cy = Math.cos(euler.y), cz = Math.cos(euler.z);
    const sx = Math.sin(euler.x), sy = Math.sin(euler.y), sz = Math.sin(euler.z);
    return [
        new Vector3(cy * cz, cy * sz, -sy),                                 // X column (local X in world)
        new Vector3(sx * sy * cz - cx * sz, sx * sy * sz + cx * cz, sx * cy), // Y column
        new Vector3(cx * sy * cz + sx * sz, cx * sy * sz - sx * cz, cx * cy)  // Z column
    ];
}

// ----------------------------------------------------------------------
// Get the three world axes of a SnapBox (from its rotation)
// ----------------------------------------------------------------------
function getBoxAxes(box) {
    const m = eulerToMatrix(box.rotation);
    return [m[0].clone().normalize(), m[1].clone().normalize(), m[2].clone().normalize()];
}

// ----------------------------------------------------------------------
// Projection radius of a box onto a unit axis
// radius = Σ |axis · localAxis_i| * halfExtents_i
// ----------------------------------------------------------------------
function projectionRadius(box, axis) {
    const axes = getBoxAxes(box);
    const he = box.halfExtents;
    return Math.abs(axis.dot(axes[0])) * he.x +
        Math.abs(axis.dot(axes[1])) * he.y +
        Math.abs(axis.dot(axes[2])) * he.z;
}

// ----------------------------------------------------------------------
// Return all 15 separating axes for two boxes A and B, with duplicates removed
// ----------------------------------------------------------------------
function getSeparatingAxes(boxA, boxB) {
    const axesA = getBoxAxes(boxA);
    const axesB = getBoxAxes(boxB);
    const axes = [];

    for (let i = 0; i < 3; i++) axes.push(axesA[i]);
    for (let i = 0; i < 3; i++) axes.push(axesB[i]);
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            const cross = Vector3.cross(axesA[i], axesB[j]);
            if (cross.length() > 1e-8) axes.push(cross.normalize());
        }
    }

    // Remove duplicates (same or opposite direction)
    const unique = [];
    for (const a of axes) {
        let found = false;
        for (const u of unique) {
            if (Math.abs(a.dot(u)) > 0.9999) { found = true; break; }
        }
        if (!found) unique.push(a);
    }
    return unique;
}

// ----------------------------------------------------------------------
// Check if translating 'hit' by vector v resolves ALL intersections
// ----------------------------------------------------------------------
function resolvesAll(v, hit, intersections) {
    const hitPosNew = hit.position.clone().add(v);
    for (const other of intersections) {
        let separated = false;
        const axes = getSeparatingAxes(hit, other);
        for (const axis of axes) {
            const rHit = projectionRadius(hit, axis);
            const rOther = projectionRadius(other, axis);
            const projDiff = Vector3.dot(Vector3.sub(other.position, hitPosNew), axis);
            const overlap = (rHit + rOther) - Math.abs(projDiff);
            if (overlap <= 1e-6) {
                separated = true;
                break;
            }
        }
        if (!separated) return false;
    }
    return true;
}

// ----------------------------------------------------------------------
// Solve v·n1 = d1 , v·n2 = d2 for the minimum‑norm v
// ----------------------------------------------------------------------
function solve2Planes(n1, d1, n2, d2) {
    const dot11 = n1.dot(n1);
    const dot12 = n1.dot(n2);
    const dot22 = n2.dot(n2);
    const det = dot11 * dot22 - dot12 * dot12;
    if (Math.abs(det) < 1e-8) return null;
    const λ = (d1 * dot22 - d2 * dot12) / det;
    const μ = (d2 * dot11 - d1 * dot12) / det;
    return n1.clone().scale(λ).add(n2.clone().scale(μ));
}

// ----------------------------------------------------------------------
// Solve v·n1 = d1 , v·n2 = d2 , v·n3 = d3
// ----------------------------------------------------------------------
function solve3Planes(n1, d1, n2, d2, n3, d3) {
    // v = (d1 * cross(n2,n3) + d2 * cross(n3,n1) + d3 * cross(n1,n2)) / det
    const c23 = Vector3.cross(n2, n3);
    const det = n1.dot(c23);
    if (Math.abs(det) < 1e-8) return null;
    const v = c23.clone().scale(d1)
        .add(Vector3.cross(n3, n1).scale(d2))
        .add(Vector3.cross(n1, n2).scale(d3));
    v.scale(1 / det);
    return v;
}

// ----------------------------------------------------------------------
// Iterative pairwise depenetration – robust fallback when the exact
// candidate search fails (rare, but guarantees a valid vector)
// ----------------------------------------------------------------------
function iterativeResolve(hit, intersections) {
    const pos = hit.position.clone();
    const totalV = new Vector3(0, 0, 0);
    for (let iter = 0; iter < 20; iter++) {
        let anyOverlap = false;
        for (const other of intersections) {
            const axes = getSeparatingAxes(hit, other);
            const diff = Vector3.sub(other.position, pos);
            let worstPen = -Infinity;
            let bestAxis = null;
            let bestSide = 0;

            for (const axis of axes) {
                const rHit = projectionRadius(hit, axis);
                const rOther = projectionRadius(other, axis);
                const proj = diff.dot(axis);
                const pen = (rHit + rOther) - Math.abs(proj);
                if (pen > worstPen) {
                    worstPen = pen;
                    bestAxis = axis;
                    bestSide = proj >= 0 ? -1 : 1; // push away from other
                }
            }

            if (worstPen > 1e-6) {
                const push = bestAxis.clone().scale(bestSide * (worstPen + 1e-4));
                pos.add(push);
                totalV.add(push);
                anyOverlap = true;
            }
        }
        if (!anyOverlap) break;
    }
    return totalV;
}

// ----------------------------------------------------------------------
// Main function: compute minimal translation vector for the hit OBB
// against all intersections OBBs.
// ----------------------------------------------------------------------
export function computeMinimalTranslation(hit, intersections) {
    if (!intersections || intersections.length === 0) return new Vector3(0, 0, 0);

    // ------------------------------------------------------------------
    // 0. Precompute one minimal constraint per axis for every other box
    //    (15 axes max, only the side that pushes the boxes apart)
    // ------------------------------------------------------------------
    const boxConstraints = [];
    for (const other of intersections) {
        const axes = getSeparatingAxes(hit, other);
        const diff = Vector3.sub(other.position, hit.position);
        const constraints = [];
        for (const axis of axes) {
            const rHit = projectionRadius(hit, axis);
            const rOther = projectionRadius(other, axis);
            const proj = diff.dot(axis);
            const R = rHit + rOther;
            // During overlap |proj| < R.  The minimal escape along this axis is:
            //   proj > 0  →  v·axis = proj - R   (negative, push back)
            //   proj <= 0 →  v·axis = proj + R   (positive, push forward)
            const boundary = proj >= 0 ? proj - R : proj + R;
            if (Math.abs(boundary) > 1e-8) {
                constraints.push({ axis, boundary });
            }
        }
        boxConstraints.push(constraints);
    }

    // ------------------------------------------------------------------
    // 1. Single‑axis candidates
    // ------------------------------------------------------------------
    const candidates = [];
    for (let i = 0; i < boxConstraints.length; i++) {
        for (const c of boxConstraints[i]) {
            candidates.push(c.axis.clone().scale(c.boundary));
        }
    }

    // ------------------------------------------------------------------
    // 2. Two‑plane intersections (different boxes)
    // ------------------------------------------------------------------
    const n = boxConstraints.length;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (const ci of boxConstraints[i]) {
                for (const cj of boxConstraints[j]) {
                    const v = solve2Planes(ci.axis, ci.boundary, cj.axis, cj.boundary);
                    if (v && v.length() > 1e-8) candidates.push(v);
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // 3. Three‑plane intersections (different boxes)
    //    In 3D the minimum of |v|² under linear constraints is always at
    //    a vertex defined by at most 3 active planes, so this makes the
    //    search exact.
    // ------------------------------------------------------------------
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            for (let k = j + 1; k < n; k++) {
                for (const ci of boxConstraints[i]) {
                    for (const cj of boxConstraints[j]) {
                        for (const ck of boxConstraints[k]) {
                            const v = solve3Planes(
                                ci.axis, ci.boundary,
                                cj.axis, cj.boundary,
                                ck.axis, ck.boundary
                            );
                            if (v && v.length() > 1e-8) candidates.push(v);
                        }
                    }
                }
            }
        }
    }

    // ------------------------------------------------------------------
    // 4. Test feasibility and pick the shortest valid candidate
    // ------------------------------------------------------------------
    let best = null;
    let bestLen = Infinity;
    for (const cand of candidates) {
        if (resolvesAll(cand, hit, intersections)) {
            const len = cand.length();
            if (len < bestLen) {
                bestLen = len;
                best = cand.clone();
            }
        }
    }

    // ------------------------------------------------------------------
    // 5. Fallback: iterative pairwise resolver (always returns a valid
    //    vector, though not necessarily the global minimum)
    // ------------------------------------------------------------------
    if (!best) {
        best = iterativeResolve(hit, intersections);
    }

    return best;
}
