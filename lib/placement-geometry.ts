/** Distance between a lower cabinet's rear face and a room wall. */
export const FLOOR_MODULE_WALL_GAP = 0.034;

/** Current standard lower-cabinet height, including its 150 mm plinth. */
export const FLOOR_MODULE_HEIGHT = 0.88;

/**
 * The top of the rendered room floor is 44 mm above the room's nominal floor
 * coordinate. RoomWalls uses a 30 mm floor slab centered 29 mm above that
 * coordinate, so floor modules must be centered from this top surface.
 */
export const ROOM_FLOOR_TOP_OFFSET = 0.044;

export function getFloorModuleCenterY(
  roomHeight: number,
  moduleHalfHeight: number,
): number {
  return -roomHeight / 2 + ROOM_FLOOR_TOP_OFFSET + moduleHalfHeight;
}

/** Standard countertop depth in world metres. */
export const TABLETOP_DEPTH = 0.7;

/** Desired countertop overhang beyond the front of a lower cabinet. */
export const TABLETOP_FRONT_OVERHANG = 0.03;
