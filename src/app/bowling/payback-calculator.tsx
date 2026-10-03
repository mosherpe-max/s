'use client';

import { useState } from 'react';

const inputClass =
  'w-full text-[1.05rem] px-3 py-2.5 border-2 border-[#d8dce3] rounded-md bg-[#F0F0F0] text-[#213147] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#E50000]';

export function PaybackCalculator() {
  const [avg, setAvg] = useState('15');
  const [margin, setMargin] = useState('75');
  const [fee, setFee] = useState('139');

  const a = parseFloat(avg);
  const m = parseFloat(margin) / 100;
  const f = parseFloat(fee);
  const valid = a > 0 && m > 0 && f >= 0;
  const orders = valid ? Math.ceil(f / (a * m)) : 0;
  const days = orders > 0 ? 30 / orders : 0;

  return (
    <div className="max-w-[780px] bg-white text-[#213147] border border-[#d8dce3] rounded-[10px] p-[26px]">
      <div className="grid grid-cols-1 min-[641px]:grid-cols-3 gap-4 mb-5">
        <div>
          <label htmlFor="avg" className="block text-[0.85rem] font-semibold mb-1">Average order ($)</label>
          <input id="avg" type="number" inputMode="decimal" min={1} step={0.5} value={avg} onChange={(e) => setAvg(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="mar" className="block text-[0.85rem] font-semibold mb-1">Gross margin (%)</label>
          <input id="mar" type="number" inputMode="decimal" min={1} max={100} step={1} value={margin} onChange={(e) => setMargin(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="fee" className="block text-[0.85rem] font-semibold mb-1">Monthly fee ($)</label>
          <input id="fee" type="number" inputMode="decimal" min={0} step={1} value={fee} onChange={(e) => setFee(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="border-t-2 border-[#E50000] pt-4" aria-live="polite">
        <p className="m-0 mb-1.5 font-extrabold text-[clamp(1.4rem,3.6vw,2rem)] leading-tight">
          {valid ? `Koop pays for itself at ${orders} extra order${orders === 1 ? '' : 's'} a month.` : 'Enter your numbers above.'}
        </p>
        {valid && orders > 0 && (
          <p className="m-0 mb-1.5 text-[#55637a]">
            {days >= 1.5 ? `That is about one extra order every ${Math.round(days)} days.` : 'That is more than one extra order a day.'}
          </p>
        )}
        <p className="m-0 text-[0.82rem] text-[#55637a]">Based on the numbers you enter. Your numbers may vary.</p>
      </div>
    </div>
  );
}
