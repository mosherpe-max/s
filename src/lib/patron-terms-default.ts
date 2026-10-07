// The Patron Terms & Conditions as structured content, plus the built-in default.
//
// The text patrons see is plain data (headings, paragraphs, bullet lists) rather
// than HTML, so a Koop Admin can publish a new document without any risk of
// injecting markup into the checkout. The published copy lives in Firestore at
// solution/patronTerms; this built-in default (the signed-off 2026-10-07 text) is
// used until one is published, and if the published copy can't be loaded.

export interface TermsRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type TermsBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; runs: TermsRun[] }
  | { type: 'list'; items: { runs: TermsRun[] }[] };

export interface PatronTermsDocument {
  /** Changes whenever new text is published; patrons are asked to agree again. */
  version: string;
  title: string;
  blocks: TermsBlock[];
  /** Where this text came from: the uploaded file name, or null for the built-in default. */
  fileName?: string | null;
}

export const DEFAULT_TERMS_VERSION = '2026-10-07';

export const DEFAULT_PATRON_TERMS: PatronTermsDocument = {
  version: DEFAULT_TERMS_VERSION,
  title: 'Koop Patron Terms & Conditions',
  fileName: null,
  blocks: [
  { type: 'heading', level: 1, text: "Koop Patron Terms & Conditions" },
  { type: 'paragraph', runs: [{ text: "By tapping \"Place Order\" you agree to these Terms. Koop is the mobile ordering software you use to buy food and beverages from the venue you are ordering from (the \"Venue\"); the Venue, not Koop, prepares and delivers your order." }] },
  { type: 'heading', level: 2, text: "1. Acceptance of These Terms" },
  { type: 'paragraph', runs: [{ text: "By placing an order through Koop you confirm that you have read and agree to these Terms and Conditions (the \"Terms\"). If you do not agree, do not place an order. You must be at least 18 years old, or have the permission of a parent or guardian, to place an order." }] },
  { type: 'heading', level: 2, text: "2. Who Provides What" },
  { type: 'paragraph', runs: [{ text: "Koop provides the software that lets you browse the Venue's menu, place an order, and pay. The Venue is the seller of all food and beverages and is solely responsible for preparing, serving, and delivering or handing off your order, and for the quality, safety, pricing, and availability of its products. Koop does not prepare, handle, or deliver food or beverages and is not an agent or employee of the Venue." }] },
  { type: 'heading', level: 2, text: "3. Ordering, Delivery, and Pickup" },
  { type: 'list', items: [
    { runs: [{ text: "Delivery on the course or lane.", bold: true }, { text: " Where the Venue offers delivery, you are responsible for giving an accurate location (for example, your position on the course, your lane, or your pickup point) and for keeping your phone available. Locations on a golf course change as you play, so delivery times are estimates, not guarantees." }] },
    { runs: [{ text: "Venue discretion.", bold: true }, { text: " The Venue may decline, delay, modify, or cancel an order for reasons such as item unavailability, staffing, weather, course or facility closures, or an inability to locate you." }] },
    { runs: [{ text: "Pickup orders.", bold: true }, { text: " Take-out orders must be collected from the Venue at the time communicated to you. The Venue may discard uncollected orders." }] },
    { runs: [{ text: "No guarantee of timing.", bold: true }, { text: " Koop does not guarantee order accuracy, preparation time, or delivery time. These are controlled by the Venue." }] },
  ] },
  { type: 'heading', level: 2, text: "4. Pricing and Payment" },
  { type: 'paragraph', runs: [{ text: "Prices, taxes, and any gratuity shown at checkout are set by the Venue. Your payment is processed by a third-party payment processor, which sends the proceeds to the Venue. Koop does not store your full card number. By submitting payment you authorize the total amount shown at checkout, including the Convenience Fee described below, and you confirm that you are authorized to use the payment method." }] },
  { type: 'heading', level: 2, text: "5. Convenience Fee" },
  { type: 'paragraph', runs: [{ text: "A Convenience Fee, shown separately at checkout, is charged on each order for the use of Koop's ordering service. The Convenience Fee is " }, { text: "non-refundable", bold: true }, { text: " in all circumstances, including when the Venue cancels, changes, or refunds all or part of your order, because the service has already been provided by placing the order." }] },
  { type: 'heading', level: 2, text: "6. Refunds and Order Problems" },
  { type: 'paragraph', runs: [{ text: "All refunds, credits, and order issues (missing, incorrect, late, or unsatisfactory items) are handled by the Venue, not Koop. If you need a refund, contact the Venue directly, preferably while you are still on site, with your order number. Refunds are issued at the Venue's sole discretion and returned to your original payment method; they may take several business days to appear. Koop cannot issue refunds of the food and beverage portion of your order, and the Convenience Fee remains non-refundable (Section 5)." }] },
  { type: 'heading', level: 2, text: "7. Alcohol" },
  { type: 'paragraph', runs: [{ text: "Alcohol is sold and served by the Venue under its own license. You must be at least 21 years old and show valid government-issued photo ID to receive alcohol. The Venue may refuse or cancel any alcohol order, with no refund of the Convenience Fee, if you cannot show valid ID, appear intoxicated, or if service would violate the law or Venue policy. Alcohol may not be passed to anyone under 21. Please drink responsibly." }] },
  { type: 'heading', level: 2, text: "8. Allergens and Dietary Needs" },
  { type: 'paragraph', runs: [{ text: "Menu descriptions are provided by the Venue. Koop does not verify ingredients, allergen information, or preparation practices. If you have a food allergy or dietary restriction, tell the Venue staff directly before eating. Food prepared at the Venue may come into contact with common allergens." }] },
  { type: 'heading', level: 2, text: "9. Your Responsibilities" },
  { type: 'list', items: [
    { runs: [{ text: "Provide accurate contact, location, and payment information." }] },
    { runs: [{ text: "Be present and reachable at your location or pickup point." }] },
    { runs: [{ text: "Follow the Venue's rules, including those about outside food and drink, and treat Venue staff with respect." }] },
    { runs: [{ text: "Stay safe. On a golf course, do not stop play or enter an unsafe area to receive an order. Venue staff may refuse delivery in unsafe conditions, including lightning or severe weather." }] },
    { runs: [{ text: "Do not misuse Koop, interfere with its operation, or place fraudulent orders. Koop and the Venue may block access for misuse." }] },
  ] },
  { type: 'heading', level: 2, text: "10. Your Information" },
  { type: 'paragraph', runs: [{ text: "When you place an order, Koop collects information such as your name, phone number, order details, delivery location, and device and usage data. Your information is available to both Koop and the Venue you are purchasing from, and is used to take, fulfill, and support your order, prevent fraud, and improve the service. " }, { text: "Koop does not sell your personal information.", bold: true }, { text: " Payment card data is handled by our payment processor, not stored by Koop. We share information with service providers that help us run Koop (for example, payment processing, hosting, and text messaging), and with others when required by law. Reasonable security measures are used, but no system is completely secure. To ask about your data, contact Koop at the address in Section 14." }] },
  { type: 'heading', level: 2, text: "11. Text Messages" },
  { type: 'paragraph', runs: [{ text: "By providing your mobile number you agree that Koop and the Venue may send you text messages about your order, such as confirmation and delivery updates. Message and data rates may apply. These are transactional messages only." }] },
  { type: 'heading', level: 2, text: "12. Limitation of Liability" },
  { type: 'paragraph', runs: [{ text: "Koop is provided \"as is\" and \"as available.\" Koop is not responsible for the Venue's food, beverages, service, delivery, or conduct, or for delays, errors, or outages beyond its reasonable control. To the fullest extent permitted by law, Koop is not liable for indirect, incidental, special, or consequential damages, and Koop's total liability for any claim relating to an order will not exceed the Convenience Fee you paid for that order. Nothing in these Terms limits liability that cannot be limited by law." }] },
  { type: 'heading', level: 2, text: "13. Governing Law and Disputes" },
  { type: 'paragraph', runs: [{ text: "These Terms are governed by the laws of the State of Michigan, without regard to conflict-of-law rules. Any dispute with Koop will be brought in the state or federal courts located in Michigan, and you consent to their jurisdiction. Disputes about food, service, or refunds should first be raised with the Venue." }] },
  { type: 'heading', level: 2, text: "14. Contact" },
  { type: 'paragraph', runs: [{ text: "For questions about these Terms or your data, contact Koop at hello@kooporder.com. For refunds and order issues, contact the Venue you ordered from." }] },
  { type: 'heading', level: 2, text: "15. Changes to These Terms" },
  { type: 'paragraph', runs: [{ text: "Koop may update these Terms from time to time. The version in effect when you place an order applies to that order. Continued use of Koop after an update means you accept the updated Terms. If any part of these Terms is found unenforceable, the rest remains in effect." }] },
  ],
};
