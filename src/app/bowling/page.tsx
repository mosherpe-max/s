import type { Metadata } from 'next';
import {
  BulletCard, ContactBand, HeroText, OfferCard, PageHero, PricingTable, Red, RoleBlock, Section, h3Class,
  type PricingRow,
} from '@/components/marketing-page';
import { PaybackCalculator } from './payback-calculator';

const TITLE = 'Koop Bowling | Mobile ordering from the lane';
const DESCRIPTION =
  'Bowlers order from the lane and your servers deliver. An added sales channel beside your snack bar. 5 founding spots, launch fee waived.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://kooporder.com/bowling' },
  openGraph: { type: 'website', title: TITLE, description: DESCRIPTION, url: 'https://kooporder.com/bowling' },
};

const SMS = 'sms:+12488367515?&body=BOWLING';

const painCards = [
  { h: 'Nobody wants to leave the game', li: ['A trip to the snack bar means missed frames and a break in the fun', 'So guests put it off, or skip the order'] },
  { h: "Servers can't be at every lane", li: ['Even your best server is in one place at a time', 'A lane nobody stops at never hears an offer'] },
  { h: 'Added rounds never get ordered', li: ['More drinks, more food, a late-night snack', "Every one that walks out the door is a sale you didn't make"] },
];

const diffCards = [
  { h: 'Orders without leaving the lane', li: ['Guests order the moment they want it', 'No walk to the snack bar, no waving down a server', 'The second and third rounds get ordered'] },
  { h: 'Servers deliver, not take orders', li: ['Your people spend their time bringing orders out', 'Every order arrives already paid', 'Busy league and party nights stop piling up on one server'] },
  { h: 'An add-on, not a replacement', li: ['Your snack bar and servers keep working as they do today', 'Koop adds a sales channel beside them'] },
  { h: 'No POS integration', li: ['No changes to your existing POS', 'Zero IT risk, no new hardware', 'Menus, training, and marketing materials included', 'Live in less than a week'] },
];

const pricing: PricingRow[] = [
  { h: 'Launch fee', p: 'Menu creation, marketing materials for your lanes, and staff training.', was: '$299', v: '$0', l: 'founding member rate, one-time' },
  { h: 'Monthly membership fee', p: 'Lane ordering. Cancel anytime.', v: '$139', unit: '/mo' },
  { h: 'Transaction fee', p: 'Paid by the patron. No per-order fees paid by the venue.', v: '$0.99', l: 'per order, paid by the patron' },
  { h: 'Card processing', p: 'Standard card processing, paid by the venue. Koop adds nothing on top.', v: 'Standard rates', l: 'no markup from Koop' },
];

function Phone({ children }: { children: React.ReactNode }) {
  return (
    <div aria-hidden="true" className="w-[200px] shrink-0 bg-[#213147] rounded-[22px] p-2 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <div className="bg-white text-[#213147] rounded-2xl overflow-hidden text-[10px] leading-[1.3] min-h-[330px]">{children}</div>
    </div>
  );
}

function ScreenHeader({ left, right }: { left: string; right: string }) {
  return (
    <div className="bg-[#213147] text-white p-2.5 font-extrabold flex justify-between items-center">
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

function MenuItem({ price, name, tint }: { price: string; name: string; tint: string }) {
  return (
    <div className="border border-[#e3e6ec] rounded-lg p-1.5">
      <div className="relative h-[58px] rounded-md mb-[5px]" style={{ background: tint }}>
        <i className="absolute top-1 left-1 bg-[#213147] text-white not-italic font-semibold px-[5px] py-px rounded">{price}</i>
      </div>
      <b className="block text-[9px]">{name}</b>
      Example item
      <div className="bg-[#E50000] text-white text-center rounded p-[3px] mt-[5px] font-semibold text-[8.5px]">+ ADD</div>
    </div>
  );
}

function BowlerPhone() {
  return (
    <Phone>
      <ScreenHeader left="KOOP LANES" right="Cart" />
      <span className="inline-block bg-[#E50000] text-white rounded-full px-2 py-[3px] font-semibold text-[8.5px] mt-2 ml-2">Lane 12</span>
      <div className="px-2.5 py-1.5 text-[#55637a] text-[8.5px]">Ordering for Lane 12. Delivered to your lane.</div>
      <div className="grid grid-cols-2 gap-2 px-2.5 pt-1.5 pb-2.5">
        <MenuItem price="$14.00" name="Pitcher of draft" tint="linear-gradient(135deg, #8b1e3f, #c94a6a)" />
        <MenuItem price="$12.00" name="Boneless wings" tint="linear-gradient(135deg, #1e4fa0, #4f86d6)" />
      </div>
    </Phone>
  );
}

function StaffPhone() {
  return (
    <Phone>
      <ScreenHeader left="KOOP LANES" right="Taking orders" />
      <div className="grid grid-cols-6 gap-1 p-2.5 bg-[#e9edf3]">
        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
          <span
            key={n}
            className={`border rounded-[3px] text-center py-1.5 font-semibold text-[9px] ${n === 12 ? 'bg-[#E50000] text-white border-[#E50000]' : 'bg-white border-[#cfd6e1]'}`}
          >
            {n}
          </span>
        ))}
      </div>
      <div className="px-2.5 py-2">
        <div className="flex justify-between font-semibold py-0.5"><span>LANE 12</span><span>NEW</span></div>
        <div className="flex justify-between font-semibold py-0.5"><span>1X PITCHER OF DRAFT</span><span>$14.00</span></div>
        <div className="flex justify-between font-semibold py-0.5"><span>1X BONELESS WINGS</span><span>$12.00</span></div>
        <div className="flex justify-between border-t border-[#e3e6ec] mt-[5px] pt-[5px] font-extrabold"><span>TOTAL VALUE</span><span className="text-[#E50000]">$26.99</span></div>
      </div>
      <div className="bg-[#E50000] text-white text-center rounded-[5px] p-1.5 mx-2.5 mt-1.5 mb-2.5 font-semibold">RECEIVE</div>
    </Phone>
  );
}

