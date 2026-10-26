// The printable sheet for one Sales CRM lead: the key data, funnel position, every logged contact, and blank lines
// for notes by hand. buildLeadSheet turns a lead into plain rows (testable); renderLeadSheetPdf lays them out.

import { format, parseISO } from 'date-fns';
import type { Lead, LeadContact } from '@/lib/types';
import { daysSince, firstYearValue } from '@/lib/crm';

export interface SheetRow { label: string; value: string }
export interface SheetSection { heading: string; rows: SheetRow[] }
export interface LeadSheetModel {
  title: string;
  subtitle: string;
  printedOn: string;
  sections: SheetSection[];
  log: { date: string; type: string; notes: string }[];
}

// Whole dollars show without cents ($179); anything else shows both ($6.50).
const money = (n: number | null | undefined): string =>
  n == null ? '' : `$${n.toLocaleString('en-US', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const count = (n: number | null | undefined): string => (n == null ? '' : String(n));
const yesNo = (v: boolean | undefined): string => (v ? 'Yes' : 'No');
const longDate = (key: string): string => { try { return format(parseISO(key), 'EEE, MMM d, yyyy'); } catch { return key; } };

export function buildLeadSheet(lead: Lead, contacts: LeadContact[], today: string): LeadSheetModel {
  const golf = lead.marketFitData?.golf;
  const bowling = lead.marketFitData?.bowling;
  const cityLine = [lead.city, [lead.state, lead.zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const value = firstYearValue(lead);
  const since = daysSince(lead.lastContactDate, today);

  const sections: SheetSection[] = [
    {
      heading: 'Venue',
      rows: [
        { label: 'Venue Type', value: lead.venueType },
        { label: 'Venue Name', value: lead.venueName },
        { label: 'Street Address', value: lead.streetAddress || '' },
        { label: 'City, State Zip', value: cityLine },
        { label: 'County', value: lead.county || '' },
        { label: 'POS System', value: lead.posSystem || '' },
      ],
    },
    {
      heading: 'Contact',
      rows: [
        { label: 'Contact Name', value: lead.contactName || '' },
        { label: 'Phone', value: lead.phone || '' },
        { label: 'Email', value: lead.email || '' },
      ],
    },
    lead.venueType === 'Golf Course'
      ? {
          heading: 'Golf Details',
          rows: [
            { label: 'Number of Holes', value: count(golf?.holes) },
            { label: 'Rack Rate, Peak Season', value: money(golf?.rackRatePeak) },
            { label: 'Rounds per Year', value: golf?.roundsAnnually == null ? '' : golf.roundsAnnually.toLocaleString('en-US') },
            { label: 'Has a Beverage Cart', value: yesNo(golf?.hasBevCart) },
            { label: 'Has a Clubhouse Kitchen', value: yesNo(golf?.hasClubhouseKitchen) },
            { label: 'Carts on Course (not outings)', value: count(golf?.bevCartCount) },
            { label: 'Cart Operators', value: count(golf?.bevCartOperators) },
            { label: 'Bev Cart $ per Round', value: money(golf?.bevCartRevenuePerRound) },
          ],
        }
      : { heading: 'Bowling Details', rows: [{ label: 'Number of Lanes', value: count(bowling?.lanesCount) }] },
    {
      heading: 'Sales Funnel',
      rows: [
        { label: 'Funnel Stage', value: lead.stage },
        { label: 'Launch Fee Quoted', value: money(lead.launchFeeQuoted) },
        { label: 'Monthly Fee Quoted', value: money(lead.monthlyFeeQuoted) },
        { label: 'Quoted First-Year Value', value: value === null ? '' : money(value) },
        {
          label: 'Last Contact',
          value: lead.lastContactDate ? `${longDate(lead.lastContactDate)}${since === null ? '' : since === 0 ? ' (today)' : ` (${since} day${since === 1 ? '' : 's'} ago)`}` : '',
        },
        { label: 'Contacts Logged', value: String(contacts.length) },
      ],
    },
  ];

  const log = [...contacts]
    .sort((a, b) => (a.date === b.date ? (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0) : a.date < b.date ? 1 : -1))
    .map((c) => ({ date: longDate(c.date), type: c.type, notes: c.notes }));

  return {
    title: lead.venueName,
    subtitle: `${lead.venueType}${cityLine ? ` · ${cityLine}` : ''}`,
    printedOn: longDate(today),
    sections,
    log,
  };
}

// The PDF's built-in fonts only know Western characters. Swap common typographic marks for plain ones and replace
// anything else (emoji, other alphabets) with a question mark rather than letting it print as garbage.
export function pdfText(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201E\u2033]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[\u00A0\u2007\u202F]/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '?') // an emoji is two code units but one character
    .replace(/[^\n\t\x20-\x7E\u00A1-\u00FF]/g, '?');
}

export function leadSheetFileName(lead: Pick<Lead, 'venueName'>, today: string): string {
  const slug = (lead.venueName || 'Lead').replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'Lead';
  return `Koop_Lead_Sheet_${slug}_${today}.pdf`;
}

// ---- layout (Letter, portrait) ----
const NAVY: [number, number, number] = [33, 49, 71];
const RED: [number, number, number] = [229, 0, 0];
const GREY: [number, number, number] = [100, 116, 139];
const RULE: [number, number, number] = [203, 213, 225];

export async function renderLeadSheetPdf(model: LeadSheetModel): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
  const W = 8.5, H = 11, M = 0.6, FOOT = 0.55, CW = W - 2 * M;
  let y = 0;

  const header = (first: boolean) => {
    pdf.setFillColor(...NAVY); pdf.rect(0, 0, W, first ? 1.15 : 0.5, 'F');
    pdf.setFillColor(...RED); pdf.rect(0, first ? 1.15 : 0.5, W, 0.05, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(first ? 8.5 : 8); pdf.text('KOOP  |  SALES LEAD SHEET', M, first ? 0.36 : 0.31, { charSpace: 0.02 });
    if (first) {
      pdf.setFontSize(20); pdf.text(pdfText(model.title).toUpperCase().slice(0, 48), M, 0.72);
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(201, 210, 224); pdf.text(pdfText(model.subtitle), M, 0.98);
    } else {
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.text(pdfText(model.title).slice(0, 60), W - M, 0.31, { align: 'right' });
    }
    y = (first ? 1.15 : 0.5) + 0.35;
  };
  const room = (need: number) => {
    if (y + need > H - FOOT) { pdf.addPage(); header(false); }
  };
  const heading = (text: string) => {
    room(0.7);
    pdf.setFillColor(...RED); pdf.rect(M, y, 0.28, 0.035, 'F');
    pdf.setTextColor(...NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5);
    pdf.text(text.toUpperCase(), M, y + 0.2, { charSpace: 0.02 });
    y += 0.36;
  };

  header(true);

  // Key data: label over value, two columns. Empty values get a line to write on.
  for (const section of model.sections) {
    heading(section.heading);
    const colW = (CW - 0.3) / 2;
    for (let i = 0; i < section.rows.length; i += 2) {
      const pair = section.rows.slice(i, i + 2);
      const wrapped = pair.map((r) => pdf.splitTextToSize(pdfText(r.value), colW - 0.05) as string[]);
      const lines = Math.max(1, ...wrapped.map((w) => (w[0] === '' ? 1 : w.length)));
      const rowH = 0.2 + 0.19 * lines + 0.12;
      room(rowH);
      pair.forEach((r, c) => {
        const x = M + c * (colW + 0.3);
        pdf.setTextColor(...GREY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.text(r.label.toUpperCase(), x, y + 0.1, { charSpace: 0.015 });
        if (r.value.trim() === '') {
          pdf.setDrawColor(...RULE); pdf.setLineWidth(0.01); pdf.line(x, y + 0.36, x + colW, y + 0.36);
        } else {
          pdf.setTextColor(...NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10.5);
          pdf.text(wrapped[c], x, y + 0.3);
          pdf.setDrawColor(...RULE); pdf.setLineWidth(0.005); pdf.line(x, y + 0.2 + 0.19 * lines + 0.04, x + colW, y + 0.2 + 0.19 * lines + 0.04);
        }
      });
      y += rowH;
    }
    y += 0.1;
  }

  // Contact log, newest first.
  heading(`Contact Log (${model.log.length})`);
  if (model.log.length === 0) {
    pdf.setTextColor(...GREY); pdf.setFont('helvetica', 'italic'); pdf.setFontSize(9.5);
    pdf.text('No contacts logged yet.', M, y + 0.12); y += 0.35;
  }
  for (const entry of model.log) {
    const lines = pdf.splitTextToSize(pdfText(entry.notes), CW - 0.2) as string[];
    let i = 0;
    // An entry can run across a page: its date line repeats at the top of the next one.
    while (i < lines.length || i === 0) {
      room(0.55);
      pdf.setTextColor(...NAVY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5);
      pdf.text(`${pdfText(entry.date)}  -  ${entry.type}${i > 0 ? '  (continued)' : ''}`, M, y + 0.14);
      y += 0.26;
      pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9.5); pdf.setTextColor(51, 65, 85);
      while (i < lines.length && y + 0.17 <= H - FOOT) { pdf.text(lines[i], M + 0.2, y + 0.12); y += 0.175; i += 1; }
      if (i >= lines.length) break;
    }
    y += 0.12;
    pdf.setDrawColor(...RULE); pdf.setLineWidth(0.005); pdf.line(M, y - 0.04, W - M, y - 0.04);
    y += 0.1;
  }

  // Blank space for the next meeting, written by hand.
  heading('New Meeting Notes');
  pdf.setTextColor(...GREY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7);
  pdf.text('DATE', M, y + 0.1); pdf.text('WHO I MET WITH', M + 2.2, y + 0.1);
  pdf.setDrawColor(...RULE); pdf.setLineWidth(0.01);
  pdf.line(M, y + 0.36, M + 1.9, y + 0.36); pdf.line(M + 2.2, y + 0.36, W - M, y + 0.36);
  y += 0.42;
  const pageLines = Math.max(0, Math.floor((H - FOOT - y - 0.9) / 0.3));
  for (let n = 0; n < Math.min(pageLines, 9); n++) { pdf.line(M, y + 0.28, W - M, y + 0.28); y += 0.3; }
  room(0.6);
  pdf.setTextColor(...GREY); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(7); pdf.text('NEXT STEP / FOLLOW-UP DATE', M, y + 0.14);
  pdf.line(M, y + 0.42, W - M, y + 0.42);

  // Footer on every page
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(...RULE); pdf.setLineWidth(0.005); pdf.line(M, H - 0.45, W - M, H - 0.45);
    pdf.setTextColor(...GREY); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5);
    pdf.text(`Printed ${pdfText(model.printedOn)}  |  Confidential - Koop sales`, M, H - 0.3);
    pdf.text(`Page ${p} of ${pages}`, W - M, H - 0.3, { align: 'right' });
  }
  return pdf.output('blob');
}
