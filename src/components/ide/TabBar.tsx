'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  path: string;
  dirty: boolean;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string | null;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
}

function filename(path: string): string {
  if (path === '__CHALLENGE.md') return 'CHALLENGE.md';
  return path.split('/').pop() || path;
}

export default function TabBar({ tabs, activeTab, onSelectTab, onCloseTab }: TabBarProps) {
  if (tabs.length === 0) return null;

  return (
    <div className="flex items-center h-9 bg-[#111114] border-b border-[#1e1e22] overflow-x-auto scrollbar-none">
      {tabs.map((tab) => {
        const isActive = tab.path === activeTab;
        return (
          <div
            key={tab.path}
            className={cn(
              'group flex items-center gap-1.5 px-3 h-full text-xs border-r border-[#1e1e22] cursor-pointer select-none flex-shrink-0',
              isActive
                ? 'bg-[#09090b] text-[#fafafa] border-b-2 border-b-[#3b82f6]'
                : 'text-[#71717a] hover:text-[#a1a1aa]'
            )}
            onClick={() => onSelectTab(tab.path)}
          >
            <span className="font-mono">{filename(tab.path)}</span>
            {tab.dirty && <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] flex-shrink-0" />}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCloseTab(tab.path);
              }}
              className={cn(
                'p-0.5 rounded hover:bg-[#27272a] transition-colors flex-shrink-0',
                isActive ? 'opacity-60 hover:opacity-100' : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
              )}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
