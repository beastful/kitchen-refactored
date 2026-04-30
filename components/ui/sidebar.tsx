'use client'

import { AnimatePresence, motion } from "motion/react";
import { useState, Children, isValidElement, ReactElement, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SidebarPageProps {
  page: string;
  title: string;
  children: ReactNode;
}

interface SidebarProps {
  children: ReactElement<SidebarPageProps> | ReactElement<SidebarPageProps>[];
  defaultPage: string;
}

function isSidebarPage(child: unknown): child is ReactElement<SidebarPageProps> {
  if (!isValidElement(child)) return false;
  const props = child.props as Record<string, unknown>;
  return typeof props.page === 'string' && typeof props.title === 'string';
}

export function Sidebar({ children, defaultPage }: SidebarProps) {
  const [activePage, setActivePage] = useState(defaultPage);

  const pages = Children.toArray(children).filter(isSidebarPage);

  return (
    <div className="h-full flex gap-1 w-[550px] min-w-[550px]">
      <nav className="flex gap-1 flex-col py-1 font-semibold">
        {pages.map(child => {
          const isActive = child.props.page === activePage;
          return (
            <button
              key={child.props.page}
              onClick={() => setActivePage(child.props.page)}
              className={cn(
                '[writing-mode:sideways-lr]',
                'px-5 py-2 rounded-full max-h-full',
                'overflow-hidden whitespace-nowrap text-ellipsis',
                'shadow cursor-pointer transition-colors',
                isActive ? 'bg-[#F06900] text-white' : 'bg-white hover:bg-gray-50'
              )}
            >
              {child.props.title}
            </button>
          );
        })}
      </nav>

      <div className="w-full relative overflow-hidden">
        <AnimatePresence mode="wait">
          {pages.map(child =>
            child.props.page === activePage ? (
              <motion.div
                key={child.props.page}
                className="bg-white h-full absolute inset-0"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
              >
                {child.props.children}
              </motion.div>
            ) : null
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export function SidebarPage({ children }: { children: ReactNode, page: string, title: string }) {
  return <>{children}</>;
}
