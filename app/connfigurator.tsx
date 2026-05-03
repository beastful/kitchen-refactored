'use client'

import React, { useState, useCallback, Suspense } from 'react'
import {
    Settings, Ruler, DoorOpen, Save, Printer, Calculator,
    Columns3Cog, LogIn, Code2, Search
} from 'lucide-react'
import { useSnapshot } from 'valtio'
import { store } from '@/store'
import { Sidebar, SidebarPage } from '@/components/ui/sidebar'
import { data } from '@/data'
import { ModuleCard } from '@/components/ui/module-card'
import Room from './room'
import { Canvas } from '@react-three/fiber'
import { CameraControls, Html, Loader, OrbitControls, Preload } from '@react-three/drei'
import { ConstantForwardOrbitControls } from '@/components/ui/infinite-dolly'
import { CalculatorComponent } from './calculator'
import { PDFExportButton } from '@/components/ui/pdf-button'
import { CATEGORY_FLOOR, CATEGORY_TECH, CATEGORY_WALL } from '@/constants'
import ModuleConfig from '@/components/ui/module-config'
import { MobileScreen } from '@/components/ui/mobile-screen'
import { HintScreen } from '@/components/ui/hint-screen'
import { Hint } from '@/components/ui/hint'
import { PreloaderOverlay } from '@/components/ui/preload'
import GroupEdit from '@/components/ui/group-edit'
import { RaycastRuler } from '@/components/legacy/raycast-ruler'

// ─── Типы ───

type TabletopOption = [thickness: number, name: string, pricePerM2: number]

type WallHeight = 0.6 | 0.7

// ─── Константы ───

const COLORS = [
    '#617774', '#CAC0B4', '#F9F8F4', '#F8F1D7',
    '#8E8478', '#256668', '#807B77', '#B3C7D7',
    '#B8D1C7', '#705A4C'
] as const

const TABLETOP_OPTIONS: TabletopOption[] = [
    [0.026, 'Скиф 26', 600],
    [0.038, 'Скиф 38', 1500],
    [0.038, 'Союз 38', 800]
]

const WALL_HEIGHTS: WallHeight[] = [0.6, 0.7]

const OPEN_ANGLE_SNAP = Math.PI * 0.4

// ─── Компоненты (не экспортируются) ───

