import type { Metadata } from 'next';
import {
  BulletCard, ContactBand, HeroText, OfferCard, PageHero, PricingTable, Red, RoleBlock, Section, h3Class,
  type PricingRow,
} from '@/components/marketing-page';

const TITLE = 'Koop Golf | Mobile ordering for the beverage cart and clubhouse';
const DESCRIPTION =
  'Golfers order from the course and your staff delivers to their GPS location. 5 founding spots, launch fee waived. Live in less than a week.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://kooporder.com/golf' },
  openGraph: { type: 'website', title: TITLE, description: DESCRIPTION, url: 'https://kooporder.com/golf' },
};

const SMS = 'sms:+12488367515?&body=FOUNDER5';

const diffCards = [
  { h: 'The app sells consistently', li: ['Same patron experience every round', 'Menu, add-on prompts, and payment on every order', 'The gap between your best shift and your worst narrows, set by the app, not the person'] },
  { h: 'Orders come to the golfer', li: ['Served on demand, not when the cart happens to pass', 'Every trip is a confirmed sale, with zero dead passes', "Your kitchen now sells to golfers on the course, a revenue stream the cart alone can't reach"] },
  { h: 'No POS integration', li: ['No changes to your existing POS', 'Zero IT risk, no new hardware', 'Menus, training, and marketing materials included', 'Live in less than a week'] },
  { h: 'Steady through turnover', li: ['Service quality stable regardless of who is hired', 'Revenue stays stable', 'Koop does not quit mid-season'] },
];

const pricing: PricingRow[] = [
  { h: 'Launch fee', p: 'Menu creation, on-site marketing materials (cart stickers, yard signs, posters), and staff training.', was: '$399', v: '$0', l: 'founding member rate, one-time' },
  { h: 'Monthly membership fee', p: 'Beverage cart and clubhouse service modes. Cancel anytime.', was: '$289', v: '$179', unit: '/mo', l: 'founding rate, locked in for 2 years' },
  { h: 'Transaction fee', p: 'Paid by the patron. No per-order fees paid by the venue.', v: '$0.99', l: 'per order, paid by the patron' },
  { h: 'Card processing', p: 'Standard card processing, paid by the venue. Koop adds nothing on top.', v: 'Standard rates', l: 'no markup from Koop' },
];

const shotClass =
  'block w-[240px] min-[481px]:w-[220px] h-auto border-8 border-[#213147] rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] bg-white';

export default function GolfPage() {
  return (
    <div className="font-headline bg-[#F0F0F0] text-[#213147] overflow-x-hidden">
      <PageHero
        offer={
          <OfferCard
            heading="5 founding spots"
            price="$179"
            priceNote="/mo, locked in for 2 years"
            bullets={['Launch fee waived ($399 value)', 'Menus, marketing materials, and staff training included', 'Cancel anytime']}
            cta="Text Peter for a 15-minute demo"
            sms={SMS}
            code="FOUNDER5"
            why="I set up each course personally, so I can only take five."
          />
        }
      >
        <HeroText
          h1="What's the gap between your best beverage cart shift and your worst?"
          highlight="Koop closes it."
          tag="The app sells. Your staff delivers. Consistent every time."
          sub={
            <>
              Right now, your on-course sales depend on who&apos;s working that shift. With Koop, the app does the selling and the upselling, so they don&apos;t.{' '}
              <strong className="text-white font-semibold">Live in less than a week. No POS changes. No new hardware.</strong>
            </>
          }
        />
      </PageHero>

      <main>
        <Section>
          <h3 className={h3Class}>Orders come to the <Red>golfer.</Red></h3>
          <p className="mb-8 max-w-[640px] text-[#55637a]">
            Your beverage cart stops hoping to pass the right group. Golfers order when they&apos;re thirsty, and your staff delivers to their GPS location. Every trip is a paid sale. Two menus, one app: drinks and snacks from the cart, hot food from the clubhouse kitchen, all delivered on the course.
          </p>
          <div className="grid grid-cols-1 min-[861px]:grid-cols-2 gap-9 items-start">
            <RoleBlock
              label="GOLFER"
              labelClass="bg-[#213147]"
              steps={[
                { h: 'Scan', p: 'No app download.' },
                { h: 'Order', p: 'Beer and snacks from the cart. Burgers and hot food from the clubhouse.' },
                { h: 'Pay', p: 'Secure card payment.' },
              ]}
            >
              <img src="/marketing/golf-golfer-order.webp" width={700} height={1274} loading="lazy" className={shotClass} alt="Golfer ordering screen: beverage cart menu with featured drinks and an Add button" />
            </RoleBlock>
            <RoleBlock
              label="STAFF"
              labelClass="bg-[#E50000]"
              steps={[
                { h: 'Get the order', p: 'Instant notification.' },
                { h: 'See the golfer', p: 'Live GPS location on the map. Order queuing possible.' },
                { h: 'Deliver', p: 'Beverage cart and clubhouse modes: drinks, snacks, prepared food.' },
              ]}
            >
              <img src="/marketing/golf-staff-map.webp" width={700} height={1274} loading="lazy" className={shotClass} alt="Staff screen: live course map with a golfer location and the active order to deliver" />
            </RoleBlock>
          </div>
        </Section>

        <Section>
          <h3 className={h3Class}>The Koop difference: <Red>every shift.</Red></h3>
          <p className="mb-8 max-w-[640px] text-[#55637a]">Four reasons the numbers hold up whoever is working.</p>
          <div className="grid grid-cols-1 min-[761px]:grid-cols-2 gap-5">
            {diffCards.map((c, i) => <BulletCard key={c.h} n={i + 1} title={c.h} items={c.li} />)}
          </div>
        </Section>

        <Section>
          <h3 className={h3Class}>The math</h3>
          <div className="mt-4 max-w-[780px] bg-white text-[#213147] border-2 border-[#E50000] rounded-[10px] p-[26px]">
            <p className="m-0 mb-2 font-extrabold text-[clamp(1.4rem,3.6vw,2rem)] leading-tight">Koop pays for itself at 16 extra orders a month.</p>
            <p className="m-0 mb-2 text-[#55637a]">At a $15 average order and 75% gross margin, that&apos;s about one extra order every other day.</p>
            <p className="mt-2.5 mb-0 text-[0.82rem] text-[#55637a]">Based on a $15 average order and 75% gross margin. Your numbers may vary.</p>
          </div>
        </Section>

        <Section id="pricing">
          <h3 className={h3Class}>Pricing: <Red>founding member rates.</Red></h3>
          <p className="mb-8 max-w-[640px] text-[#55637a]">Only 5 founding member spots, first come, first served. Spots close December 31, 2026.</p>
          <PricingTable rows={pricing} />
        </Section>

        <ContactBand
          heading="Become a Koop Golf founding member."
          text="Text Peter for a 15-minute demo. Mention FOUNDER5."
          cta="Text FOUNDER5"
          sms={SMS}
          otherLabel="Run a bowling center?"
          otherHref="/bowling"
          otherText="See Koop for bowling"
        />
      </main>
    </div>
  );
}
