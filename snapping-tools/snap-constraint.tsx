import { useCallback, useEffect, useRef } from 'react';
import { useSnapContext } from "@/snapping-tools/snap-provider";
import { useBoundingBox } from "./hooks/use-bounding-box";
import { throttle } from 'lodash-es';
import { SnapConstraintUserDataType, SnapConstraintProps } from "./types";

export function SnapConstraint({
    useCursor = false,
    useDistance = false,
    ignoreNormals,
    radius = 0.1,
    children,
    roomWall = false,
    ...groupProps
}: SnapConstraintProps) {

    const snapContext = useSnapContext();
    const [ref, halfExtents] = useBoundingBox();
    const realRef = useRef(null);

    const throttledSetPointer = useCallback(
        throttle((e: any) => {
            snapContext.pointerEventRef.current = e;
            snapContext.cursorVisibleRef.current = true;
        }, 10),
        [snapContext]
    );

    const userData: SnapConstraintUserDataType = {
        useCursor,
        useDistance,
        ignoreNormals: ignoreNormals ?? [],
        roomWall,
    };

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
