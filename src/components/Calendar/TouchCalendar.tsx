import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { cn } from '../../lib/utils';
import 'react-day-picker/style.css';

interface TouchCalendarProps {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  className?: string;
}

export function TouchCalendar({ date, onSelect, className }: TouchCalendarProps) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <div className={cn("bg-white p-4 md:p-6 rounded-3xl shadow-xl shadow-gray-100/50 border border-gray-100", className)}>
      <DayPicker
        mode="single"
        selected={date}
        onSelect={onSelect}
        locale={ptBR as any}
        classNames={{
          root: `${defaultClassNames.root} w-full`,
          months: `${defaultClassNames.months} w-full`,
          month: `${defaultClassNames.month} w-full`,
          month_caption: `${defaultClassNames.month_caption} text-xl font-bold text-gray-900 mb-4`,
          weekdays: `${defaultClassNames.weekdays}`,
          weekday: `${defaultClassNames.weekday} text-gray-400 font-medium text-xs uppercase`,
          day: `${defaultClassNames.day} h-10 w-10 rounded-full text-gray-700 hover:bg-gray-100 transition-colors active:scale-95`,
          today: `${defaultClassNames.today} border-2 border-blue-200 text-blue-600 font-bold`,
          selected: `${defaultClassNames.selected} bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200`,
          outside: `${defaultClassNames.outside} text-gray-300 opacity-50`,
          disabled: `${defaultClassNames.disabled} text-gray-300 opacity-50`,
          chevron: `${defaultClassNames.chevron} fill-gray-500`,
          nav: `${defaultClassNames.nav}`,
          button_previous: `${defaultClassNames.button_previous} h-9 w-9 rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50`,
          button_next: `${defaultClassNames.button_next} h-9 w-9 rounded-xl border border-gray-100 shadow-sm hover:bg-gray-50`,
        }}
      />
    </div>
  );
}
