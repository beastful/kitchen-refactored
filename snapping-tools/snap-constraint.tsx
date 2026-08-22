import { useEffect, useMemo, useRef } from 'react';
import { useSnapContext } from "@/snapping-tools/snap-provider";
import { useBoundingBox } from "./hooks/use-bounding-box";
import { throttle } from 'lodash-es';
import { SnapConstraintUserDataType, SnapConstraintProps } from "./types";
import { Group } from 'three';
import { ThreeEvent } from '@react-three/fiber';

export function SnapConstraint({
    useCursor = false,
    useDistance = false,
    ignoreNormals,
    children,
    roomWall = false,
    radius: _radius = 0.1,
    ...groupProps
}: SnapConstraintProps) {

    const snapContext = useSnapContext();
    void _radius;
    const [ref, halfExtents] = useBoundingBox();
    const realRef = useRef<Group>(null);

    const throttledSetPointer = useMemo(
        () => throttle((e: ThreeEvent<PointerEvent>) => {
            snapContext.pointerEventRef.current = e;
            snapContext.cursorVisibleRef.current = true;
        }, 10),
        [snapContext]
    );

    useEffect(() => () => throttledSetPointer.cancel(), [throttledSetPointer]);

    useEffect(() => {
        const id = Math.random().toString(36);
        const userData: SnapConstraintUserDataType = {
            useCursor,
            useDistance,
            ignoreNormals: ignoreNormals ?? [],
            roomWall,
        };
        const unregister = snapContext.registerConstraint({
            id,
            ref: realRef,
            halfExtents,
            userData
        });
        return unregister;
    }, [useCursor, useDistance, ignoreNormals, halfExtents, roomWall, snapContext]);

    return <>
        <group visible={false} ref={ref}>{children}</group>
        <group
            ref={realRef}
            scale={groupProps.scale}
            position={groupProps.position}
            rotation={groupProps.rotation}
            onPointerEnter={(e) => {
                e.stopPropagation();
                if (useCursor) {
                    snapContext.cursorVisibleRef.current = false;
                }
            }}
            onPointerOut={(e) => {
                e.stopPropagation();
                if (useCursor) {
                    snapContext.cursorVisibleRef.current = false;
                }
            }}
            onPointerMove={(e) => {
                if (useCursor) {
                    e.stopPropagation();
                    throttledSetPointer(e)
                }
            }}>
            {children}
        </group>
    </>
}
