'use client'

import React, { useState, useCallback, useMemo, memo } from 'react'
import {
    Settings, Ruler, DoorOpen, Save, Printer, Calculator,
    Columns3Cog, Search, X
} from 'lucide-react'
import { useSnapshot } from 'valtio'
import { store } from '@/store'
import { Sidebar, SidebarPage } from '@/components/organisms/sidebar'
import { data } from '@/data'
import { ModuleCard } from '@/components/moleculas/module-card'
import { CalculatorComponent } from '../organisms/calculator'
import { PDFExportButton } from '@/components/moleculas/pdf-button'
import { CATEGORY_FLOOR, CATEGORY_ROOM, CATEGORY_TECH, CATEGORY_WALL, COLORS, OPEN_ANGLE_SNAP, TABLETOP_OPTIONS, WALL_HEIGHTS } from '@/constants'
import ModuleConfig from '@/components/organisms/module-editor'
import { MobileScreen } from '@/components/organisms/mobile-screen'
import { HintScreen } from '@/components/organisms/hint-screen'
import { Hint } from '@/components/atoms/hint'
import GroupEdit from '@/components/organisms/group-editor'
import Scene from '@/3d/eviroment/scene'
import { TabletopOption, WallHeight } from "@/types"
import { GetStates } from '@/lib/get-states'
import { useSaveToBack } from '@/lib/use-save-to-back'
import { getJson, setJson } from '@/store'

// ---------- Memoized presentational components (same as before) ----------
const ColorPicker = memo(({ colors, selected, onSelect }: {
    colors: readonly string[]
    selected: string
    onSelect: (color: string) => void
}) => (
    <div className="grid grid-cols-5 gap-4">
        {colors.map(color => (
            <button
                key={color}
                onClick={() => onSelect(color)}
                className={`w-full aspect-square rounded-xl shadow-md cursor-pointer transition-transform hover:scale-105 ${selected === color ? 'ring-2 ring-[#F06900] ring-offset-2' : ''
                    }`}
                style={{ background: color }}
            />
        ))}
    </div>
))
ColorPicker.displayName = 'ColorPicker'

const TabletopSelector = memo(({ options, selected, onSelect }: {
    options: TabletopOption[]
    selected: TabletopOption
    onSelect: (option: TabletopOption) => void
}) => (
    <div className="flex gap-4">
        {options.map(option => {
            const isSelected = option[1] === selected[1]
            return (
                <button
                    key={option[1]}
                    onClick={() => onSelect(option)}
                    className={`flex-1 p-5 shadow-lg rounded-lg flex flex-col gap-2 items-center font-semibold transition-colors ${isSelected ? 'bg-[#F06900] text-white' : 'bg-white hover:bg-gray-50'
                        }`}
                >
                    <span className="text-3xl">{Math.round(option[0] * 1000)} мм</span>
                    <span className="opacity-80 text-center text-sm">{option[1]}</span>
                    <span className="text-xs opacity-60">{option[2]} ₽/м²</span>
                </button>
            )
        })}
    </div>
))
TabletopSelector.displayName = 'TabletopSelector'

const WallHeightSelector = memo(({ heights, selected, onSelect }: {
    heights: WallHeight[]
    selected: number
    onSelect: (height: WallHeight) => void
}) => (
    <div className="flex gap-4">
        {heights.map(height => (
            <button
                key={height}
                onClick={() => onSelect(height)}
                className={`w-24 p-2 rounded-full font-semibold transition-colors ${height === selected ? 'bg-[#F06900] text-white' : 'bg-gray-200 hover:bg-gray-300'
                    }`}
            >
                {Math.round(height * 100)} см
            </button>
        ))}
    </div>
))
WallHeightSelector.displayName = 'WallHeightSelector'

const ToolButton = memo(({ active, onClick, icon }: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
}) => (
    <button
        onClick={onClick}
        className={`p-4 rounded-full shadow-lg cursor-pointer transition-all hover:scale-105 ${active ? 'text-white bg-[#F06900]' : 'text-[#F06900] bg-white hover:bg-gray-50'
            }`}
    >
        {icon}
    </button>
))
ToolButton.displayName = 'ToolButton'

// ---------- Memoized Scene ----------
const MemoizedScene = memo(Scene)

