'use client';

import { useSnapshot } from 'valtio';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { Color } from 'three';
import { store } from '@/store';
import { COLORS, FACADE_TYPES, HANDLE_TYPES, HANDLE_VARIANTS } from '@/constants';
import { updateModulesByType } from '@/lib/utils';

export function GroupEdit() {
    const snap = useSnapshot(store);
    if (!snap.groupEdit) return null;

    return (
        <AnimatePresence>
            {snap.groupEdit && (
                // Outer wrapper: full screen, transparent, no pointer capture, no click handler
                <div className="fixed inset-0 z-50 pointer-events-none">
                    <motion.div
                        className="ml-auto bg-white h-full w-[600px] shadow-xl overflow-y-auto pointer-events-auto"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    >
                        {/* Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4 z-10">
                            <button
                                onClick={() => (store.groupEdit = false)}
                                className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <h2 className="text-xl font-semibold text-gray-800">Групповая конфигурация</h2>
                        </div>

                        <div className="p-6 space-y-10 pb-20">
                            {/* Wall Modules Section */}
                            <section>
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Настенные модули</h3>

                                {/* Color */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Цвет фасада</label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateModulesByType('wall', { color: new Color(color) })}
                                                className="aspect-square rounded-xl shadow-sm transition-all hover:scale-105 hover:shadow-md"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Facade */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Тип фасада</label>
                                    <div className="grid grid-cols-4 gap-4">
                                        {FACADE_TYPES.map(facade => (
                                            <button
                                                key={facade}
                                                onClick={() => updateModulesByType('wall', { facade })}
                                                className="relative rounded-xl overflow-hidden bg-gray-50 p-3 transition-all hover:shadow-md"
                                            >
                                                <img
                                                    src={`./facades/${facade}.png`}
                                                    alt={`Фасад ${facade}`}
                                                    className="w-full h-auto object-contain"
                                                />
                                                <span className="block text-center mt-2 text-sm font-medium">{facade}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Handle type */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Ручки</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {HANDLE_TYPES.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => updateModulesByType('wall', { handles: type })}
                                                className="py-3 rounded-xl font-medium text-center transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            >
                                                {type === 'V' ? 'Вертикальные' : 'Горизонтальные'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Handle variant */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Вариант ручки</label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {HANDLE_VARIANTS.map(variant => (
                                            <button
                                                key={variant}
                                                onClick={() => updateModulesByType('wall', { handleVariant: variant })}
                                                className="aspect-square bg-gray-100 rounded-xl p-2 transition-all hover:scale-105"
                                            >
                                                <img
                                                    src={`./handles/Handle_0${variant + 1}.png`}
                                                    alt={`Ручка ${variant + 1}`}
                                                    className="w-full h-full object-contain"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Handle color */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Цвет ручки</label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateModulesByType('wall', { handleColor: new Color(color) })}
                                                className="relative aspect-square rounded-xl overflow-hidden shadow-sm transition-all hover:scale-105"
                                                style={{ backgroundColor: color }}
                                            >
                                                <img
                                                    src="./handle_template.png"
                                                    alt=""
                                                    className="w-full h-full object-cover mix-blend-multiply opacity-80"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* Floor Modules Section */}
                            <section className="border-t border-gray-100 pt-6">
                                <h3 className="text-2xl font-bold text-gray-900 mb-6">Напольные модули</h3>

                                {/* Color */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Цвет фасада</label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateModulesByType('floor', { color: new Color(color) })}
                                                className="aspect-square rounded-xl shadow-sm transition-all hover:scale-105 hover:shadow-md"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Facade */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Тип фасада</label>
                                    <div className="grid grid-cols-4 gap-4">
                                        {FACADE_TYPES.map(facade => (
                                            <button
                                                key={facade}
                                                onClick={() => updateModulesByType('floor', { facade })}
                                                className="relative rounded-xl overflow-hidden bg-gray-50 p-3 transition-all hover:shadow-md"
                                            >
                                                <img
                                                    src={`./facades/${facade}.png`}
                                                    alt={`Фасад ${facade}`}
                                                    className="w-full h-auto object-contain"
                                                />
                                                <span className="block text-center mt-2 text-sm font-medium">{facade}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Handle type */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Ручки</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {HANDLE_TYPES.map(type => (
                                            <button
                                                key={type}
                                                onClick={() => updateModulesByType('floor', { handles: type })}
                                                className="py-3 rounded-xl font-medium text-center transition-all bg-gray-100 text-gray-700 hover:bg-gray-200"
                                            >
                                                {type === 'V' ? 'Вертикальные' : 'Горизонтальные'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Handle variant */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Вариант ручки</label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {HANDLE_VARIANTS.map(variant => (
                                            <button
                                                key={variant}
                                                onClick={() => updateModulesByType('floor', { handleVariant: variant })}
                                                className="aspect-square bg-gray-100 rounded-xl p-2 transition-all hover:scale-105"
                                            >
                                                <img
                                                    src={`./handles/Handle_0${variant + 1}.png`}
                                                    alt={`Ручка ${variant + 1}`}
                                                    className="w-full h-full object-contain"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Handle color */}
                                <div className="mb-8">
                                    <label className="block text-sm font-medium text-gray-600 mb-3">Цвет ручки</label>
                                    <div className="grid grid-cols-5 gap-3">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => updateModulesByType('floor', { handleColor: new Color(color) })}
                                                className="relative aspect-square rounded-xl overflow-hidden shadow-sm transition-all hover:scale-105"
                                                style={{ backgroundColor: color }}
                                            >
                                                <img
                                                    src="./handle_template.png"
                                                    alt=""
                                                    className="w-full h-full object-cover mix-blend-multiply opacity-80"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default GroupEdit;
