import { useState } from 'react';

const pad = (n: string) => n.padStart(2, '0');

/** 세 칸이 다 유효한 날짜일 때만 'YYYY-MM-DD', 아니면 '' */
function toIso(y: string, m: string, d: string): string {
  if (y.length !== 4 || !m || !d) return '';
  const iso = `${y}-${pad(m)}-${pad(d)}`;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime()) || date.getDate() !== Number(d) ? '' : iso;
}

/** 년·월·일 세 칸 입력. 브라우저 날짜 피커 대신 직접 타이핑 (생년월일은 피커로 수십 년 넘기기 불편) */
export function DateParts({ value, onChange, required }: { value: string; onChange: (iso: string) => void; required?: boolean }) {
  const [y, m, d] = value ? value.split('-') : ['', '', ''];
  const [parts, setParts] = useState({ y, m: m ? String(Number(m)) : '', d: d ? String(Number(d)) : '' });

  const update = (next: Partial<typeof parts>) => {
    const p = { ...parts, ...next };
    setParts(p);
    onChange(toIso(p.y, p.m, p.d));
  };
  const digits = (s: string, max: number) => s.replace(/\D/g, '').slice(0, max);

  const cells: { key: keyof typeof parts; unit: string; placeholder: string; max: number }[] = [
    { key: 'y', unit: '년', placeholder: '1995', max: 4 },
    { key: 'm', unit: '월', placeholder: '3', max: 2 },
    { key: 'd', unit: '일', placeholder: '1', max: 2 },
  ];

  return (
    <div className="grid grid-cols-[1.5fr_1fr_1fr] gap-2">
      {cells.map((c) => (
        <label key={c.key} className="flex items-center gap-1.5">
          <input
            className="field min-w-0 text-right"
            inputMode="numeric"
            placeholder={c.placeholder}
            required={required}
            value={parts[c.key]}
            onChange={(e) => update({ [c.key]: digits(e.target.value, c.max) })}
          />
          <span className="shrink-0 text-sm text-muted">{c.unit}</span>
        </label>
      ))}
    </div>
  );
}
