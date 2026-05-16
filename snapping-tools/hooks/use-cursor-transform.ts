import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSnapContext } from '@/snapping-tools/snap-provider';
import { useBoundingBox } from './use-bounding-box';
import { getYawFromNormal } from '../utils';
import { Vector3, Matrix4 } from 'three';

export function useSnapCursorTransform() {
    const snapContext = useSnapContext();
    const [ref, halfExtents] = useBoundingBox();
    const resultRef = useRef({
        position: new Vector3(0, 0, 0),
        rotationYaw: 0,
        worldNormal: new Vector3(0, 1, 0),
    });
    useFrame(() => {
        const pointerEvent = snapContext.pointerEventRef.current;
        let worldNormal: Vector3, yaw: number, cursorPos: Vector3;
        if (pointerEvent?.object.matrixWorld && pointerEvent.normal) {
            const localNormal = pointerEvent.normal;
            worldNormal = localNormal.clone().transformDirection(pointerEvent.object.matrixWorld);
            yaw = getYawFromNormal(worldNormal);
            const rotMat = new Matrix4().makeRotationY(yaw);
            const localNormalRotated = worldNormal.clone().applyMatrix4(rotMat.clone().invert());
            const supportDist =
                Math.abs(localNormalRotated.x) * halfExtents[0] +
                Math.abs(localNormalRotated.y) * halfExtents[1] +
                Math.abs(localNormalRotated.z) * halfExtents[2];
            const offset = worldNormal.clone().multiplyScalar(supportDist);
            cursorPos = pointerEvent.point.clone().add(offset);
        } else {
            worldNormal = new Vector3(0, 1, 0);
            yaw = 0;
            cursorPos = new Vector3(0, 0, 0);
        }
        resultRef.current = { position: cursorPos, rotationYaw: yaw, worldNormal };
    });
    return { ...resultRef.current, boundingBoxRef: ref, halfExtents };
}
