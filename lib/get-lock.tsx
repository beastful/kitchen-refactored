import { CATEGORY_TECH, EXPLICT_CASE_WINDOW } from "@/constants";
import { useCursorData } from "@/snapping-tools/hooks/use-cursor-data";
import { store } from "@/store";
import { ModuleDef, ModuleEntity } from "@/types";
import { Vector3 } from "three";
import { useSnapshot } from "valtio";

interface GetLockByTypeType {
    lockX: boolean;
    lockY: boolean;
    lockZ: boolean;
    lock: Vector3;
}

export function getLockByType(): GetLockByTypeType {
    const snap = useSnapshot(store)
    const { cursorData } = useCursorData()

    if (!snap.currentRawModule) return {
        lockX: false,
        lockY: false,
        lockZ: false,
        lock: new Vector3(0, 0, 0)
    }

    const entityType = snap.currentRawModule.type
    const isTech = snap.currentRawModule.tags.includes(CATEGORY_TECH)
    let wallY = 1;
    let floorY = -snap.room.h / 2 + 0.43;

    if (snap.currentRawModule.tags.includes(EXPLICT_CASE_WINDOW)) {
        wallY = -(snap.room.h / 2 - cursorData.snapbox.halfExtents.y) + 0.5
    } else {
        wallY = -(snap.room.h / 2 - cursorData.snapbox.halfExtents.y) + snap.wallHeight + 0.9;
    }

    if (snap.currentRawModule.name == 'Door') {
        floorY = -snap.room.h / 2;
    }

    return {
        lockX: false,
        lockY: true,
        lockZ: false,
        lock: new Vector3(0, entityType == "wall" ? wallY : floorY, 0),
    }
}

export function getLock(mod: ModuleEntity, snap) {
    const entityType = mod.type
    const isTech = mod.tags.includes(CATEGORY_TECH)
    let wallY = 1;
    let floorY = -snap.room.h / 2 + 0.43;

    if (mod.tags.includes(EXPLICT_CASE_WINDOW)) {
        wallY = -(snap.room.h / 2 - mod.halfExtents[1]) + 0.5
    } else {
        wallY = -(snap.room.h / 2 - mod.halfExtents[1]) + snap.wallHeight + 0.9;
    }

    return {
        lockX: false,
        lockY: true,
        lockZ: false,
        lock: new Vector3(0, entityType == "wall" ? wallY : floorY, 0),
    }
}

