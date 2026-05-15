import { CATEGORY_TECH, EXPLICT_CASE_WINDOW } from "@/constants";
import { Vector3 } from "three";
import { ModuleEntity } from "@/types";
import { useSnapshot } from "valtio";
import { useSnapContext } from "@/snapping-tools/snap-provider";
import { Store, store } from "@/store";

export function useLock() {
    const snap = useSnapshot(store)
    const { getCursorState } = useSnapContext();
    const state = getCursorState()

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
        wallY = -(snap.room.h / 2 - state.halfExtents.y) + 0.5
    } else {
        wallY = -(snap.room.h / 2 - state.halfExtents.y) + snap.wallHeight + 0.9;
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

export function getLock(mod: ModuleEntity, snap: Store) {
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
