import { BRAND } from '../constants';

interface MultiSelectProps {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}

export function MultiSelect({ options, value, onChange }: MultiSelectProps) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const selected = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="text-xs px-2.5 py-1 rounded-full border font-medium transition-all"
            style={
              selected
                ? { backgroundColor: BRAND, borderColor: BRAND, color: '#fff' }
                : { backgroundColor: 'transparent', borderColor: '#d1d5db', color: '#6b7280' }
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
