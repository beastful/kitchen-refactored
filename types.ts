import { Vector3, Color } from 'three';
import {
  CATEGORY_FLOOR,
  CATEGORY_ROOM,
  CATEGORY_TECH,
  CATEGORY_WALL,
  CONFIGURABLE_FLOOR,
  EXPLICT_CASE_DOUBLE,
  EXPLICT_CASE_EXTRA_QPI,
  EXPLICT_CASE_FOLD,
  EXPLICT_CASE_STRAIGHT,
  EXPLICT_CASE_TOP,
  EXPLICT_CASE_TUNNEL,
  EXPLICT_CASE_WINDOW,
  HAS_CONFIGURATION,
  HAS_TABLETOP,
  INCONFIGURABLE,
  ROTATATABLE,
} from './constants';
import { SnapPlane } from './snapping-tools/types';

export type CategoryTag =
  | typeof CATEGORY_ROOM
  | typeof CATEGORY_TECH
  | typeof CATEGORY_WALL
  | typeof CATEGORY_FLOOR
  | typeof CONFIGURABLE_FLOOR;

export type FeatureTag =
  | typeof HAS_TABLETOP
  | typeof INCONFIGURABLE
  | typeof HAS_CONFIGURATION
  | typeof ROTATATABLE;

export type CaseTag =
  | typeof EXPLICT_CASE_DOUBLE
  | typeof EXPLICT_CASE_TUNNEL
  | typeof EXPLICT_CASE_WINDOW
  | typeof EXPLICT_CASE_STRAIGHT
  | typeof EXPLICT_CASE_EXTRA_QPI
  | typeof EXPLICT_CASE_FOLD
  | typeof EXPLICT_CASE_TOP;

export type TabletopOption = [thickness: number, name: string, pricePerM2: number];

export type WallHeight = 0.6 | 0.7;

export type ModuleTag = CategoryTag | FeatureTag | CaseTag;

export type ModuleType = 'wall' | 'floor' | 'tall' | 'base' | 'corner' | 'tech' | 'room';

export interface ModuleDef {
  model: React.FC<any> | null | string;
  type: ModuleType;
  price: number;
  name: string;
  tags: ModuleTag[];
  image: string;
  displayName: string;
  displaySize: string;
}

export interface ModuleEntity {
  id: string;
  name: string;
  displayName: string;
  tags: readonly string[];
  image: string;
  fertile: boolean;
  type: string;
  handles: string;
  fineTuneRotation: number;
  handleVariant: number;
  handleColor: Color;
  hingeReplacement: number;
  price: number;
  size: Vector3;
  model: React.FC<any> | null | string;
  position: Vector3;
  normal: Vector3;
  lock: Vector3;
  lockX: boolean;
  lockY: boolean;
  lockZ: boolean;
  openAngle: number;
  facade: string;
  color: Color;
  snapPlanes: SnapPlane[];
  halfExtents: [number, number, number];
}

export type ModulePlacementSource = ModuleDef | ModuleEntity;

function isModuleEntity(source: ModulePlacementSource): source is ModuleEntity {
  return (
    'id' in source &&
    'position' in source &&
    source.position instanceof Vector3 &&
    'color' in source &&
    source.color instanceof Color
  );
}

function createModuleId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function toModuleEntity(source: ModuleDef, position: Vector3, normal?: Vector3): ModuleEntity;
export function toModuleEntity(source: ModuleEntity, position: Vector3, normal?: Vector3): ModuleEntity;
export function toModuleEntity(source: ModulePlacementSource, position: Vector3, normal?: Vector3): ModuleEntity {
  if (isModuleEntity(source)) {
    return {
      ...source,
      id: createModuleId(),
      tags: [...source.tags],
      handleColor: source.handleColor.clone(),
      size: source.size.clone(),
      model: source.model,
      position: position.clone(),
      normal: normal ? normal.clone() : source.normal.clone(),
      lock: source.lock.clone(),
      color: source.color.clone(),
      snapPlanes: source.snapPlanes.map((plane) => ({
        point: [...plane.point] as [number, number, number],
        normal: [...plane.normal] as [number, number, number],
      })),
      halfExtents: [...source.halfExtents] as [number, number, number],
    };
  }

  return {
    id: createModuleId(),
    name: source.name,
    displayName: source.displayName || source.name,
    tags: [...source.tags],
    image: source.image,
    fertile: true,
    type: source.type,
    handles: 'H',
    fineTuneRotation: 0,
    handleVariant: 1,
    handleColor: new Color('#807B77'),
    hingeReplacement: 0,
    price: source.price,
    size: new Vector3(0.6, 0.8, 0.6),
    model: source.model,
    position: position.clone(),
    normal: normal ? normal.clone() : new Vector3(0, 0, 1),
    lock: new Vector3(0, 0, 0),
    lockX: false,
    lockY: false,
    lockZ: false,
    openAngle: 0,
    facade: 'A',
    color: new Color('#CAC0B4'),
    snapPlanes: [],
    halfExtents: [0, 0, 0],
  };
}

export function toModuleDef(entity: ModuleEntity): ModuleDef {
  return {
    model: entity.model,
    type: entity.type as ModuleType,
    price: entity.price,
    name: entity.name,
    tags: entity.tags as ModuleTag[],
    image: entity.image,
    displayName: entity.displayName,
    displaySize: '',
  };
}

export interface AssemblerProps {
  src: string;
  entity: ModuleEntity;
}
