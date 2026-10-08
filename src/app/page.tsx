import type { Metadata } from 'next';
import Link from 'next/link';

const TITLE = 'Koop | Mobile ordering for golf courses and bowling centers';
const DESCRIPTION =
  'Koop lets golfers and bowlers order and pay from their phone, and your staff delivers. No POS changes, no new hardware, live in less than a week.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://kooporder.com/' },
  openGraph: { type: 'website', title: TITLE, description: DESCRIPTION, url: 'https://kooporder.com/' },
};

const condensed = "font-['Barlow_Condensed','Arial_Narrow',sans-serif]";

function Target({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle className="home-pulse" r="12" fill="none" stroke="#E50000" strokeWidth="2.5" />
      <circle r="13" fill="#fff" />
      <circle r="9" fill="#E50000" />
      <circle r="5" fill="#fff" />
      <circle r="2.4" fill="#E50000" />
    </g>
  );
}

function GolfArt() {
  return (
    <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice" className="block w-full h-full">
      <rect width="400" height="180" fill="#17233a" />
      <ellipse cx="270" cy="70" rx="150" ry="62" fill="#1d3a4d" />
      <ellipse cx="110" cy="140" rx="90" ry="34" fill="#1d3a4d" />
      <ellipse cx="190" cy="105" rx="26" ry="14" fill="#2a4f6b" />
      <path d="M70 145 C 140 150, 170 70, 250 78 S 300 60, 318 52" fill="none" stroke="#9fb0c7" strokeWidth="2.5" strokeDasharray="2 8" strokeLinecap="round" />
      <Target x={318} y={52} />
      <g transform="translate(62 148)">
        <rect x="-18" y="-14" width="34" height="20" rx="4" fill="#fff" />
        <rect x="-22" y="-20" width="42" height="7" rx="3" fill="#E50000" />
        <circle cx="-9" cy="10" r="5" fill="#9fb0c7" />
        <circle cx="9" cy="10" r="5" fill="#9fb0c7" />
      </g>
    </svg>
  );
}

function BowlingArt() {
  const lanes = [22, 75, 128];
  return (
    <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice" className="block w-full h-full">
      <rect width="400" height="180" fill="#17233a" />
      <g fill="#26405a">
        {lanes.map((y) => (
          <rect key={y} x="20" y={y} width="360" height="30" rx="4" />
        ))}
      </g>
      <g fill="#fff">
        {lanes.map((y) => {
          const c = y + 15;
          return (
            <g key={y}>
              <circle cx="38" cy={c} r="3.4" />
              <circle cx="48" cy={c - 6} r="3.4" />
              <circle cx="48" cy={c + 6} r="3.4" />
              <circle cx="58" cy={c} r="3.4" />
            </g>
          );
        })}
      </g>
      <path d="M90 168 C 200 172, 300 150, 330 107" fill="none" stroke="#9fb0c7" strokeWidth="2.5" strokeDasharray="2 8" strokeLinecap="round" />
      <Target x={340} y={90} />
      <g transform="translate(78 166)">
        <circle r="9" fill="#fff" />
        <rect x="-7" y="6" width="14" height="10" rx="3" fill="#E50000" />
      </g>
    </svg>
  );
}