const ColorPicker = ({ colors, selected, onSelect }: {
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
)

const TabletopSelector = ({ options, selected, onSelect }: {
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
)

const WallHeightSelector = ({ heights, selected, onSelect }: {
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
)

const ToolButton = ({ active, onClick, icon }: {
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
)

const PlaceholderPage = ({ title, search }: {
    title: string
    search?: boolean
}) => {
    const [query, setQuery] = useState('')

    return (
        <div className="flex flex-col gap-8 w-full bg-white px-6 py-8 h-full overflow-y-auto">
            <h2 className="text-2xl font-semibold">{title}</h2>

            {search && (
                <div className="flex rounded-xl bg-gray-100 items-center px-4">
                    <Search className="opacity-30" size={20} />
                    <input
                        className="p-3 w-full bg-transparent outline-none"
                        placeholder="Поиск..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
            )}

            <div className="text-gray-400 text-center py-20">
                Модули будут здесь
            </div>
        </div>
    )
}

// ─── Главный компонент (единственный экспорт) ───

export default function Configurator() {
    const snap = useSnapshot(store)
    const [debug, setDebug] = useState(false)

    const handleToggleHints = useCallback(() => {
        store.hints = !snap.hints
    }, [snap.hints])

    const handleToggleDoors = useCallback(() => {
        store.openAngle = snap.openAngle === 0 ? OPEN_ANGLE_SNAP : 0
    }, [snap.openAngle])

    const handleToggleRuler = useCallback(() => {
        store.ruler = !snap.ruler
    }, [snap.ruler])

    const handleOpenGroupEdit = useCallback(() => {
        store.groupEdit = true
    }, [])

    const handleToggleDebug = useCallback(() => {
        setDebug(prev => !prev)
    }, [])

    const handleOpenCalculator = useCallback(() => {
        store.calculatorWindow = true
    }, [])

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
        <>

            <div className="flex h-screen w-full bg-indigo-100">

                <div className="w-full relative">
                    {/* Верхняя панель */}
                    <header className="flex items-center w-full absolute top-0 left-0 p-5 gap-5 pr-15">
                        <img src="/logo.png" alt="Logo" className="h-8" />
                        <div className="flex-1" />
                        <Hint
                            lineStyle={`w-[4px] h-[60px] translate-x-[25px] translate-y-[90%]`}
                            className={`w-[300px] translate-x-[-80%] translate-y-[80px]`} content='Показать или скрыть подсказки'>
                            <ToolButton
                                active={false}
                                onClick={handleToggleHints}
                                icon={<Settings size={20} />}
                            />
                        </Hint>
                    </header>
                    <div className='h-screen'>
                        <Canvas camera={{
                            position: [-6, 6, 6],
                            fov: 45,
                            near: 0.1,
                            far: 1000,
                        }}>
                            {/* <Html>
                                <PreloaderOverlay />
                            </Html> */}
                            <Room />
                            <ambientLight intensity={0.6} color="#fff8f0" />

                            {/* Направленное — имитация окна */}
                            <directionalLight
                                position={[5, 8, 5]}
                                intensity={1.2}
                                color="#ffffff"
                                castShadow
                                shadow-mapSize={[1024, 1024]}
                            />

                            {/* Заполняющее — убирает тени */}
                            <directionalLight
                                position={[-3, 4, -3]}
                                intensity={0.4}
                                color="#e8e4ff"
                            />

                            {/* Подсветка снизу — для фасадов */}
                            <pointLight position={[0, -1, 2]} intensity={0.3} color="#ffeedd" />

                            {/* Hemisphere — небо/земля */}
                            <hemisphereLight
                                args={["#ddeeff", "#332211", 0.5]}
                            />

                            <ConstantForwardOrbitControls
                                stepSize={0.4}      // moves 1.5 units per scroll tick, always
                                enableRotate={true}
                                enablePan={true}
                                minDistance={2}
                                maxDistance={10}
                                maxPolarAngle={Math.PI / 2}
                            />
                        </Canvas>
                    </div>
                    {/* Нижняя панель */}
                    <footer className="flex items-end gap-4 w-full absolute bottom-0 left-0 p-5 z-10 pr-15">
                        <ToolButton
                            active={snap.openAngle !== 0}
                            onClick={handleToggleDoors}
                            icon={<DoorOpen size={20} />}
                        />
                        <ToolButton
                            active={snap.ruler}
                            onClick={handleToggleRuler}
                            icon={<Ruler size={20} />}
                        />
                        <ToolButton
                            active={snap.groupEdit}
                            onClick={handleOpenGroupEdit}
                            icon={<Columns3Cog size={20} />}
                        />
                        <div className="flex-1" />
                        <ToolButton
                            active={debug}
                            onClick={handleToggleDebug}
                            icon={<Code2 size={20} />}
                        />
                        <ToolButton
                            active={false}
                            onClick={() => { }}
                            icon={<LogIn size={20} />}
                        />
                        <ToolButton
                            active={false}
                            onClick={() => { }}
                            icon={<Save size={20} />}
                        />
                        <ToolButton
                            active={false}
                            onClick={() => { }}
                            icon={<Printer size={20} />}
                        />
                        <ToolButton
                            active={snap.calculatorWindow}
                            onClick={handleOpenCalculator}
                            icon={<Calculator size={20} />}
                        />
                        <PDFExportButton />
                    </footer>
                </div>

                {/* Сайдбар */}
                <Sidebar defaultPage="floor">
                    <SidebarPage title="Напольные" page="floor">
                        {/* <PlaceholderPage title="Напольные модули" search /> */}
                        <div className='flex flex-col gap-[30px] w-full bg-white px-6 py-8 h-full overflow-x-auto'>
                            <div className='text-2xl font-semibold'>Напольные модули</div>
                            <div className='flex rounded-[10px] bg-gray-100 items-center pl-4'>
                                <div className='opacity-30'>
                                    <Search />
                                </div>
                                <input className='p-3 w-full' placeholder='Ваш запрос' />
                            </div>
                            <div className='grid grid-cols-3 gap-[15px]'>
                                {data.filter(module => module.tags.includes(CATEGORY_FLOOR)).map((module) => <ModuleCard module={module} />)}
                            </div>
                        </div>
                    </SidebarPage>

                    <SidebarPage title="Настенные" page="wall">
                        <div className='flex flex-col gap-[30px] w-full bg-white px-6 py-8 h-full overflow-x-auto'>
                            <div className='text-2xl font-semibold'>Настенные модули</div>
                            <div className='flex rounded-[10px] bg-gray-100 items-center pl-4'>
                                <div className='opacity-30'>
                                    <Search />
                                </div>
                                <input className='p-3 w-full' placeholder='Ваш запрос' />
                            </div>
                            <div className='grid grid-cols-3 gap-[15px]'>
                                {data.filter(module => module.tags.includes(CATEGORY_WALL)).map((module) => <ModuleCard module={module} />)}
                            </div>
                        </div>
                    </SidebarPage>

                    <SidebarPage title="Техника" page="tech">
                        <div className='flex flex-col gap-[30px] w-full bg-white px-6 py-8 h-full overflow-x-auto'>
                            <div className='text-2xl font-semibold'>Техника</div>
                            <div className='flex rounded-[10px] bg-gray-100 items-center pl-4'>
                                <div className='opacity-30'>
                                    <Search />
                                </div>
                                <input className='p-3 w-full' placeholder='Ваш запрос' />
                            </div>
                            <div className='grid grid-cols-3 gap-[15px]'>
                                {data.filter(module => module.tags.includes(CATEGORY_TECH)).map((module) => <ModuleCard module={module} />)}
                            </div>
                        </div>
                    </SidebarPage>

                    <SidebarPage title="Столешница" page="table">
                        <div className="flex flex-col gap-8 w-full bg-white px-6 py-8 h-full overflow-y-auto">
                            <h2 className="text-2xl font-semibold">Столешница</h2>
                            <TabletopSelector
                                options={TABLETOP_OPTIONS}
                                selected={snap.tabletop as TabletopOption}
                                onSelect={handleTabletopSelect}
                            />
                            <section>
                                <h3 className="text-lg font-semibold mb-4">Цвет столешницы</h3>
                                <ColorPicker
                                    colors={COLORS}
                                    selected={snap.tabletopColor}
                                    onSelect={handleTabletopColorSelect}
                                />
                            </section>
                        </div>
                    </SidebarPage>

                    <SidebarPage title="Помещение" page="room">
                        <div className="flex flex-col gap-8 w-full bg-white px-6 py-8 h-full overflow-y-auto">
                            <section>
                                <h3 className="text-lg font-semibold mb-4">Цвет стен</h3>
                                <ColorPicker
                                    colors={COLORS}
                                    selected={snap.roomColor}
                                    onSelect={handleRoomColorSelect}
                                />
                            </section>
                            <section>
                                <h3 className="text-lg font-semibold mb-4">Высота фартука</h3>
                                <WallHeightSelector
                                    heights={WALL_HEIGHTS}
                                    selected={snap.wallHeight}
                                    onSelect={handleWallHeightSelect}
                                />
                            </section>
                        </div>
                    </SidebarPage>
                </Sidebar>
                <HintScreen />
                <CalculatorComponent />
                <ModuleConfig />
                <MobileScreen />
                <GroupEdit />
                
            </div >

        </>
    )
}
