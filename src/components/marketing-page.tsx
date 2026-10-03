import Link from 'next/link';

// Shared building blocks for the public marketing pages (/, /golf, /bowling).
export const condensed = "font-['Barlow_Condensed','Arial_Narrow',sans-serif]";
export const wrap = 'w-full max-w-[1120px] mx-auto px-6';
export const h3Class = `${condensed} font-bold uppercase leading-[1.05] text-[clamp(2rem,5vw,2.8rem)] mb-2`;
export const btn = 'inline-block bg-[#E50000] hover:bg-[#c70000] text-white font-semibold text-[0.95rem] px-[22px] py-3 rounded-md tracking-[0.02em]';
export const btnBig = `${btn} text-[1.05rem] !px-7 !py-[15px]`;

export function Red({ children }: { children: React.ReactNode }) {
  return <span className="text-[#E50000]">{children}</span>;
}

export function NumBadge({ n }: { n: number }) {
  return (
    <span className="shrink-0 w-7 h-7 inline-flex items-center justify-center rounded-md bg-[#E50000] text-white font-semibold text-[0.85rem]">{n}</span>
  );
}

export function Steps({ items }: { items: { h: string; p: string }[] }) {
  return (
    <ol className="list-none m-0 p-0 flex flex-col gap-4">
      {items.map((s, i) => (
        <li key={s.h} className="flex gap-3">
          <NumBadge n={i + 1} />
          <div>
            <h4 className="m-0 text-[1.05rem] font-semibold leading-snug">{s.h}</h4>
            <p className="mt-0.5 mb-0 text-[#55637a] text-[0.92rem] leading-snug">{s.p}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Section({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="pt-[72px]">
      <div className={wrap}>{children}</div>
    </section>
  );
}

export function RoleBlock({
  label, labelClass, steps, children,
}: {
  label: string; labelClass: string; steps: { h: string; p: string }[]; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-[481px]:flex-row gap-6 items-start">
      <div>
        <span className={`inline-block text-white font-semibold text-[0.8rem] tracking-[0.12em] px-3.5 py-1.5 mb-3.5 ${labelClass}`}>{label}</span>
        {children}
      </div>
      <Steps items={steps} />
    </div>
  );
}

export function BulletCard({ title, items, n }: { title: string; items: string[]; n?: number }) {
  return (
    <div className="bg-white text-[#213147] border border-[#d8dce3] rounded-[10px] p-6">
      <h4 className="m-0 mb-2.5 text-[1.2rem] font-semibold flex items-center gap-2.5">
        {n !== undefined && <NumBadge n={n} />}
        {title}
      </h4>
      <ul className="m-0 p-0 list-none">
        {items.map((t) => (
          <li key={t} className="relative py-1 pl-[18px] text-[#55637a] text-[0.96rem] before:content-[''] before:absolute before:left-0 before:top-3.5 before:w-[7px] before:h-[7px] before:bg-[#E50000]">{t}</li>
        ))}
      </ul>
    </div>
  );
}

export interface PricingRow { h: string; p: string; was?: string; v: string; unit?: string; l?: string }

export function PricingTable({ rows }: { rows: PricingRow[] }) {
  return (
    <div className="max-w-[880px] bg-white text-[#213147] border border-[#d8dce3] rounded-[10px] px-[26px] py-2">
      {rows.map((r) => (
        <div key={r.h} className="grid grid-cols-1 min-[641px]:grid-cols-[1fr_auto] gap-x-8 gap-y-2 py-5 items-center border-b border-[#d8dce3] last:border-b-0">
          <div>
            <h4 className={`${condensed} m-0 uppercase text-[1.3rem] font-bold tracking-[0.02em]`}>{r.h}</h4>
            <p className="mt-0.5 mb-0 text-[#55637a] text-[0.92rem]">{r.p}</p>
          </div>
          <div className="text-left min-[641px]:text-right">
            <div className="font-extrabold text-[2rem] leading-[1.1]">
              {r.was && <s className="text-base font-medium text-[#55637a] mr-1.5">{r.was}</s>}
              {r.v}
              {r.unit && <small className="text-base font-medium">{r.unit}</small>}
            </div>
            {r.l && <div className="text-[0.85rem] text-[#55637a]">{r.l}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ContactBand({
  heading, text, cta, sms, otherLabel, otherHref, otherText,
}: {
  heading: string; text: string; cta: string; sms: string; otherLabel: string; otherHref: string; otherText: string;
}) {
  return (
    <div className="mt-[72px] bg-[#213147] text-white border-t-[5px] border-[#E50000]">
      <div className={`${wrap} py-11 flex flex-wrap gap-7 items-center justify-between`}>
        <div>
          <h3 className={`${h3Class} text-white mb-1.5`}>{heading}</h3>
          <p className="m-0 text-[#c9d2e0]">{text}</p>
          <p className="mt-[18px] mb-0"><a href={sms} className={btnBig}>{cta}</a></p>
          <p className="mt-5 mb-0 text-[#c9d2e0] text-[0.95rem]">
            {otherLabel} <Link href={otherHref} className="text-white underline underline-offset-2">{otherText}</Link>
          </p>
        </div>
        <div className="border-l-4 border-[#E50000] pl-5">
          <b className="block text-[1.3rem] font-semibold">Peter Mosher</b>
          <a className="block text-[1.05rem] hover:underline" href={sms}>(248) 836 7515</a>
          <a className="block text-[1.05rem] hover:underline" href="mailto:hello@kooporder.com">hello@kooporder.com</a>
        </div>
      </div>
    </div>
  );
}

export function OfferCard({
  heading, price, priceNote, bullets, cta, sms, code, why,
}: {
  heading: string; price: string; priceNote: string; bullets: string[]; cta: string; sms: string; code: string; why: string;
}) {
  return (
    <aside aria-labelledby="offer-h" className="bg-white text-[#213147] rounded-[10px] p-[26px] border-t-[6px] border-[#E50000]">
      <h2 id="offer-h" className={`${condensed} m-0 mb-1 font-bold text-[2rem] leading-none uppercase`}>{heading}</h2>
      <p className="mt-2.5 mb-0 font-extrabold text-[2.4rem] leading-[1.1]">
        {price}<small className="text-base font-medium text-[#55637a]">{priceNote}</small>
      </p>
      <ul className="list-none mt-3 mb-[18px] p-0 text-[0.95rem] [&>li]:relative [&>li]:py-[3px] [&>li]:pl-[18px] [&>li]:before:content-[''] [&>li]:before:absolute [&>li]:before:left-0 [&>li]:before:top-[13px] [&>li]:before:w-2 [&>li]:before:h-2 [&>li]:before:bg-[#E50000]">
        {bullets.map((b) => <li key={b}>{b}</li>)}
      </ul>
      <a href={sms} className={`${btnBig} block text-center`}>{cta}</a>
      <p className="mt-2.5 mb-0 text-[0.85rem] text-[#55637a] text-center">Mention <b className="text-[#213147]">{code}</b>. Spots close December 31, 2026.</p>
      <p className="mt-3.5 mb-0 text-[0.85rem] italic text-[#55637a]">{why}</p>
    </aside>
  );
}

export function PageHero({ children, offer }: { children: React.ReactNode; offer: React.ReactNode }) {
  return (
    <div className="bg-[#213147] text-white border-b-[5px] border-[#E50000]">
      <div className={wrap}>
        <div className="grid grid-cols-1 min-[901px]:grid-cols-[1.35fr_1fr] gap-10 pt-11 pb-14 items-start">
          <header>{children}</header>
          {offer}
        </div>
      </div>
    </div>
  );
}

export function HeroText({ h1, highlight, tag, sub }: { h1: React.ReactNode; highlight: string; tag: string; sub: React.ReactNode }) {
  return (
    <>
      <h1 className="m-0 font-extrabold uppercase text-[clamp(2rem,5.6vw,3.6rem)] leading-[1.02] tracking-[-0.03em]">
        {h1} <span className="inline-block bg-[#E50000] px-3.5 pt-1 pb-1.5 mt-3">{highlight}</span>
      </h1>
      <p className="mt-[22px] mb-0 italic text-[#c9d2e0] text-[1.1rem]">{tag}</p>
      <p className="mt-[18px] mb-0 max-w-[560px] text-[#c9d2e0] leading-relaxed">{sub}</p>
    </>
  );
}