function Door({
  href, art, title, line, desc, chip, cta,
}: {
  href: string; art: React.ReactNode; title: string; line: string; desc: string; chip: string; cta: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col bg-white text-[#213147] rounded-[10px] overflow-hidden border-2 border-transparent transition-all duration-200 hover:-translate-y-1 hover:border-[#E50000] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="bg-[#17233a] aspect-[20/9]" aria-hidden="true">{art}</div>
      <div className="flex flex-col gap-2.5 flex-1 px-6 pt-5 pb-6">
        <h2 className={`${condensed} font-bold text-[2.3rem] leading-none uppercase tracking-[0.01em]`}>{title}</h2>
        <p className="font-semibold text-[1.1rem] text-[#E50000]">{line}</p>
        <p className="text-[#55637a] text-[0.98rem] leading-relaxed">{desc}</p>
        <span className="self-start bg-[#fdeaea] text-[#a80000] text-[0.8rem] font-semibold px-3 py-1 rounded-full">{chip}</span>
        <div className="mt-auto pt-3 self-start">
          <span className="inline-block bg-[#E50000] text-white font-semibold text-[0.95rem] px-[22px] py-3 rounded-md">{cta}</span>
        </div>
      </div>
    </Link>
  );
}

const reasons = [
  { h: 'Nobody leaves the fun', p: 'Guests order from where they are, on the course or at the lane. No walk to the clubhouse or snack bar, and no waiting for someone to pass by.' },
  { h: 'Staff deliver, not take orders', p: 'Your people spend the shift bringing orders out. Every order arrives already paid.' },
  { h: 'Nothing else changes', p: 'Your POS, kitchen, and bar run as they do today. Only taking the order and the payment change.' },
];

const steps = [
  { h: 'Guests scan', p: 'A code at the cart, the clubhouse, or the lane opens the menu. No app to download.' },
  { h: 'They order and pay', p: 'Card payment on their phone. The same menu and add-on prompts appear on every order, every shift.' },
  { h: 'Your staff delivers', p: "Instant notification, then the order goes to the golfer's GPS location or the lane." },
];

const promises = ['Live in less than a week', 'No POS changes', 'No new hardware', 'Cancel anytime'];

export default function HomePage() {
  return (
    <div className="font-headline bg-[#F0F0F0] text-[#213147] overflow-x-hidden">
      <style>{`
        .home-pulse { transform-box: fill-box; transform-origin: center; animation: home-pulse 2.4s ease-out infinite; }
        @keyframes home-pulse { 0% { transform: scale(.5); opacity: .9; } 100% { transform: scale(2.4); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .home-pulse { animation: none; opacity: .35; } }
      `}</style>

      <div className="bg-[#213147] text-white border-b-[5px] border-[#E50000]">
        <div className="w-full max-w-[1120px] mx-auto px-6">
          <header className="pt-12 pb-10 max-w-[860px]">
            <h1 className="m-0 font-extrabold uppercase text-[clamp(2.3rem,7vw,4.4rem)] leading-none tracking-[-0.03em]">
              Keep the amenity. <span className="text-[#E50000]">Remove the variability.</span>
            </h1>
            <p className="mt-6 mb-0 inline-block bg-[#E50000] px-4 py-2 font-extrabold uppercase text-[clamp(1.05rem,3vw,1.5rem)] leading-tight">
              The app sells. Your staff delivers.
            </p>
            <p className="mt-6 max-w-[600px] text-[1.12rem] leading-relaxed text-[#c9d2e0]">
              Sales and service can vary dramatically depending on who is working. Koop makes the selling process consistent, so every guest gets the same menu, ordering, upselling, and payment experience, every shift. They scan, order, and pay on their phone, and your staff brings it out.{' '}
              <strong className="text-white font-semibold">No app to download. No POS changes. No hardware.</strong> Live in less than a week.
            </p>
          </header>

          <p id="pick" className="mt-2 mb-4 font-semibold text-[1.05rem] text-white">Which describes you?</p>
          <div role="group" aria-labelledby="pick" className="grid grid-cols-1 md:grid-cols-2 gap-5 pb-14">
            <Door
              href="/golf"
              art={<GolfArt />}
              title="Golf courses"
              line="Every delivery is a paid order. Zero dead passes."
              desc="Golfers scan, order, and pay from their phone and your staff delivers to their GPS location. Your clubhouse kitchen becomes another on-course sales channel. 16 extra orders a month covers the $179 fee."
              chip="$179/mo founding rate. Launch fee waived. 5 spots."
              cta="See Koop for golf"
            />
            <Door
              href="/bowling"
              art={<BowlingArt />}
              title="Bowling centers"
              line="The second round stops walking out the door."
              desc="Bowlers order and pay without leaving their lane. Koop adds a sales channel beside your snack bar and servers."
              chip="5 founding spots. Launch fee waived."
              cta="See Koop for bowling"
            />
          </div>
        </div>
      </div>

      <main>
        <section className="pt-[72px]">
          <div className="w-full max-w-[1120px] mx-auto px-6">
            <h3 className={`${condensed} font-bold uppercase leading-[1.05] text-[clamp(2rem,5vw,2.8rem)] mb-2`}>Why guests order more</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2 mb-14">
              {reasons.map((r) => (
                <div key={r.h} className="border-t-[3px] border-[#E50000] pt-3.5">
                  <h4 className="m-0 mb-1.5 text-[1.15rem] font-semibold">{r.h}</h4>
                  <p className="m-0 text-[#55637a] text-[0.97rem] leading-relaxed">{r.p}</p>
                </div>
              ))}
            </div>

            <h3 className={`${condensed} font-bold uppercase leading-[1.05] text-[clamp(2rem,5vw,2.8rem)] mb-2`}>How an order happens</h3>
            <p className="mb-8 max-w-[560px] text-[#55637a]">
              Your kitchen, your bar, and your POS stay exactly as they are. Only taking the order and the payment change.
            </p>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-5 list-none m-0 p-0">
              {steps.map((s, i) => (
                <li key={s.h} className="border-t-[3px] border-[#E50000] pt-4">
                  <span className="inline-flex items-center justify-center w-[30px] h-[30px] rounded-md bg-[#E50000] text-white font-semibold text-[0.9rem] mb-2.5">{i + 1}</span>
                  <h4 className="m-0 mb-1 text-[1.15rem] font-semibold">{s.h}</h4>
                  <p className="m-0 text-[#55637a] text-[0.97rem] leading-relaxed">{s.p}</p>
                </li>
              ))}
            </ol>

            <ul className="mt-14 py-[22px] border-y border-[#d8dce3] flex flex-wrap gap-x-10 gap-y-3.5 list-none font-semibold text-[0.98rem] m-0 p-0 [&>li]:flex [&>li]:items-center [&>li]:gap-2.5 [&>li]:before:content-[''] [&>li]:before:block [&>li]:before:w-[9px] [&>li]:before:h-[9px] [&>li]:before:bg-[#E50000]">
              {promises.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        </section>

        <div className="mt-[72px] bg-[#213147] text-white border-t-[5px] border-[#E50000]">
          <div className="w-full max-w-[1120px] mx-auto px-6 py-11 flex flex-wrap gap-7 items-center justify-between">
            <div>
              <h3 className={`${condensed} font-bold uppercase leading-[1.05] text-[clamp(2rem,5vw,2.8rem)] text-white mb-1.5`}>See it in 15 minutes.</h3>
              <p className="m-0 text-[#c9d2e0]">I set up each venue personally. Text GOLF or BOWLING and I will send times for a demo.</p>
            </div>
            <div className="border-l-4 border-[#E50000] pl-5">
              <b className="block text-[1.3rem] font-semibold">Peter Mosher</b>
              <a className="block text-[1.05rem] hover:underline" href="sms:+12488367515?&body=GOLF">Text GOLF to (248) 836 7515</a>
              <a className="block text-[1.05rem] hover:underline" href="sms:+12488367515?&body=BOWLING">Text BOWLING to (248) 836 7515</a>
              <a className="block text-[1.05rem] hover:underline" href="mailto:hello@kooporder.com">hello@kooporder.com</a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
