// lib/utils.ts
export function cn(...classes: (string | false | null | undefined)[]) {
    return classes.filter(Boolean).join(' ');
}

function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor
}
