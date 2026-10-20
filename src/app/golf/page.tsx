import type { Metadata } from 'next';
import {
  BulletCard, ContactBand, EasyToAdd, FoundingOffer, HeroText, OfferCard, PageHero, PromiseBar, Red, RoleBlock, Section, condensed, h3Class,
} from '@/components/marketing-page';

const TITLE = 'Koop Golf | Mobile ordering for the beverage cart and clubhouse';
const DESCRIPTION =
  'Keep the amenity. Remove the variability. The app sells, your staff delivers to the golfer\'s GPS location. Founding member rate of $179/month with the launch fee waived, offer good until February 28, 2027. Live in less than a week.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: 'https://kooporder.com/golf' },
  openGraph: { type: 'website', title: TITLE, description: DESCRIPTION, url: 'https://kooporder.com/golf' },
};

const SMS = 'sms:+12488367515?&body=FOUNDER5';

const diffCards = [
  {
    h: 'Consistent selling',
    li: [
      'Same menu, ordering and upselling experience every shift.',
      "Your best operator shouldn't have to be working for you to have a great sales day.",
      'Koop handles the selling and payment. Your staff focuses on delivery.',
    ],
  },
  {
    h: 'Orders come to the golfer',
    li: ["Served on demand—not on a fixed loop. Golfers order when they're thirsty.", 'Every stop is for a golfer who already wants something.'],
  },
  {
    h: 'Your kitchen sells on course',
    li: ["Turn your clubhouse kitchen into another on-course sales channel—including when the beverage cart isn't on shift."],
  },
  {
    h: 'Staff go straight to the golfer',
    li: [
      'Instant notification when an order comes in.',
      "The golfer's live GPS location shows on a map.",
      'Staff go straight to the golfer instead of searching the course.',
    ],
  },
];

const easyToAdd = [
  { h: 'No POS integration', p: 'No changes to your existing POS.' },
  { h: 'Works on any phone or tablet', p: 'No integration, no setup headaches.' },
  { h: 'Live in less than a week', p: 'Menus, training and marketing materials included.' },
  { h: 'Cancel anytime', p: "Your rate is locked. You're not." },
];

const promises = ['Live in less than a week', 'No POS changes', 'Any phone or tablet', 'Cancel anytime'];

const shotClass =
  'block w-[240px] min-[481px]:w-[220px] h-auto border-8 border-[#213147] rounded-[28px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] bg-white';

export default function GolfPage() {
  return (
    <div className="font-headline bg-[#F0F0F0] text-[#213147] overflow-x-hidden">
      <PageHero
        offer={
          <OfferCard
            heading="Founding member offer"
            price="$179"
            priceNote="/mo, locked in for 2 years"
            bullets={['Launch fee waived ($399 value)', 'No per-order fees for your venue', 'Menus, marketing materials, and staff training included', 'Cancel anytime']}
            cta="Text Peter for a 20-minute demo"
            sms={SMS}
            note="Offer good until February 28, 2027."
            why="I set up each course personally."
          />
        }
      >
        <HeroText
          h1="Keep the amenity. Remove the variability."
          highlight="The app sells. Your staff delivers."
          tag="Instead of driving a fixed loop, your cart goes where the orders are."
          banner
          sub={
            <>
              <p>
                Your beverage cart is an important part of the golfer experience. But sales and service can vary dramatically depending on who is operating the beverage cart.
              </p>
              <p>
                <strong className="text-white font-semibold">Koop makes the selling process consistent</strong> - so every golfer gets the same menu, ordering, upselling, and payment experience, every shift.
              </p>
            </>
          }
        />
      </PageHero>

      <main>
        <Section>
          <h3 className={h3Class}>The app sells. <Red>Your staff delivers.</Red></h3>
          <p className="mb-8 max-w-[640px] text-[#55637a]">
            Golfers scan, order, and pay from their phone. Your staff receives the order and delivers it to the golfer&apos;s GPS location.
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
                { h: 'See the golfer', p: 'Live GPS location on the map; order queuing possible.' },
                { h: 'Deliver', p: 'Beverage cart and clubhouse modes: drinks, snacks, prepared food.' },
              ]}
            >
              <img src="/marketing/golf-staff-map.webp" width={700} height={1274} loading="lazy" className={shotClass} alt="Staff screen: live course map with a golfer location and the active order to deliver" />
            </RoleBlock>
          </div>
        </Section>

        <Section>
          <PromiseBar heading="The app does the selling. Your staff does the delivering." items={promises} />
        </Section>

        <Section>
          <h3 className={`${h3Class} mb-6`}>The Koop difference <Red>— every shift.</Red></h3>
          <div className="grid grid-cols-1 min-[761px]:grid-cols-2 gap-5">
            {diffCards.map((c, i) => <BulletCard key={c.h} n={i + 1} title={c.h} items={c.li} />)}
          </div>
        </Section>

        <Section>
          <h3 className={`${h3Class} mb-6`}>Easy to add</h3>
          <EasyToAdd items={easyToAdd} />
        </Section>

        <Section>
          <div className="max-w-[780px] bg-white text-[#213147] border-2 border-[#E50000] rounded-[10px] p-[26px]">
            <p className={`${condensed} m-0 mb-1 font-bold uppercase text-[1.5rem] leading-tight`}>The economics are simple</p>
            <p className="m-0 mb-2 font-extrabold uppercase text-[clamp(1.1rem,3vw,1.5rem)] leading-tight"><Red>16 extra orders a month</Red> covers the $179 monthly fee.</p>
            <p className="m-0 mb-1 text-[#213147]">$15 average order × 75% gross margin = $11.25 contribution per order. 16 orders ≈ $180.</p>
            <p className="mt-2.5 mb-0 text-[0.82rem] italic text-[#55637a]">Based on a $15 average order and 75% gross margin. Your numbers may vary.</p>
          </div>
        </Section>

        <Section id="pricing">
          <h3 className={`${h3Class} mb-8`}>Founding member <Red>offer</Red></h3>
          <FoundingOffer
            price="$179"
            unit="/month"
            until="Offer good until February 28, 2027"
            bullets={['$0 launch fee', 'Rate locked for 2 years', 'No per-order fees for your venue']}
            after="After February 28, 2027: $289/month + $399 launch fee"
          />
          <p className="mt-4 mb-0 max-w-[880px] text-[0.82rem] text-[#55637a]">
            Standard card processing is paid by the venue, with no markup from Koop. The per-order convenience fee ($0.99) is paid by the patron.
          </p>
        </Section>

        <ContactBand
          heading="Become a Koop founding member."
          text="Call or text Peter for a 20-minute demo."
          cta="Text Peter"
          sms={SMS}
          otherLabel="Run a bowling center? Bowling is coming soon."
          otherHref="sms:+12488367515?&body=BOWLING"
          otherText="Text Peter about bowling"
        />
      </main>
    </div>
  );
}