// ---------- Toolbar now receives a callback to open the save modal ----------
function Toolbar({ onOpenSaveModal }: { onOpenSaveModal: () => void }) {
    const openAngle = useSnapshot(store).openAngle
    const ruler = useSnapshot(store).ruler
    const groupEdit = useSnapshot(store).groupEdit

    const handleToggleHints = useCallback(() => {
        store.hints = !store.hints
    }, [])
    const handleToggleDoors = useCallback(() => {
        store.openAngle = store.openAngle === 0 ? OPEN_ANGLE_SNAP : 0
    }, [])
    const handleToggleRuler = useCallback(() => {
        store.ruler = !store.ruler
    }, [])
    const handleOpenGroupEdit = useCallback(() => {
        store.groupEdit = true
    }, [])
    const handleOpenCalculator = useCallback(() => {
        store.calculatorWindow = true
    }, [])

    return (
        <footer className="flex items-end gap-4 w-full absolute bottom-0 left-0 p-5 z-10 pr-15">
            <ToolButton active={openAngle !== 0} onClick={handleToggleDoors} icon={<DoorOpen size={20} />} />
            <ToolButton active={ruler} onClick={handleToggleRuler} icon={<Ruler size={20} />} />
            <ToolButton active={groupEdit} onClick={handleOpenGroupEdit} icon={<Columns3Cog size={20} />} />
            <div className="flex-1" />
            <ToolButton active={false} onClick={onOpenSaveModal} icon={<Save size={20} />} />
            <ToolButton active={false} onClick={() => {}} icon={<Printer size={20} />} />
            <ToolButton active={false} onClick={handleOpenCalculator} icon={<Calculator size={20} />} />
            <PDFExportButton />
        </footer>
    )
}

// ---------- SidebarContent (unchanged, search by displayName) ----------
function SidebarContent() {
    const [floorSearch, setFloorSearch] = useState('')
    const [wallSearch, setWallSearch] = useState('')
    const [techSearch, setTechSearch] = useState('')

    const floorModules = useMemo(() => {
        return data.filter(m => 
            m.tags.includes(CATEGORY_FLOOR) && 
            (floorSearch === '' || m.displayName?.toLowerCase().includes(floorSearch.toLowerCase()))
        )
    }, [floorSearch])
    
    const wallModules = useMemo(() => {
        return data.filter(m => 
            m.tags.includes(CATEGORY_WALL) && 
            (wallSearch === '' || m.displayName?.toLowerCase().includes(wallSearch.toLowerCase()))
        )
    }, [wallSearch])
    
    const techModules = useMemo(() => {
        return data.filter(m => 
            m.tags.includes(CATEGORY_TECH) && 
            (techSearch === '' || m.displayName?.toLowerCase().includes(techSearch.toLowerCase()))
        )
    }, [techSearch])

    const roomModules = useMemo(() => data.filter(m => m.tags.includes(CATEGORY_ROOM)), [])

    const tabletop = useSnapshot(store).tabletop as TabletopOption
    const tabletopColor = useSnapshot(store).tabletopColor
    const roomColor = useSnapshot(store).roomColor
    const wallHeight = useSnapshot(store).wallHeight

    const handleTabletopSelect = useCallback((option: TabletopOption) => {
        store.tabletop = option
    }, [])
    const handleTabletopColorSelect = useCallback((color: string) => {
        store.tabletopColor = color
    }, [])
    const handleRoomColorSelect = useCallback((color: string) => {
        store.roomColor = color
    }, [])
    const handleWallHeightSelect = useCallback((height: WallHeight) => {
        store.wallHeight = height
    }, [])

    return (
        <Sidebar defaultPage="floor">
            <SidebarPage title="Напольные" page="floor">
                <div className='flex flex-col gap-[30px] w-full bg-white px-6 py-8 h-full overflow-x-auto'>
                    <div className='text-2xl font-semibold'>Напольные модули</div>
                    <div className='flex rounded-[10px] bg-gray-100 items-center pl-4'>
                        <div className='opacity-30'><Search /></div>
                        <input 
                            className='p-3 w-full' 
                            placeholder='Ваш запрос' 
                            value={floorSearch}
                            onChange={(e) => setFloorSearch(e.target.value)}
                        />
                    </div>
                    <div className='grid grid-cols-3 gap-[15px]'>
                        {floorModules.map(module => <ModuleCard key={module.id} module={module} />)}
                    </div>
                </div>
            </SidebarPage>

            <SidebarPage title="Настенные" page="wall">
                <div className='flex flex-col gap-[30px] w-full bg-white px-6 py-8 h-full overflow-x-auto'>
                    <div className='text-2xl font-semibold'>Настенные модули</div>
                    <div className='flex rounded-[10px] bg-gray-100 items-center pl-4'>
                        <div className='opacity-30'><Search /></div>
                        <input 
                            className='p-3 w-full' 
                            placeholder='Ваш запрос' 
                            value={wallSearch}
                            onChange={(e) => setWallSearch(e.target.value)}
                        />
                    </div>
                    <div className='grid grid-cols-3 gap-[15px]'>
                        {wallModules.map(module => <ModuleCard key={module.id} module={module} />)}
                    </div>
                </div>
            </SidebarPage>

            <SidebarPage title="Техника" page="tech">
                <div className='flex flex-col gap-[30px] w-full bg-white px-6 py-8 h-full overflow-x-auto'>
                    <div className='text-2xl font-semibold'>Техника</div>
                    <div className='flex rounded-[10px] bg-gray-100 items-center pl-4'>
                        <div className='opacity-30'><Search /></div>
                        <input 
                            className='p-3 w-full' 
                            placeholder='Ваш запрос' 
                            value={techSearch}
                            onChange={(e) => setTechSearch(e.target.value)}
                        />
                    </div>
                    <div className='grid grid-cols-3 gap-[15px]'>
                        {techModules.map(module => <ModuleCard key={module.id} module={module} />)}
                    </div>
                </div>
            </SidebarPage>

            <SidebarPage title="Столешница" page="table">
                <div className="flex flex-col gap-8 w-full bg-white px-6 py-8 h-full overflow-y-auto">
                    <h2 className="text-2xl font-semibold">Столешница</h2>
                    <TabletopSelector options={TABLETOP_OPTIONS} selected={tabletop} onSelect={handleTabletopSelect} />
                    <section>
                        <h3 className="text-lg font-semibold mb-4">Цвет столешницы</h3>
                        <ColorPicker colors={COLORS} selected={tabletopColor} onSelect={handleTabletopColorSelect} />
                    </section>
                </div>
            </SidebarPage>

            <SidebarPage title="Помещение" page="room">
                <div className="flex flex-col gap-8 w-full bg-white px-6 py-8 h-full overflow-y-auto">
                    <section>
                        <h3 className="text-lg font-semibold mb-4">Цвет стен</h3>
                        <ColorPicker colors={COLORS} selected={roomColor} onSelect={handleRoomColorSelect} />
                    </section>
                    <section>
                        <h3 className="text-lg font-semibold mb-4">Высота фартука</h3>
                        <WallHeightSelector heights={WALL_HEIGHTS} selected={wallHeight} onSelect={handleWallHeightSelect} />
                    </section>
                    <div className='grid grid-cols-3 gap-[15px]'>
                        {roomModules.map(module => <ModuleCard key={module.id} module={module} />)}
                    </div>
                </div>
            </SidebarPage>
        </Sidebar>
    )
}

