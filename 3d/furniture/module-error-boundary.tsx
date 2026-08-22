"use client"

import { Component, ReactNode } from 'react';
import { Box } from '@react-three/drei';

interface Props {
    children: ReactNode;
    moduleName?: string;
}

interface State {
    hasError: boolean;
    errorMessage: string;
}

export class ModuleErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, errorMessage: '' };
    }

    static getDerivedStateFromError(error: unknown): State {
        return {
            hasError: true,
            errorMessage: error instanceof Error ? error.message : String(error),
        };
    }

    componentDidCatch(error: Error) {
        console.warn(`[ModuleErrorBoundary] Failed to load module "${this.props.moduleName || 'unknown'}":`, error.message || error);
    }

    // Reset error when moduleName changes (new module loaded)
    componentDidUpdate(prevProps: Props) {
        if (prevProps.moduleName !== this.props.moduleName && this.state.hasError) {
            this.setState({ hasError: false, errorMessage: '' });
        }
    }

    render() {
        if (this.state.hasError) {
            return (
                <group>
                    {/* Semi-transparent orange placeholder box */}
                    <Box args={[0.5, 0.5, 0.5]}>
                        <meshStandardMaterial
                            color="#ff6b00"
                            transparent
                            opacity={0.15}
                        />
                    </Box>
                    {/* Thin red error bar on top */}
                    <mesh position={[0, 0.3, 0]}>
                        <boxGeometry args={[0.4, 0.03, 0.03]} />
                        <meshStandardMaterial color="#ff0000" />
                    </mesh>
                </group>
            );
        }

        return this.props.children;
    }
}

/** Loading placeholder shown while GLTF is being fetched */
export function ModuleLoadingPlaceholder() {
    return (
        <Box args={[0.3, 0.3, 0.3]}>
            <meshStandardMaterial
                color="#ddd"
                transparent
                opacity={0.5}
            />
        </Box>
    );
}
