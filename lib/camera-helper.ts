'use client';

import * as THREE from 'three';

/**
 * Минимальный интерфейс OrbitControls, который нам нужен.
 */
interface ControlsLike {
  target: THREE.Vector3;
  update: () => void;
  maxDistance?: number;
  minDistance?: number;
}

let _camera: THREE.PerspectiveCamera | null = null;
let _controls: ControlsLike | null = null;

/* ── Сохранённое состояние ── */
const _savedPosition = new THREE.Vector3();
const _savedTarget = new THREE.Vector3();
let _savedMaxDistance = 10;
let _savedMinDistance = 0;

/* Ракурс, в который сбрасываем камеру для превью (вид слева-спереди-сверху, чтобы были видны фасады, а не правая стена) */
const DEFAULT_POSITION = new THREE.Vector3(-8, 2, 3);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);

/**
 * Вызывается изнутри R3F Canvas, когда камера и OrbitControls готовы.
 */
export function registerCamera(
  camera: THREE.PerspectiveCamera,
  controls: ControlsLike,
): void {
  _camera = camera;
  _controls = controls;
}

/**
 * Проверяет, зарегистрирована ли камера.
 */
export function isCameraReady(): boolean {
  return _camera !== null && _controls !== null;
}

/**
 * Запоминает текущее положение камеры и сбрасывает в изначальный ракурс.
 * Возвращает true, если сброс выполнен.
 */
export function saveAndResetCamera(): boolean {
  if (!_camera || !_controls) return false;

  // Сохраняем текущее состояние
  _savedPosition.copy(_camera.position);
  _savedTarget.copy(_controls.target);
  _savedMaxDistance = _controls.maxDistance ?? 10;
  _savedMinDistance = _controls.minDistance ?? 0;

  // Временно убираем лимиты, чтобы камера гарантированно встала в нужную точку
  _controls.maxDistance = 20;
  _controls.minDistance = 0;

  // Сбрасываем в изначальный ракурс
  _camera.position.copy(DEFAULT_POSITION);
  _controls.target.copy(DEFAULT_TARGET);
  _controls.update();

  return true;
}

/**
 * Возвращает камеру в то положение, которое было до вызова saveAndResetCamera().
 */
export function restoreCamera(): void {
  if (!_camera || !_controls) return;

  _camera.position.copy(_savedPosition);
  _controls.target.copy(_savedTarget);
  _controls.maxDistance = _savedMaxDistance;
  _controls.minDistance = _savedMinDistance;
  _controls.update();
}
