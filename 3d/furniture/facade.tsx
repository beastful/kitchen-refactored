"use client";

import { memo, useEffect, useLayoutEffect } from "react";
import { Box3, BufferGeometry, Color, Mesh, MeshStandardMaterial } from "three";
import { isGolaCapableModule, ModuleEntity } from "@/types";
import { animationRegistry } from "@/3d/eviroment/animation-system";

/* ── Material cache ── */
const facadeMaterialCache = new Map<string, MeshStandardMaterial>();

function getFacadeMaterial(color: string | Color, opacity: number): MeshStandardMaterial {
    const hex = typeof color === "string" ? color : `#${color.getHexString()}`;
    const key = `${hex}-${opacity}`;
    if (!facadeMaterialCache.has(key)) {
        const mat = new MeshStandardMaterial({
            color: new Color(color),
            transparent: opacity < 1,
            opacity,
        });
        facadeMaterialCache.set(key, mat);
    }
    return facadeMaterialCache.get(key)!;
}

interface FacadeProps {
    entity: ModuleEntity;
    model: Mesh;
}

function canonicalNodeName(name: string): string {
    return name.replace(/[.]/g, "");
}

function getColorHex(color: Color): string {
    return new Color(color).getHexString();
}

/**
 * The 20 cm Correct1 asset contains the same 16-rail pattern as the wider
 * source door. X-normalizing the whole GLB also narrows each rail and makes
 * the ribbed facade look almost like a solid panel. Keep the outer width
 * unchanged, but spend more of the available width on the rails and less on
 * the gaps between them.
 */
function widenCorrect1Ribs(source: BufferGeometry): BufferGeometry {
    const geometry = source.clone();
    const position = geometry.getAttribute("position");
    if (!position || position.itemSize < 3) return geometry;

    const xValues = Array.from({ length: position.count }, (_, index) => position.getX(index))
        .sort((a, b) => a - b)
        .filter((value, index, values) => index === 0 || Math.abs(value - values[index - 1]) > 0.0001);
    if (xValues.length < 4) return geometry;

    const intervals = xValues.slice(0, -1).map((value, index) => ({
        start: value,
        end: xValues[index + 1],
        width: xValues[index + 1] - value,
    }));
    const patterned = intervals.filter(({ width }) => width > 0.5);
    if (patterned.length < 4) return geometry;

    const patternAverage = patterned.reduce((sum, interval) => sum + interval.width, 0) / patterned.length;
    const railIntervals = patterned.filter(({ width }) => width < patternAverage);
    const gapIntervals = patterned.filter(({ width }) => width >= patternAverage);
    if (!railIntervals.length || !gapIntervals.length) return geometry;

    const railWidth = railIntervals.reduce((sum, interval) => sum + interval.width, 0) / railIntervals.length;
    const gapWidth = gapIntervals.reduce((sum, interval) => sum + interval.width, 0) / gapIntervals.length;
    const targetRailRatio = 0.55;
    const targetPatternWidth = railWidth * railIntervals.length + gapWidth * gapIntervals.length;
    const targetRailWidth = targetPatternWidth * targetRailRatio / patterned.length;
    const targetGapWidth = targetPatternWidth * (1 - targetRailRatio) / patterned.length;

    const remapped = new Map<number, number>();
    let cursor = xValues[0];
    remapped.set(xValues[0], cursor);
    intervals.forEach((interval, index) => {
        const isPatternInterval = interval.width > 0.5;
        const targetWidth = isPatternInterval
            ? (interval.width < patternAverage ? targetRailWidth : targetGapWidth)
            : interval.width;
        cursor += targetWidth;
        remapped.set(xValues[index + 1], cursor);
    });

    for (let index = 0; index < position.count; index += 1) {
        const originalX = position.getX(index);
        const mappedX = remapped.get(xValues.find((value) => Math.abs(value - originalX) < 0.0001) ?? originalX);
        if (mappedX !== undefined) position.setX(index, mappedX);
    }

    position.needsUpdate = true;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
}

