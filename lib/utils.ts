import { store } from "@/store";
import { ModuleEntity } from "@/types";
import { Color } from "three";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export const toColor = (hex: string): Color => new Color(hex);

export const updateModulesByType = (targetType: 'wall' | 'floor', updates: Partial<ModuleEntity>) => {
  const newModules = store.modules.map(module => {
    if (module.type === targetType) {
      const updated = { ...module };
      if (updates.color) updated.color = toColor(updates.color as unknown as string);
      if (updates.handleColor) updated.handleColor = toColor(updates.handleColor as unknown as string);
      if (updates.facade) updated.facade = updates.facade as string;
      if (updates.handles) updated.handles = updates.handles as string;
      if (updates.handleVariant !== undefined) updated.handleVariant = updates.handleVariant;
      return updated;
    }
    return module;
  });
  store.modules = newModules;
};
