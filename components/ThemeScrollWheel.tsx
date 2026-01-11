import React, { useRef, useEffect } from 'react';
import { 
  Terminal, Monitor, Waves, Sun, Cloud, Palette, Layers, Apple, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useTheme, Theme } from '../contexts/ThemeContext';

const THEME_OPTIONS: { id: Theme; icon: React.ReactNode; label: string }[] = [
  { id: 'DEFAULT', icon: <Terminal size={14} />, label: 'TERMINAL' },
  { id: 'BLOOMBERG', icon: <Monitor size={14} />, label: 'AMBER' },
  { id: 'OCEAN', icon: <Waves size={14} />, label: 'OCEAN' },
  { id: 'SUN', icon: <Sun size={14} />, label: 'SOLAR' },
  { id: 'WHITE', icon: <Cloud size={14} />, label: 'LIGHT' },
  { id: 'GREY', icon: <Palette size={14} />, label: 'GREY' },
  { id: 'GLASS', icon: <Layers size={14} />, label: 'GLASS' },
  { id: 'APPLE_GLASS', icon: <Apple size={14} />, label: 'APPLE' },
];

export const ThemeScrollWheel: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 120;
      scrollRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
    }
  };

  // Center active theme on mount or change
  useEffect(() => {
    const activeBtn = scrollRef.current?.querySelector(`[data-theme-id="${theme}"]`);
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [theme]);

  return (
    <div className="flex items-center gap-1 bg-terminal-black/80 border border-terminal-darkGreen p-1 rounded-none shadow-2xl relative group max-w-[200px] overflow-hidden">
      <button 
        onClick={() => handleScroll('left')}
        className="absolute left-0 top-0 bottom-0 z-20 px-0.5 bg-black/40 backdrop-blur-sm border-r border-terminal-darkGreen/40 opacity-0 group-hover:opacity-100 transition-opacity hover:text-terminal-green"
      >
        <ChevronLeft size={12} />
      </button>

      <div 
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 py-0.5 scroll-smooth"
        style={{ scrollbarWidth: 'none' }}
      >
        {THEME_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            data-theme-id={opt.id}
            onClick={() => setTheme(opt.id)}
            className={`
              flex-shrink-0 w-8 h-8 flex items-center justify-center snap-center transition-all duration-300
              ${theme === opt.id 
                ? 'bg-terminal-green text-terminal-black scale-110 shadow-[0_0_10px_rgba(var(--terminal-green-rgb),0.5)] z-10' 
                : 'text-gray-500 hover:text-terminal-green bg-transparent border border-transparent hover:border-terminal-darkGreen/50'
              }
            `}
            title={opt.label}
          >
            {opt.icon}
          </button>
        ))}
      </div>

      <button 
        onClick={() => handleScroll('right')}
        className="absolute right-0 top-0 bottom-0 z-20 px-0.5 bg-black/40 backdrop-blur-sm border-l border-terminal-darkGreen/40 opacity-0 group-hover:opacity-100 transition-opacity hover:text-terminal-green"
      >
        <ChevronRight size={12} />
      </button>

      {/* Visual Indicator of Wheel nature */}
      <div className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none bg-gradient-to-r from-black to-transparent z-10"></div>
      <div className="absolute right-0 top-0 bottom-0 w-6 pointer-events-none bg-gradient-to-l from-black to-transparent z-10"></div>
    </div>
  );
};