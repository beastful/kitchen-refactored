'use client';

import { store } from "@/store";
import { useSnapshot } from "valtio";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { Color } from "three";
import { useMemo } from "react";
import { hinges } from "@/data";
import { COLORS } from "@/constants";
import { ModuleEntity } from "@/types";

export function ModuleConfig() {
    const snap = useSnapshot(store);

    // Find the configurable module from the store
    const currentModule = useMemo(
        () => snap.modules.find((m) => m.id === snap.configurableEntity),
        [snap.modules, snap.configurableEntity]
    );

    // Gola is currently available only for the dedicated GLB test module.
    const isGolaModule = currentModule?.name === "M_SPL_1_CORRECT1";

    // Helper to update module fields directly in the store
    const updateModuleField = <K extends Exclude<keyof ModuleEntity, 'snapPlanes'>>(
        field: K,
        value: ModuleEntity[K]
    ) => {
        if (!currentModule) return;
        const index = store.modules.findIndex((m) => m.id === currentModule.id);
        if (index !== -1) {
            // Valtio uses this intentional nested mutation to preserve Three.js object identity.
            store.modules[index][field] = value;
        }
    };

    const replacementSlots = currentModule?.bpapi_replaces_catalog ?? [];

    const getReplacementEffectTotal = (slotId: number, replaceId: number) => {
        const slot = replacementSlots.find((item) => item.slot_id === slotId);
        const option = slot?.options.find((item) => item.replace_id === replaceId);
        return Number(option?.effect?.total ?? 0);
    };

    const selectReplacement = (slotId: number, replaceId: number | null) => {
        if (!currentModule || !currentModule.supplier_id) return;

        const index = store.modules.findIndex((module) => module.id === currentModule.id);
        if (index === -1) return;

        const currentSelections = [...(store.modules[index].bpapi_replaces ?? [])];
        const previousSelection = currentSelections.find((item) => item.slot_id === slotId);
        const previousTotal = previousSelection
            ? getReplacementEffectTotal(slotId, previousSelection.replace_id)
            : 0;
        const basePrice = Number(store.modules[index].price ?? 0) - previousTotal;
        const nextSelections = currentSelections.filter((item) => item.slot_id !== slotId);

        if (replaceId !== null) {
            nextSelections.push({
                module_id: Number(currentModule.supplier_id),
                slot_id: slotId,
                replace_id: replaceId,
            });
        }

        const nextTotal = nextSelections.reduce(
            (sum, item) => sum + getReplacementEffectTotal(item.slot_id, item.replace_id),
            0
        );
        updateModuleField("bpapi_replaces", nextSelections);
        updateModuleField("price", basePrice + nextTotal);
    };

    if (!currentModule) return null;

    return (
        <AnimatePresence>
            {snap.configurableEntity !== null && (
                <motion.div
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed top-0 right-0 z-50 h-full w-[550px] min-w-[550px] bg-white shadow-2xl overflow-hidden flex flex-col"
                >
                    {/* Header */}
                    <div className="flex items-center gap-3 p-5 border-b border-gray-100 bg-white">
                        <button
                            onClick={() => (store.configurableEntity = null)}
                            className="w-10 min-w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                        >
                            <X size={18} />
                        </button>
                        <h2 className="text-xl font-semibold text-gray-800">
                            Конфигурация модуля {currentModule.displayName || currentModule.name}
                        </h2>
                    </div>

                    {/* Scrollable content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* Color picker */}
                        <div>
                            <div className="text-base font-semibold text-gray-700 mb-3">Цвет корпуса</div>
                            <div className="grid grid-cols-5 gap-3">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => updateModuleField("color", new Color(color))}
                                        className={`w-full aspect-square rounded-xl shadow-md transition-all hover:scale-105 ${currentModule.color === new Color(color) ? "ring-2 ring-[#F06900] ring-offset-2" : ""
                                            }`}
                                        style={{ backgroundColor: color }}
                                        aria-label={`Цвет ${color}`}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Facade type */}
                        <div>
                            <div className="text-base font-semibold text-gray-700 mb-3">Тип фасада</div>
                            <div className="grid grid-cols-4 gap-4">
                                {["A", "B", "C", "Flat"].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            updateModuleField("facade", type);
                                        }}
                                        className={`relative aspect-square rounded-2xl overflow-hidden shadow-md transition-all hover:scale-105 ${currentModule.facade === type ? "ring-2 ring-[#F06900] ring-offset-2" : ""
                                            }`}
                                    >
                                        <img
                                            src={`./facades/${type}.png`}
                                            alt={`Фасад ${type}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </button>
                                ))}
                                {isGolaModule && (
                                    <button
                                        onClick={() => {
                                            updateModuleField("facade", "Gola");
                                        }}
                                        className={`aspect-square rounded-2xl overflow-hidden shadow-md transition-all hover:scale-105 bg-[#807B77] text-white p-3 font-semibold ${currentModule.facade === "Gola" ? "ring-2 ring-[#F06900] ring-offset-2" : ""
                                            }`}
                                    >
                                        Профиль Гола
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Handle orientation */}
                        <div>
                            <div className="text-base font-semibold text-gray-700 mb-3">Тип ручек</div>
                            <div className="flex gap-4">
                                {[
                                    { value: "V", label: "Боковые" },
                                    { value: "H", label: "Горизонтальные" },
                                ].map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => updateModuleField("handles", value)}
                                        className={`flex-1 py-3 text-center font-medium rounded-xl shadow-md transition-all ${currentModule.handles === value
                                            ? "bg-[#F06900] text-white"
                                            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Handle variant (images) */}
                        <div>
                            <div className="text-base font-semibold text-gray-700 mb-3">Вариант ручки</div>
                            <div className="grid grid-cols-5 gap-3">
                                {[0, 1, 2, 3, 4].map((variant) => (
                                    <button
                                        key={variant}
                                        onClick={() => updateModuleField("handleVariant", variant)}
                                        className={`p-1 rounded-xl overflow-hidden shadow-md transition-all hover:scale-105 ${currentModule.handleVariant === variant ? "ring-2 ring-[#F06900] ring-offset-2" : ""
                                            }`}
                                    >
                                        <img
                                            src={`handles/Handle_0${variant + 1}.png`}
                                            alt={`Ручка вариант ${variant + 1}`}
                                            className="rounded-md w-full aspect-auto"
                                        />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Handle color picker (with mask) */}
                        <div>
                            <div className="text-base font-semibold text-gray-700 mb-3">Цвет ручки</div>
                            <div className="grid grid-cols-5 gap-3">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        onClick={() => updateModuleField("handleColor", new Color(color))}
                                        className={`drop-shadow-sm transition-all hover:drop-shadow-lg hover:-translate-y-1 ${currentModule.handleColor === new Color(color) ? "ring-2 ring-[#F06900] ring-offset-2 rounded-xl" : ""
                                            }`}
                                    >
                                        <div
                                            style={{
                                                backgroundColor: color,
                                                maskImage: "url(/handle_template_mask.svg)",
                                                maskSize: "100%",
                                                WebkitMaskImage: "url(/handle_template_mask.svg)",
                                                WebkitMaskSize: "100%",
                                            }}
                                            className="w-full aspect-square rounded-xl cursor-pointer"
                                        >
                                            <img src="/handle_template.png" alt="Шаблон ручки" className="opacity-0 w-full h-full" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* BpApi replacements */}
                        {replacementSlots.length > 0 && currentModule.supplier_id && (
                            <div>
                                <div className="text-base font-semibold text-gray-700 mb-3">Варианты замены</div>
                                <div className="space-y-5">
                                    {replacementSlots.map((slot) => {
                                        const selected = (currentModule.bpapi_replaces ?? []).find(
                                            (item) => item.slot_id === slot.slot_id
                                        );
                                        return (
                                            <div key={slot.slot_id} className="space-y-2">
                                                <div className="text-sm text-gray-600">
                                                    {slot.name || `Слот ${slot.slot_id}`}
                                                </div>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => selectReplacement(slot.slot_id, null)}
                                                        className={`px-3 py-2 text-left rounded-lg border text-sm ${
                                                            !selected
                                                                ? 'border-[#F06900] bg-orange-50 text-[#F06900]'
                                                                : 'border-gray-200 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        По умолчанию
                                                    </button>
                                                    {slot.options.map((option) => (
                                                        <button
                                                            type="button"
                                                            key={`${slot.slot_id}-${option.replace_id}`}
                                                            onClick={() => selectReplacement(slot.slot_id, option.replace_id)}
                                                            className={`px-3 py-2 text-left rounded-lg border text-sm ${
                                                                selected?.replace_id === option.replace_id
                                                                    ? 'border-[#F06900] bg-orange-50 text-[#F06900]'
                                                                    : 'border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            <span>{option.name}</span>
                                                            {option.effect?.label && (
                                                                <span className="ml-2 text-xs opacity-70">
                                                                    ({option.effect.label})
                                                                </span>
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Legacy local hinge replacement */}
                        <div>
                            <div className="text-base font-semibold text-gray-700 mb-3">Замена петель</div>
                            <div className="flex gap-4">
                                {[0, 1].map((hingeId) => (
                                    <button
                                        key={hingeId}
                                        onClick={() => updateModuleField("hingeReplacement", hingeId)}
                                        className={`flex-1 py-3 text-center font-medium rounded-xl shadow-md transition-all ${currentModule.hingeReplacement === hingeId
                                            ? "bg-[#F06900] text-white"
                                            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                                            }`}
                                    >
                                        {hinges[hingeId]?.name || "Стандартные"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default ModuleConfig;
