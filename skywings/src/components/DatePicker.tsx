import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval, 
  isToday,
  parseISO,
  isValid,
  setYear,
  getYear
} from 'date-fns';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export default function DatePicker({ 
  value, 
  onChange, 
  placeholder = "Select date", 
  className,
  required = false
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'years'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0, openUp: false });
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial value
  const selectedDate = value && isValid(parseISO(value)) ? parseISO(value) : undefined;

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const dropdownHeight = 420; // Approximate height of the calendar
      const spaceBelow = windowHeight - rect.bottom;
      const openUp = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

      setDropdownPos({
        top: openUp ? rect.top - 8 : rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        openUp
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Reset view mode when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setViewMode('calendar'), 300);
    }
  }, [isOpen]);

  const handleDateSelect = (date: Date) => {
    onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const handleYearSelect = (year: number) => {
    setCurrentMonth(setYear(currentMonth, year));
    setViewMode('calendar');
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const years = useMemo(() => {
    const currentYear = getYear(new Date());
    const startYear = currentYear - 100;
    const endYear = currentYear + 20;
    const yearsArray = [];
    for (let i = endYear; i >= startYear; i--) {
      yearsArray.push(i);
    }
    return yearsArray;
  }, []);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
        <button
          type="button"
          onClick={prevMonth}
          disabled={viewMode === 'years'}
          className={cn(
            "p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white",
            viewMode === 'years' && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => setViewMode(viewMode === 'calendar' ? 'years' : 'calendar')}
          className="text-sm font-black uppercase tracking-widest text-white hover:text-[#7371ff] transition-colors flex items-center gap-2"
        >
          {viewMode === 'calendar' ? format(currentMonth, 'MMMM yyyy') : 'Select Year'}
        </button>
        <button
          type="button"
          onClick={nextMonth}
          disabled={viewMode === 'years'}
          className={cn(
            "p-2 hover:bg-white/5 rounded-full transition-colors text-white/60 hover:text-white",
            viewMode === 'years' && "opacity-0 pointer-events-none"
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day) => (
          <div key={day} className="text-[10px] font-black uppercase tracking-widest text-white/20 text-center py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const allDays = eachDayOfInterval({ start: startDate, end: endDate });

    return (
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((date, i) => {
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isCurrentMonth = isSameMonth(date, monthStart);
          const isTodayDate = isToday(date);

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDateSelect(date)}
              className={cn(
                "relative h-10 w-10 flex items-center justify-center rounded-xl text-xs font-bold transition-all",
                !isCurrentMonth ? "text-white/10" : "text-white/80 hover:bg-white/5",
                isTodayDate && !isSelected && "text-[#7371ff] font-black",
                isSelected && "bg-[#7371ff] text-white shadow-lg shadow-[#7371ff]/20 scale-110 z-10"
              )}
            >
              {format(date, 'd')}
              {isTodayDate && !isSelected && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#7371ff] rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const renderYearGrid = () => {
    return (
      <div className="grid grid-cols-3 gap-2 max-h-[280px] overflow-y-auto custom-scrollbar p-2">
        {years.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => handleYearSelect(year)}
            className={cn(
              "py-3 rounded-xl text-xs font-bold transition-all",
              getYear(currentMonth) === year 
                ? "bg-[#7371ff] text-white shadow-lg shadow-[#7371ff]/20" 
                : "text-white/60 hover:bg-white/5 hover:text-white"
            )}
          >
            {year}
          </button>
        ))}
      </div>
    );
  };

  const dropdownContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: dropdownPos.openUp ? 10 : -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
          style={{
            position: 'fixed',
            top: dropdownPos.openUp ? 'auto' : dropdownPos.top,
            bottom: dropdownPos.openUp ? window.innerHeight - dropdownPos.top : 'auto',
            left: dropdownPos.left,
            zIndex: 9999,
          }}
          className="w-[320px] bg-slate-900 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden backdrop-blur-xl"
        >
          {renderHeader()}
          <div className="p-4">
            {viewMode === 'calendar' ? (
              <>
                {renderDays()}
                {renderCells()}
              </>
            ) : (
              renderYearGrid()
            )}
          </div>
          <div className="p-4 border-t border-white/5 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                handleYearSelect(getYear(new Date()));
                handleDateSelect(new Date());
              }}
              className="text-[10px] font-black uppercase tracking-widest text-[#7371ff] hover:text-[#6361ff] transition-colors"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setIsOpen(false);
                }}
                className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full rounded-2xl px-6 py-4 transition-all shadow-sm flex items-center justify-between cursor-pointer group",
          !className?.includes('bg-') && "bg-white",
          !className?.includes('text-') && "text-slate-700",
          className
        )}
      >
        <span className={cn(
          "text-sm font-medium",
          !value && (className?.includes('text-white') ? "text-white/40" : "text-slate-400")
        )}>
          {value ? format(parseISO(value), 'PPP') : placeholder}
        </span>
        <CalendarIcon className={cn(
          "w-5 h-5 transition-colors",
          value ? "text-[#7371ff]" : (className?.includes('text-white') ? "text-white/20 group-hover:text-white/40" : "text-slate-300 group-hover:text-slate-400")
        )} />
      </div>

      {createPortal(dropdownContent, document.body)}
      
      {/* Hidden input for form submission if needed */}
      <input 
        type="hidden" 
        required={required} 
        value={value || ''} 
        name="date"
      />
    </div>
  );
}