export default function BowlingPage() {
  return (
    <div className="font-headline bg-[#F0F0F0] text-[#213147] overflow-x-hidden">
      <PageHero
        offer={
          <OfferCard
            heading="5 founding spots"
            price="Launch fee waived"
            priceNote=" ($299 value)"
            bullets={['Your snack bar and servers stay exactly as they are', 'Menus, marketing materials, and staff training included', 'Cancel anytime']}
            cta="Text Peter for a 15-minute demo"
            sms={SMS}
            code="BOWLING"
            why="I set up each center personally, so I can only take five."
          />
        }
      >
        <HeroText
          h1="Your bowlers shouldn't have to leave the game to buy a second round."
          highlight="Koop brings the order to the lane."
          tag="Guests order. Your servers deliver. More rounds get sold."
          sub={
            <>
              Koop adds a sales channel next to your snack bar and servers. Bowlers scan a code at the lane, order, and pay on their phone.{' '}
              <strong className="text-white font-semibold">Live in less than a week. No POS changes. No new hardware.</strong>
            </>
          }
        />
      </PageHero>

      <main>
        <Section>
          <h3 className={h3Class}>The second round <Red>walks out the door.</Red></h3>
          <p className="mb-8 max-w-[640px] text-[#55637a]">The first round gets ordered. The rounds after it are the ones that go missing, and here is why.</p>
          <div className="grid grid-cols-1 min-[861px]:grid-cols-3 gap-5">
            {painCards.map((c) => <BulletCard key={c.h} title={c.h} items={c.li} />)}
          </div>
        </Section>

        <Section>
          <h3 className={h3Class}>Koop puts the order <Red>at the lane.</Red></h3>
          <p className="mb-8 max-w-[640px] text-[#55637a]">
            Koop is an added sales channel, not a replacement for how you run today. Guests who would have skipped the next round can order it without leaving their lane, and your servers bring it out.
          </p>
          <div className="grid grid-cols-1 min-[861px]:grid-cols-2 gap-9 items-start">
            <RoleBlock
              label="BOWLER"
              labelClass="bg-[#213147]"
              steps={[
                { h: 'Scan', p: 'A code at the lane. No app download.' },
                { h: 'Order', p: 'Drinks and food, without leaving the game.' },
                { h: 'Pay', p: 'Secure card payment.' },
              ]}
            >
              <BowlerPhone />
            </RoleBlock>
            <RoleBlock
              label="STAFF"
              labelClass="bg-[#E50000]"
              steps={[
                { h: 'Get the order', p: 'Instant notification.' },
                { h: 'See the lane', p: 'The order shows exactly which lane to bring it to.' },
                { h: 'Deliver', p: "Bring it out. It's already paid." },
              ]}
            >
              <StaffPhone />
            </RoleBlock>
          </div>
        </Section>

        <Section>
          <h3 className={h3Class}>The Koop difference: <Red>every lane.</Red></h3>
          <p className="mb-8 max-w-[640px] text-[#55637a]">Four reasons it adds sales without adding work.</p>
          <div className="grid grid-cols-1 min-[761px]:grid-cols-2 gap-5">
            {diffCards.map((c, i) => <BulletCard key={c.h} n={i + 1} title={c.h} items={c.li} />)}
          </div>
        </Section>

        <Section>
          <h3 className={h3Class}>Do the math with your numbers</h3>
          <p className="mb-8 max-w-[640px] text-[#55637a]">Change these to match your center.</p>
          <PaybackCalculator />
        </Section>

        <Section id="pricing">
          <h3 className={h3Class}>Pricing</h3>
          <p className="mb-8 max-w-[640px] text-[#55637a]">Only 5 founding member spots, first come, first served. Spots close December 31, 2026.</p>
          <PricingTable rows={pricing} />
        </Section>

        <ContactBand
          heading="See Koop at your lanes."
          text="Text Peter for a 15-minute demo. Mention BOWLING. Only 5 founding spots."
          cta="Text BOWLING"
          sms={SMS}
          otherLabel="Run a golf course?"
          otherHref="/golf"
          otherText="See Koop for golf"
        />
      </main>
    </div>
  );
}
