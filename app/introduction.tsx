'use client'

import { store } from '@/store';
import { X } from 'lucide-react';
import React, { useState } from 'react';

function validate(n) {
    if (n === '' || n === null || n === undefined) return true;
    if (isNaN(parseFloat(n))) return true;
    const num = parseFloat(n);
    if (num < 2 || num > 20) return true;
    return false;
}

function Introduction() {
    const [width, setWidth] = useState('5');
    const [height, setHeight] = useState('3');
    const [depth, setDepth] = useState('4');
    const [error, setError] = useState('');

    const handleStart = () => {
        // Validate all fields
        if (validate(width) || validate(height) || validate(depth)) {
            setError('Пожалуйста, введите корректное число в диапазоне от 2 до 20 для всех измерений');
            return;
        }

        // Clear any previous errors
        setError('');

        // Convert to numbers and set store values
        const w = parseFloat(width);
        const h = parseFloat(height);
        const d = parseFloat(depth);

        store.page = 'config';
        store.room.d = d;
        store.room.w = w;
        store.room.h = h;
    };

    const handleInputChange = (setter, value) => {
        // Allow only numbers and decimal point
        if (value === '' || /^\d*\.?\d*$/.test(value)) {
            setter(value);
            // Clear error when user starts typing
            if (error) setError('');
        }
    };

    return (
        <div className='h-[100vh] w-full bg-indigo-100 flex items-center justify-center'>
            <div className='flex w-full fixed top-0 left-0 p-5'>
                <div>
                    {/* <img src='/logo.png' /> */}
                </div>
                <div className='w-full'></div>
            </div>
            <div className='shadow-sm rounded-[50px] w-full max-w-[950px] bg-[#FAF0EA] flex justify-between relative'>
                <div className='flex flex-col gap-[25px] w-[750px] py-[38px] pl-[38px]'>
                    <div className='text-[38px] w-full'>
                        Введите размер помещения
                    </div>
                    <div className='flex items-center gap-[10px]'>
                        <div>
                            <div className='text-sm font-semibold pb-1 text-gray-500'>Длина, м</div>
                            <input
                                value={width}
                                onInput={(e) => handleInputChange(setWidth, e.target.value)}
                                className={`${validate(width) ? 'border-2 border-red-400 bg-red-100' : 'border-2 border-white bg-white'} outline-none w-full h-[60px] rounded-[10px] text-center`}
                                placeholder='Длина, м'
                            />
                        </div>
                        <div className='pt-5'>
                            <X />
                        </div>
                        <div>
                            <div className='text-sm font-semibold pb-1 text-gray-500'>Ширина, м</div>
                            <input
                                value={depth}
                                onInput={(e) => handleInputChange(setDepth, e.target.value)}
                                className={`${validate(depth) ? 'border-2 border-red-400 bg-red-100' : 'border-2 border-white bg-white'} outline-none w-full h-[60px] rounded-[10px] text-center`}
                                placeholder='Ширина, м'
                            />
                        </div>
                        <div className='pt-5'>
                            <X />
                        </div>
                        <div>
                            <div className='text-sm font-semibold pb-1 text-gray-500'>Высота, м</div>
                            <input
                                value={height}
                                onInput={(e) => handleInputChange(setHeight, e.target.value)}
                                className={`${validate(height) ? 'border-2 border-red-400 bg-red-100' : 'border-2 border-white bg-white'} outline-none w-full h-[60px] rounded-[10px] text-center`}
                                placeholder='Высота, м'
                            />
                        </div>
                    </div>

                    {error && (
                        <div className='text-red-500 text-sm mt-[-10px]'>
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            onClick={handleStart}
                            className='h-[60px] bg-[#F06900] px-[60px] rounded-[12px] text-white cursor-pointer hover:bg-[#e05e00] transition-colors'
                        >
                            Начать
                        </button>
                    </div>
                </div>
                <div className='w-full'></div>
                <img className='absolute right-0 bottom-0' src='/intro.png' />
            </div>
        </div>
    );
}

export default Introduction;
