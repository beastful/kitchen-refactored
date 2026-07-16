'use client';

import { saveAndResetCamera, restoreCamera } from './camera-helper';

/**
 * Ищет canvas 3D-сцены на странице.
 * Сначала ищет <canvas class="config-scene">,
 * затем .config-scene canvas, затем любой canvas.
 */
export function getSceneCanvas(): HTMLCanvasElement | null {
  const direct = document.querySelector('canvas.config-scene');
  if (direct instanceof HTMLCanvasElement) return direct;

  const inside = document.querySelector('.config-scene canvas');
  if (inside instanceof HTMLCanvasElement) return inside;

  const anyCanvas = document.querySelector('canvas');
  if (anyCanvas instanceof HTMLCanvasElement) return anyCanvas;

  return null;
}

/**
 * Преобразует Blob в data URL (base64).
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Не удалось прочитать Blob'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Безопасно преобразует canvas в Blob (поддерживает toBlob / convertToBlob / toDataURL).
 */
async function canvasToBlobSafe(canvas: any): Promise<Blob> {
  if (typeof canvas.toBlob === 'function') {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob: Blob | null) => {
          if (!blob) {
            reject(new Error('Не удалось создать Blob из canvas'));
            return;
          }
          resolve(blob);
        },
        'image/png',
        1
      );
    });
  }

  if (typeof canvas.convertToBlob === 'function') {
    return await canvas.convertToBlob({ type: 'image/png', quality: 1 });
  }

  if (typeof canvas.toDataURL === 'function') {
    const dataUrl = canvas.toDataURL('image/png', 1);
    const res = await fetch(dataUrl);
    return await res.blob();
  }

  throw new Error('Canvas не поддерживает toBlob, convertToBlob или toDataURL');
}

/**
 * Преобразует canvas в data URL (base64).
 */
export async function canvasToDataUrlSafe(canvas: HTMLCanvasElement): Promise<string> {
  const blob = await canvasToBlobSafe(canvas);
  return await blobToDataUrl(blob);
}

/**
 * Захватывает превью 3D-сцены и возвращает base64 data URL.
 * Перед захватом временно сбрасывает камеру в изначальный ракурс,
 * после захвата возвращает камеру в положение пользователя.
 * Если canvas не найден — возвращает null.
 */
export async function captureScenePreview(): Promise<string | null> {
  try {
    // Сбрасываем камеру в красивый ракурс для превью
    const wasReset = saveAndResetCamera();

    // Ждём 2 кадра, чтобы сцена перерисовалась с новым ракурсом
    if (wasReset) {
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
    }

    const canvas = getSceneCanvas();
    if (!canvas) {
      console.warn('[capturePreview] Canvas 3D-сцены не найден');
      if (wasReset) restoreCamera();
      return null;
    }

    const result = await canvasToDataUrlSafe(canvas);

    // Возвращаем камеру в положение пользователя
    if (wasReset) {
      restoreCamera();
    }

    return result;
  } catch (e) {
    console.error('[capturePreview] Ошибка захвата превью:', e);
    // Пытаемся вернуть камеру даже при ошибке
    try { restoreCamera(); } catch { /* ignore */ }
    return null;
  }
}
