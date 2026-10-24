// What is wrong with the details a patron has typed at checkout, in the order the fields appear on screen, with a
// plain message for each so they know exactly what to fix.

export type CheckoutField = 'lane' | 'email' | 'name' | 'phone';

export interface CheckoutProblem {
  field: CheckoutField;
  label: string;    // how the field is named in a summary
  message: string;  // what to tell the patron
}

export const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
export const phoneDigits = (value: string): string => value.replace(/\D/g, '');

export function checkoutProblems(input: { email: string; name: string; phone: string; needsLane: boolean; lane: string }): CheckoutProblem[] {
  const out: CheckoutProblem[] = [];
  if (input.needsLane && !input.lane) {
    out.push({ field: 'lane', label: 'Lane', message: 'Pick your lane so we know where to bring your order.' });
  }
  const email = input.email.trim();
  if (!email) {
    out.push({ field: 'email', label: 'Email', message: 'Enter your email address. Your receipt is sent there.' });
  } else if (!isValidEmail(email)) {
    out.push({ field: 'email', label: 'Email', message: "That email doesn't look right. Check it for a typo, like name@example.com." });
  }
  if (input.name.trim().length < 2) {
    out.push({ field: 'name', label: 'Name', message: 'Enter your full name so staff know who to look for.' });
  }
  const digits = phoneDigits(input.phone);
  if (digits.length === 0) {
    out.push({ field: 'phone', label: 'Mobile number', message: 'Enter your mobile number so we can text you updates.' });
  } else if (digits.length < 10) {
    out.push({ field: 'phone', label: 'Mobile number', message: 'That number is too short. Enter all 10 digits, like (248) 555-0142.' });
  }
  return out;
}

// "Email and mobile number" / "Lane, email and name"
export function problemSummary(problems: CheckoutProblem[]): string {
  const labels = problems.map((p, i) => (i === 0 ? p.label : p.label.toLowerCase()));
  if (labels.length <= 1) return labels[0] || '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}
