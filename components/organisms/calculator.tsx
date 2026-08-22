'use client';

import { CATEGORY_ROOM } from '@/constants';
import { store } from '@/store';
import { X } from 'lucide-react';
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from 'react';
import { Color } from 'three';
import { useSnapshot } from 'valtio';

export function CalculatorComponent() {
    const snap = useSnapshot(store);
    const isOpen = snap.calculatorWindow;

    // Get all modules from store, excluding room entities
    const modules = useMemo(() => {
        return snap.modules.filter((mod) =>
            !mod.tags.includes(CATEGORY_ROOM)
        );
    }, [snap.modules]);

    // Calculate totals
    const { subtotal, tabletopTotal, total } = useMemo(() => {
        const modulesTotal = modules.reduce((sum, mod) => sum + mod.price, 0);
        // Tabletop area price: size.z * size.x * snap.tabletop[2] (price per area unit)
        const tabletopArea = modules.reduce((area, mod) => area + (mod.size.z * mod.size.x), 0);
        const tabletopPrice = tabletopArea * snap.tabletop[2];
        return {
            subtotal: modulesTotal,
            tabletopTotal: tabletopPrice,
            total: modulesTotal + tabletopPrice,
        };
    }, [modules, snap.tabletop]);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0 }).format(value);


    return (
        <div className="fixed inset-0 z-50 pointer-events-none">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center pointer-events-auto"
                        onClick={() => store.calculatorWindow = false}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative w-[900px] max-w-[90vw] h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">Смета конфигурации</h2>
                                    <p className="text-sm text-gray-500 mt-1">Расчет стоимости модулей и столешницы</p>
                                </div>
                                <button
                                    onClick={() => store.calculatorWindow = false}
                                    className="w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center"
                                >
                                    <X size={20} className="text-gray-600" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {modules.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <p className="text-lg">Нет добавленных модулей</p>
                                        <p className="text-sm">Добавьте модули из каталога, чтобы увидеть расчет</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Modules list */}
                                        <div className="space-y-3">
                                            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Модули</h3>
                                            <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                                {modules.map((module) => {

                                                    const m_name = module.name.split("_");
                                                    const m_folder = `${m_name?.[1]}`;

                                                    return <div key={module.id} className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                                                <img
                                                                    src={`previews/${m_folder}/${module.name}.png`}
                                                                    alt={module.name}
                                                                    className="w-10 h-10 object-contain"
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-800">{module.displayName || module.name}</div>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                                    <span>Фасад: {module.facade}</span>
                                                                    <span>•</span>
                                                                    <span className="flex items-center gap-1">
                                                                        Цвет:
                                                                        <span
                                                                            className="w-3 h-3 rounded-full"
                                                                            style={{ backgroundColor: `#${new Color(module.color).getHexString()}` }}
                                                                        />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="font-semibold text-gray-800">
                                                            {formatCurrency(module.price)}
                                                        </div>
                                                    </div>
                                                })}
                                            </div>
                                        </div>

                                        {/* Tabletop section */}
                                        <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Столешница ({snap.tabletop[1]})</span>
                                                <span className="font-medium">{formatCurrency(tabletopTotal)}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-gray-500">
                                                <span>Площадь: {modules.reduce((a, m) => a + (m.size.z * m.size.x), 0).toFixed(2)} м²</span>
                                                <span>Цена за м²: {formatCurrency(snap.tabletop[2])}</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Footer summary */}
                            <div className="border-t border-gray-100 p-6 bg-white">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Стоимость модулей</span>
                                        <span>{formatCurrency(subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Столешница</span>
                                        <span>{formatCurrency(tabletopTotal)}</span>
                                    </div>
                                    <div className="h-px bg-gray-200 my-2" />
                                    <div className="flex justify-between text-xl font-bold text-gray-900">
                                        <span>Итого</span>
                                        <span className="text-green-600">{formatCurrency(total)}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}