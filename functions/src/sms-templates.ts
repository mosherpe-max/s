// The text messages patrons get about their order. The Koop admin can rewrite any of them in System settings; what
// they save is kept in solution/config under smsTemplates, and anything not rewritten uses the default below.
// Keep this file in step with src/lib/sms-templates.ts (the admin screen's copy of the defaults and checks).
//
// A message can use these fields, written in curly braces:
//   {link}   the patron's order tracking page
//   {venue}  the venue's name
//   {order}  the 4-digit ticket number
//   {amount} refund messages only: the refunded amount, like $5.00

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

// What each message must contain to be any use: the status messages carry the tracking link, a partial refund its amount.
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

export function templateUsesField(template: string, field: SmsField): boolean {
  return template.includes(`{${field}}`);
}

// The wording to send: the Koop admin's version if it is there and valid, otherwise the default.
export function pickSmsTemplate(overrides: unknown, key: SmsTemplateKey): string {
  const custom = overrides && typeof overrides === 'object' ? (overrides as Record<string, unknown>)[key] : undefined;
  return typeof custom === 'string' && validateSmsTemplate(key, custom) === null ? custom.trim() : DEFAULT_SMS_TEMPLATES[key];
}
