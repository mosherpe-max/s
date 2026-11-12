// The patron text messages, as the Koop admin sees them in System settings: the default wording, what each message is
// for, the check on what an admin types, a preview, and how many text segments a message will cost.
// The defaults and the check are copied in functions/src/sms-templates.ts, which is what sends the texts. Keep the two
// in step (a test compares them).

export const SMS_TEMPLATE_KEYS = ['preparing', 'outForDelivery', 'delivered', 'findMe', 'refundFull', 'refundPartial'] as const;
export type SmsTemplateKey = (typeof SMS_TEMPLATE_KEYS)[number];

export const SMS_FIELDS = ['link', 'venue', 'order', 'amount'] as const;
export type SmsField = (typeof SMS_FIELDS)[number];
export const SMS_MAX_LENGTH = 320;

export const DEFAULT_SMS_TEMPLATES: Record<SmsTemplateKey, string> = {
  preparing: "Order confirmed! We're getting it ready: {link}",
  outForDelivery: 'Order out for delivery! Track live: {link}',
  delivered: 'Order delivered! Enjoy your time at the venue: {link}',
  findMe: 'Hey! Your Koop order is on the way — tap to help us find you: {link}',
  refundFull: 'Koop: your order #{order} was refunded in full ({amount}). It usually takes 5 to 10 business days to show on your card.',
  refundPartial: 'Koop: {amount} of your order #{order} was refunded. It usually takes 5 to 10 business days to show on your card.',
};

export const SMS_MESSAGES: { key: SmsTemplateKey; label: string; when: string; fields: SmsField[] }[] = [
  { key: 'preparing', label: 'Order received', when: 'Staff receive the order (it moves to Preparing).', fields: ['link', 'venue', 'order'] },
  { key: 'outForDelivery', label: 'Out for delivery', when: 'Staff mark the order Out for Delivery.', fields: ['link', 'venue', 'order'] },
  { key: 'delivered', label: 'Delivered', when: 'Staff mark the order Delivered.', fields: ['link', 'venue', 'order'] },
  { key: 'findMe', label: 'Help us find you', when: 'Staff tap Refresh Patron Location.', fields: ['link', 'venue', 'order'] },
  { key: 'refundFull', label: 'Refunded in full', when: 'A card order is refunded in full.', fields: ['order', 'amount', 'venue', 'link'] },
  { key: 'refundPartial', label: 'Partly refunded', when: 'Part of a card order is refunded.', fields: ['amount', 'order', 'venue', 'link'] },
];

const REQUIRED: Partial<Record<SmsTemplateKey, SmsField>> = {
  preparing: 'link', outForDelivery: 'link', delivered: 'link', findMe: 'link', refundPartial: 'amount',
};

const FIELD_PATTERN = /\{([^{}]*)\}/g;

// null when the text is fine, otherwise what is wrong with it, in words for the person editing.
export function validateSmsTemplate(key: SmsTemplateKey, text: string): string | null {
  const t = text.trim();
  if (!t) return 'The message cannot be empty.';
  if (t.length > SMS_MAX_LENGTH) return `Keep it under ${SMS_MAX_LENGTH} characters.`;
  const used = Array.from(t.matchAll(FIELD_PATTERN)).map(m => m[1]);
  const unknown = used.find(f => !(SMS_FIELDS as readonly string[]).includes(f));
  if (unknown !== undefined) return `{${unknown}} is not a field I know. Use ${SMS_FIELDS.map(f => `{${f}}`).join(', ')}.`;
  if (/[{}]/.test(t.replace(FIELD_PATTERN, ''))) return 'A curly brace is left open. Fields look like {link}.';
  const need = REQUIRED[key];
  if (need && !used.includes(need)) return `This message needs {${need}}.`;
  return null;
}

export function renderSmsTemplate(template: string, fields: Partial<Record<SmsField, string>>): string {
  return template.replace(FIELD_PATTERN, (_, name: string) => fields[name as SmsField] ?? '');
}

// Made-up but realistically sized values, so the preview and the segment count look like a real text.
export const SMS_SAMPLE_FIELDS: Record<SmsField, string> = {
  link: 'https://kooporder.app/orders/pi_3QxAbCdEfGhIjKlM0a1b2c3d',
  venue: 'Pine Valley Golf Club',
  order: '4069',
  amount: '$16.11',
};

const GSM_BASIC = new Set(Array.from("@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"));
const GSM_EXTENDED = new Set(Array.from('^{}\\[~]|€'));

// Phones send plain text in 160-character pieces (153 when it needs more than one), but a single character outside
// the basic set, like an em dash or a curly quote, switches the whole message to 70 (67) per piece, which costs more.
export function smsSegments(text: string): { length: number; segments: number; unicode: boolean; oddCharacters: string[] } {
  const chars = Array.from(text);
  const odd = Array.from(new Set(chars.filter(c => !GSM_BASIC.has(c) && !GSM_EXTENDED.has(c))));
  const unicode = odd.length > 0;
  const length = unicode ? chars.length : chars.reduce((n, c) => n + (GSM_EXTENDED.has(c) ? 2 : 1), 0);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return { length, segments: length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / multi), unicode, oddCharacters: odd };
}
