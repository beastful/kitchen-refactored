import { TabletopOption, WallHeight } from "./types"

export const WALL_THICKNESS = 0.05
export const HAS_TABLETOP = "has_tabletop"
export const INCONFIGURABLE = "inconfigurable"
export const EXPLICT_CASE_DOUBLE = "explict_case_double"
export const EXPLICT_CASE_TUNNEL = "explict_case_tunnel"
export const EXPLICT_CASE_WINDOW = "explict_case_window"
export const EXPLICT_CASE_STRAIGHT = "explict_case_straight"
export const EXPLICT_CASE_EXTRA_QPI = "explict_case_extra_qpi"
export const EXPLICT_CASE_FOLD = "explict_case_fold"
export const EXPLICT_CASE_TOP = "explict_case_top"
export const CATEGORY_ROOM = "category_room"
export const CATEGORY_TECH = "category_tech"
export const CATEGORY_WALL = "category_wall"
export const CATEGORY_FLOOR = "category_floor"
export const CONFIGURABLE_FLOOR = "configurable_floor"
export const HAS_CONFIGURATION = "has_configuration"
export const ROTATATABLE = "rotatable"

export const COLORS = [
    '#617774', '#CAC0B4', '#F9F8F4', '#F8F1D7',
    '#8E8478', '#256668', '#807B77', '#B3C7D7',
    '#B8D1C7', '#705A4C'
] as const

export const TABLETOP_OPTIONS: TabletopOption[] = [
    [0.026, 'Скиф 26', 600],
    [0.038, 'Скиф 38', 1500],
    [0.038, 'Союз 38', 800]
]

export const WALL_HEIGHTS: WallHeight[] = [0.6, 0.7]
export const OPEN_ANGLE_SNAP = Math.PI * 0.4

export const FACADE_TYPES = ['A', 'B', 'C', 'Flat'];
export const HANDLE_TYPES = ['V', 'H'];
export const HANDLE_VARIANTS = [0, 1, 2, 3, 4];