// ---------- SaveModal now accepts showSave and onClose ----------
function SaveModal({ showSave, onClose }: { showSave: boolean; onClose: () => void }) {
    const [write, saving, saveSuccess] = useSaveToBack()

    if (!showSave) return null

    return (
        <div className='fixed top-[50%] right-[50%] translate-x-[-50%] translate-y-[-50%] z-[100]'>
            <div className='flex pb-2'>
                <div className='w-full'></div>
                <div onClick={onClose} className='rounded-full min-w-10 w-10 h-10 bg-white flex items-center justify-center cursor-pointer'>
                    <X />
                </div>
            </div>
            <GetStates
                onProjectGet={(data, id) => {
                    setJson(JSON.stringify(data))
                    onClose()
                }}
                onNewProject={() => {
                    store.modules = []
                    store.page = 'starter'
                    store.currentRawModule = null
                    store.currentModule = null
                    onClose()
                }}
            />
            <div className='mt-4'>
                {saveSuccess && <p className='text-xs text-gray-500 text-center mb-2 bg-white p-2 rounded'>
                    Перезайдите в это окно,<br /> чтобы отобразился новый проект
                </p>}
                <button
                    onClick={() => write(getJson())}
                    disabled={saving}
                    className={`w-full py-2.5 px-4 rounded-lg font-medium transition cursor-pointer
                        ${saving ? 'opacity-60 cursor-wait' : ''}
                        ${saveSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-[#F06900] hover:bg-[#d85e00]'}
                        text-white shadow-md`}
                >
                    {saving ? 'Сохранение…' : saveSuccess ? 'Сохранено' : 'Сохранить текущий проект'}
                </button>
            </div>
        </div>
    )
}

function Header() {
    const handleToggleHints = useCallback(() => {
        store.hints = !store.hints
    }, [])

    return (
        <header className="flex items-center w-full absolute top-0 left-0 p-5 gap-5 pr-15">
            <img src="/logo.png" alt="Logo" className="h-8" />
            <div className="flex-1" />
            <Hint lineStyle="w-[4px] h-[60px] translate-x-[25px] translate-y-[90%]" className="w-[300px] translate-x-[-80%] translate-y-[80px]" content='Показать или скрыть подсказки'>
                <ToolButton active={false} onClick={handleToggleHints} icon={<Settings size={20} />} />
            </Hint>
        </header>
    )
}

// ---------- Main Configurator ----------
export default function Configurator() {
    const [showSaveModal, setShowSaveModal] = useState(false)

    const handleOpenSaveModal = useCallback(() => setShowSaveModal(true), [])
    const handleCloseSaveModal = useCallback(() => setShowSaveModal(false), [])

    return (
        <>
            <SaveModal showSave={showSaveModal} onClose={handleCloseSaveModal} />
            <div className="flex h-screen w-full bg-indigo-100">
                <div className="w-full relative">
                    <Header />
                    <div className='h-screen'>
                        <MemoizedScene />
                    </div>
                    <Toolbar onOpenSaveModal={handleOpenSaveModal} />
                </div>
                <SidebarContent />
                <HintScreen />
                <CalculatorComponent />
                <ModuleConfig />
                <MobileScreen />
                <GroupEdit />
            </div>
        </>
    )
}
