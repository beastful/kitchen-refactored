// ModuleMenuContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface ModuleMenuContextType {
    openModuleId: string | null;
    setOpenModuleId: (id: string | null) => void;
}

const ModuleMenuContext = createContext<ModuleMenuContextType | undefined>(undefined);

export function ModuleMenuProvider({ children }: { children: ReactNode }) {
    const [openModuleId, setOpenModuleId] = useState<string | null>(null);
    return (
        <ModuleMenuContext.Provider value={{ openModuleId, setOpenModuleId }}>
            {children}
        </ModuleMenuContext.Provider>
    );
}

export function useModuleMenu() {
    const context = useContext(ModuleMenuContext);
    if (!context) throw new Error('useModuleMenu must be used within a ModuleMenuProvider');
    return context;
}
