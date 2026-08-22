import { EXPLICT_CASE_WINDOW } from "@/constants";
import { Vector3 } from "three";
import { ModuleEntity } from "@/types";
import { useSnapshot } from "valtio";
import { useSnapContext } from "@/snapping-tools/snap-provider";
import { Store, store } from "@/store";
import {
    FLOOR_MODULE_HEIGHT,
    getFloorModuleCenterY,
} from "@/lib/placement-geometry";

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
    if (snap.currentRawModule?.name == "Microwave" || snap.currentRawModule?.name == "Door" || snap.currentRawModule?.name == "Window" || snap.currentRawModule?.name == "Refrigirator" || snap.currentRawModule?.name == "Stove") {
       
        return {
            lockX: false,
            lockY: false,
            lockZ: false,
            lock: new Vector3(0, 0, 0)
        }
    }

    let wallY = 1;
    // Floor modules are centered at half their full 880 mm height.
    // Keeping this derived from one constant leaves room for a future
    // 100 mm plinth option without another magic offset here.
    const floorY = entityType === 'floor'
        ? getFloorModuleCenterY(snap.room.h, FLOOR_MODULE_HEIGHT / 2)
        : -snap.room.h / 2 + 0.43;

    if (snap.currentRawModule.tags.includes(EXPLICT_CASE_WINDOW)) {
        wallY = -(snap.room.h / 2 - state.halfExtents.y) + 0.5
    } else {
        wallY = -(snap.room.h / 2 - state.halfExtents.y) + snap.wallHeight + 0.9;
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
    let wallY = 1;
    // Floor modules are centered at half their full 880 mm height.
    // Keeping this derived from one constant leaves room for a future
    // 100 mm plinth option without another magic offset here.
    const floorY = mod.type === 'floor'
        ? getFloorModuleCenterY(snap.room.h, FLOOR_MODULE_HEIGHT / 2)
        : -snap.room.h / 2 + 0.43;

    if (mod.tags.includes(EXPLICT_CASE_WINDOW)) {
        wallY = -(snap.room.h / 2 - mod.halfExtents[1]) + 0.5
    } else {
        wallY = -(snap.room.h / 2 - mod.halfExtents[1]) + snap.wallHeight + 0.9;
    }

    if (mod.name == "Microwave" || mod.name == "Door" || mod.name == "Window" || mod.name == "Refrigirator" || snap.currentRawModule?.name == "Stove") {
        
        return {
            lockX: false,
            lockY: false,
            lockZ: false,
            lock: new Vector3(0, 0, 0)
        }
    }

    

    return {
        lockX: false,
        lockY: true,
        lockZ: false,
        lock: new Vector3(0, entityType == "wall" ? wallY : floorY, 0),
    }
}
