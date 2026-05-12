'use client'

import React, { useState, useCallback } from 'react'
import {
    Settings, Ruler, DoorOpen, Save, Printer, Calculator,
    Columns3Cog, LogIn, Code2, Search
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
                        <Scene />
                    </div>
                   
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

                <Sidebar defaultPage="floor">
                    <SidebarPage title="Напольные" page="floor">
                       
                        <div className='flex flex-col gap-[30px] w-full bg-white px-6 py-8 h-full overflow-x-auto'>
                            <div className='text-2xl font-semibold'>Напольные модули</div>
                            <div className='flex rounded-[10px] bg-gray-100 items-center pl-4'>
                                <div className='opacity-30'>
                                    <Search />
                                </div>
                                <input className='p-3 w-full' placeholder='Ваш запрос' />
                            </div>
                            <div className='grid grid-cols-3 gap-[15px]'>
                              
                                {data.filter(module => module.tags.includes(CATEGORY_FLOOR)).map((module) => <ModuleCard key={JSON.stringify(module)} module={module} />)}
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
                                {data.filter(module => module.tags.includes(CATEGORY_WALL)).map((module) => <ModuleCard key={JSON.stringify(module)} module={module} />)}
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
                                {data.filter(module => module.tags.includes(CATEGORY_TECH)).map((module) => <ModuleCard key={JSON.stringify(module)} module={module} />)}
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
                            <div className='grid grid-cols-3 gap-[15px]'>
                                {data.filter(module => module.tags.includes(CATEGORY_ROOM)).map((module) => <ModuleCard key={JSON.stringify(module)} module={module} />)}
                            </div>
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
