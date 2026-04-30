import { useRef, useState, useEffect, RefObject } from 'react';
import { Box3, Vector3, Object3D } from 'three';

type HalfExtents = [number, number, number];

/**
 * Hook to measure the bounding box of a group and return half‑extents.
 * 
 * @param deps - Optional dependency array to re‑measure (e.g., when children change)
 * @returns A tuple: [ref, halfExtents, fullSize]
 */
export function useBoundingBox<T extends Object3D = Object3D>(
    deps: React.DependencyList = []
): [RefObject<T | null>, HalfExtents, Vector3] {
    const ref = useRef<T>(null);
    const [halfExtents, setHalfExtents] = useState<HalfExtents>([0.5, 0.5, 0.5]);
    const [fullSize, setFullSize] = useState<Vector3>(new Vector3(1, 1, 1));

    useEffect(() => {
        if (!ref.current) return;

        const bbox = new Box3().setFromObject(ref.current);
        const size = new Vector3();
        bbox.getSize(size);

        const safeSize = {
            x: Math.max(0.05, size.x),
            y: Math.max(0.05, size.y),
            z: Math.max(0.05, size.z),
        };

        setFullSize(new Vector3(safeSize.x, safeSize.y, safeSize.z));
        setHalfExtents([safeSize.x / 2, safeSize.y / 2, safeSize.z / 2]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ref, ...deps]); // ref is stable, deps control re-measure

    return [ref, halfExtents, fullSize];
}
