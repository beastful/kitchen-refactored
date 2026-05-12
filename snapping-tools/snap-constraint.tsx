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
    ...groupProps
}: SnapConstraintProps) {

    const snapContext = useSnapContext();
    const [ref, halfExtents] = useBoundingBox();
    const realRef = useRef(null);

    const throttledSetPointer = useCallback(
        throttle((e: any) => {
            snapContext.setPointerEvent(e);
            snapContext.setCursorVisible(true);
        }, 10),
        [snapContext]
    );

    const userData: SnapConstraintUserDataType = {
        useCursor,
        useDistance,
        ignoreNormals: ignoreNormals ?? []
    };

    useEffect(() => {
        const id = Math.random().toString(36);
        const userData: SnapConstraintUserDataType = { useCursor, useDistance, ignoreNormals: ignoreNormals ?? [] };
        const unregister = snapContext.registerConstraint({
            id,
            ref: realRef,
            position: groupProps.position as [number, number, number],
            rotation: groupProps.rotation as [number, number, number],
            halfExtents,
            userData
        });
        return unregister;
    }, [useCursor, useDistance, ignoreNormals, halfExtents, snapContext]);

    return <>
        <group visible={false} scale={groupProps.scale} ref={ref}>{children}</group>
        <group
    
            ref={realRef}
            scale={groupProps.scale}
            position={groupProps.position}
            rotation={groupProps.rotation}
            onPointerEnter={(e) => {
                
                if (useCursor) {
                    e.stopPropagation();
                    snapContext.setCursorVisible(true)
                }
            }}
            onPointerOut={(e) => {
                
                if (useCursor) {
                    e.stopPropagation();
                    snapContext.setCursorVisible(false)
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