function FacadeComponent({ entity, model }: FacadeProps) {
    const entityColor = entity.color;
    const entityFacade = entity.facade;
    const entityName = entity.name;
    const entityModelPath = entity.modelPath;
    const entityModel = entity.model;
    const entityDisplayName = entity.displayName;

    /* ── Geometry correction for the 20 cm ribbed facade ── */
    useLayoutEffect(() => {
        if (canonicalNodeName(model.name) !== "M_SPL_1_F_D") return;

        const originalGeometry = model.geometry;
        model.geometry = widenCorrect1Ribs(originalGeometry);

        return () => {
            const adjustedGeometry = model.geometry;
            model.geometry = originalGeometry;
            if (adjustedGeometry !== originalGeometry) adjustedGeometry.dispose();
        };
    }, [model]);

    /* ── Material ── */
    useLayoutEffect(() => {
        const originalMaterial = model.material;
        const name = canonicalNodeName(model.name);
        const isCorrect1 = isGolaCapableModule({
            name: entityName,
            modelPath: entityModelPath,
            model: entityModel,
            displayName: entityDisplayName,
        });
        const correct1FacadeNodes: Record<string, string> = {
            A: "M_SPL_1_F_A",
            B: "M_SPL_1_F_B",
            C: "M_SPL_1_F_C",
            // D is the ribbed fourth facade. F is reserved for the shortened
            // Gola facade and must never be shown in the regular modes.
            Flat: "M_SPL_1_F_D",
            Gola: "M_SPL_1_F_F",
        };

        let shouldShow = false;
        const isCorrect1FacadeNode = Object.values(correct1FacadeNodes).includes(name);
        if (isCorrect1FacadeNode) {
            // The node names are authoritative capability markers. This also
            // keeps all five Correct1 facades working for API projects whose
            // catalog name/path was normalized differently.
            shouldShow = name === correct1FacadeNodes[entityFacade];
        } else if (isCorrect1) {
            shouldShow = name === correct1FacadeNodes[entityFacade];
        } else if (name.includes(`_${entityFacade}`)) {
            shouldShow = true;
        } else if (
            !name.includes(`_A`) &&
            !name.includes(`_B`) &&
            !name.includes(`_C`) &&
            entityFacade === "Flat"
        ) {
            shouldShow = true;
        }

        // Use visibility so hidden facades cannot occlude the selected one
        // through depth writing. Assign the material to the selected mesh as
        // well, so a GLB's baked white material cannot win over the picker.
        const colorHex = getColorHex(entityColor);
        Object.assign(model, {
            visible: shouldShow,
            material: getFacadeMaterial(`#${colorHex}`, 1),
        });

        return () => {
            Object.assign(model, {
                visible: false,
                material: originalMaterial,
            });
        };
    }, [entityColor, entityDisplayName, entityFacade, entityName, entityModel, entityModelPath, model]);

    /* ── Register for centralized animation (no subscribe) ── */
    useEffect(() => {
        const originalX = model.position.x;
        const originalZ = model.position.z;
        const originalRotX = model.rotation.x;
        const originalRotY = model.rotation.y;
        const bounds = new Box3();
        model.geometry.computeBoundingBox();
        if (model.geometry.boundingBox) bounds.copy(model.geometry.boundingBox);

        const name = canonicalNodeName(model.name);
        // F_F is the stationary shortened front of the Gola cabinet. It is
        // never a moving door, even though the module has a straight-case tag.
        if (name === "M_SPL_1_F_F") return;

        // Correct1 has a real hinged door mesh but no pivot node. Its local
        // origin is at the right-hand hinge: the door extends toward negative
        // X and its rear edge starts at local Z=0. Rotate around that edge so
        // the free edge swings toward the room instead of through the cabinet.
        const hingeLocalX = bounds.max.x;
        const hingeLocalZ = bounds.min.z;

        animationRegistry.facades.set(model.uuid, {
            mesh: model,
            originalX,
            originalZ,
            originalRotX,
            hingeSign: 1,

            originalRotY,
            hingeLocalX,
            hingeLocalZ,
            hingePivotX: originalX + hingeLocalX,
            hingePivotZ: originalZ + hingeLocalZ,
            entity,
        });

        return () => {
            animationRegistry.facades.delete(model.uuid);
            model.position.x = originalX;
            model.position.z = originalZ;
            model.rotation.x = originalRotX;
            model.rotation.y = originalRotY;
        };
    }, [model, entity]);

    return null;
}

export const Facade = memo(FacadeComponent, (prevProps, nextProps) => {
    return (
        prevProps.model === nextProps.model &&
        getColorHex(prevProps.entity.color) === getColorHex(nextProps.entity.color) &&
        prevProps.entity.facade === nextProps.entity.facade &&
        prevProps.entity.name === nextProps.entity.name &&
        prevProps.entity.tags?.join(",") === nextProps.entity.tags?.join(",")
    );
});
