/**
 * Dynamic print-asset generator for venue marketing materials (golf cart
 * stickers, yard signs). Renders brand-styled SVG templates parametrized by
 * venue name + a live "scan to order" QR code + the admin-configured Koop
 * logo, then rasterizes them to print-ready PDFs entirely client-side.
 */

const NAVY = '#213147';
const RED = '#E50000';
const WHITE = '#FFFFFF';
const MUTED = '#94a3b8';
const FONT = 'Arial, Helvetica, sans-serif';

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Rough auto-shrink for a bold uppercase headline so long venue names don't overflow their box. */
function fitFontSize(text: string, boxWidth: number, baseSize: number, minSize: number, avgCharWidthFactor = 0.62) {
  const estWidth = text.length * baseSize * avgCharWidthFactor;
  if (estWidth <= boxWidth) return baseSize;
  const scaled = Math.floor(boxWidth / (text.length * avgCharWidthFactor));
  return Math.max(minSize, scaled);
}

function koopLogoGroup(x: number, baselineY: number, fontSize: number, color: string, logoDataUrl?: string) {
  if (logoDataUrl) {
    const h = fontSize * 1.5;
    const w = h * 2.8;
    return { markup: `<image href="${esc(logoDataUrl)}" x="${x}" y="${baselineY - h * 0.72}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" />`, width: w };
  }
  const charW = fontSize * 0.72;
  const gap = fontSize * 0.14;
  const circleR = fontSize * 0.42;
  let cursor = x;
  const kX = cursor; cursor += charW + gap;
  const oX = cursor; cursor += charW + gap;
  const circleCx = cursor + circleR; cursor += circleR * 2 + gap;
  const pX = cursor; cursor += charW;
  const circleCy = baselineY - fontSize * 0.32;
  const markup = `
    <text x="${kX}" y="${baselineY}" font-family="${FONT}" font-weight="900" font-size="${fontSize}" fill="${color}">K</text>
    <text x="${oX}" y="${baselineY}" font-family="${FONT}" font-weight="900" font-size="${fontSize}" fill="${color}">O</text>
    <circle cx="${circleCx}" cy="${circleCy}" r="${circleR}" fill="none" stroke="${RED}" stroke-width="${fontSize * 0.1}" />
    <circle cx="${circleCx}" cy="${circleCy}" r="${circleR * 0.55}" fill="none" stroke="${RED}" stroke-width="${fontSize * 0.09}" />
    <circle cx="${circleCx}" cy="${circleCy}" r="${circleR * 0.18}" fill="${RED}" />
    <text x="${pX}" y="${baselineY}" font-family="${FONT}" font-weight="900" font-size="${fontSize}" fill="${color}">P</text>
  `;
  return { markup, width: cursor - x };
}

function iconScan(cx: number, cy: number) {
  return `
    <rect x="${cx - 9}" y="${cy - 14}" width="18" height="28" rx="4" fill="none" stroke="${WHITE}" stroke-width="2.5" />
    <line x1="${cx - 5}" y1="${cy + 8}" x2="${cx + 5}" y2="${cy + 8}" stroke="${WHITE}" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="${cx + 12}" cy="${cy - 13}" r="3.4" fill="${WHITE}" />
  `;
}

function iconCart(cx: number, cy: number) {
  return `
    <path d="M ${cx - 15} ${cy - 10} h 5 l 4 16 h 15 l 4 -13 h -21" fill="none" stroke="${WHITE}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
    <circle cx="${cx - 4}" cy="${cy + 13}" r="2.6" fill="${WHITE}" />
    <circle cx="${cx + 11}" cy="${cy + 13}" r="2.6" fill="${WHITE}" />
  `;
}

function iconCloche(cx: number, cy: number) {
  return `
    <path d="M ${cx - 15} ${cy + 6} A 15 11 0 0 1 ${cx + 15} ${cy + 6} Z" fill="none" stroke="${WHITE}" stroke-width="2.5" stroke-linejoin="round" />
    <line x1="${cx - 17}" y1="${cy + 6}" x2="${cx + 17}" y2="${cy + 6}" stroke="${WHITE}" stroke-width="2.5" stroke-linecap="round" />
    <circle cx="${cx}" cy="${cy - 10}" r="2.2" fill="${WHITE}" />
    <line x1="${cx}" y1="${cy - 8}" x2="${cx}" y2="${cy - 3}" stroke="${WHITE}" stroke-width="2.5" />
  `;
}

interface IconRow {
  cx: number;
  cy: number;
  icon: (cx: number, cy: number) => string;
  headline: string;
  sub: string;
  textX: number;
  headlineSize: number;
  subSize: number;
}

function iconRowMarkup(row: IconRow) {
  return `
    <circle cx="${row.cx}" cy="${row.cy}" r="30" fill="${RED}" />
    ${row.icon(row.cx, row.cy)}
    <text x="${row.textX}" y="${row.cy - 6}" font-family="${FONT}" font-weight="900" font-size="${row.headlineSize}" fill="${WHITE}">${esc(row.headline)}</text>
    <text x="${row.textX}" y="${row.cy + 16}" font-family="${FONT}" font-weight="700" font-size="${row.subSize}" fill="${MUTED}" letter-spacing="0.3">${esc(row.sub)}</text>
  `;
}

export interface PrintAssetInput {
  courseName: string;
  qrDataUrl: string;
  logoDataUrl?: string;
}

export interface PrintAssetTemplate {
  svg: string;
  widthPx: number;
  heightPx: number;
  widthIn: number;
  heightIn: number;
}

const DPI = 300;

/** 8" x 4" golf cart / dash sticker. */
export function buildCartStickerSvg({ courseName, qrDataUrl, logoDataUrl }: PrintAssetInput): PrintAssetTemplate {
  const widthIn = 8;
  const heightIn = 4;
  const name = courseName.toUpperCase();
  const nameSize = fitFontSize(name, 360, 46, 22);

  const rows: IconRow[] = [
    { cx: 470, cy: 70, icon: iconScan, headline: 'SCAN', sub: 'WITH PHONE', textX: 508, headlineSize: 18, subSize: 11 },
    { cx: 470, cy: 150, icon: iconCart, headline: 'ORDER', sub: 'FOOD & DRINKS', textX: 508, headlineSize: 18, subSize: 11 },
    { cx: 470, cy: 230, icon: iconCloche, headline: 'DELIVER', sub: 'TO YOU', textX: 508, headlineSize: 18, subSize: 11 },
  ];

  const logo = koopLogoGroup(480, 372, 26, NAVY, logoDataUrl);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400">
      <rect x="0" y="0" width="800" height="400" fill="${WHITE}" />
      <rect x="6" y="6" width="788" height="388" rx="26" fill="none" stroke="${RED}" stroke-width="5" />
      <rect x="18" y="18" width="764" height="310" rx="22" fill="${NAVY}" />

      <text x="40" y="75" font-family="${FONT}" font-weight="900" font-size="32" fill="${RED}">ORDER FOOD &amp; DRINKS</text>
      <text x="40" y="116" font-family="${FONT}" font-weight="900" font-size="32" fill="${WHITE}">FROM RIGHT HERE</text>

      <rect x="40" y="138" width="390" height="112" rx="14" fill="${WHITE}" stroke="${RED}" stroke-width="3" />
      <text x="235" y="${112 + 90 - nameSize * 0.15}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${nameSize}" fill="${NAVY}">${esc(name)}</text>
      <line x1="95" y1="222" x2="175" y2="222" stroke="${RED}" stroke-width="2" />
      <text x="235" y="228" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="18" fill="${RED}" letter-spacing="1">GOLF CLUB</text>
      <line x1="295" y1="222" x2="375" y2="222" stroke="${RED}" stroke-width="2" />

      <line x1="592" y1="45" x2="592" y2="270" stroke="${WHITE}" stroke-opacity="0.15" stroke-width="2" />
      ${rows.map(iconRowMarkup).join('\n')}

      <rect x="605" y="42" width="155" height="155" rx="14" fill="${WHITE}" />
      <image href="${esc(qrDataUrl)}" x="613" y="50" width="139" height="139" />
      <rect x="605" y="205" width="155" height="32" rx="16" fill="${RED}" />
      <text x="682" y="226" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="12" fill="${WHITE}" letter-spacing="0.5">SCAN TO ORDER</text>

      <text x="468" y="372" text-anchor="end" font-family="${FONT}" font-weight="700" font-size="16" fill="${MUTED}" letter-spacing="1">POWERED BY</text>
      ${logo.markup}
    </svg>
  `.trim();

  return { svg, widthPx: widthIn * DPI, heightPx: heightIn * DPI, widthIn, heightIn };
}

/** 18" x 24" yard sign. */
export function buildYardSignSvg({ courseName, qrDataUrl, logoDataUrl }: PrintAssetInput): PrintAssetTemplate {
  const widthIn = 18;
  const heightIn = 24;
  const name = courseName.toUpperCase();
  const nameSize = fitFontSize(name, 480, 60, 30);

  const rows: IconRow[] = [
    { cx: 130, cy: 440, icon: iconScan, headline: 'SCAN', sub: 'WITH YOUR PHONE', textX: 175, headlineSize: 22, subSize: 13 },
    { cx: 130, cy: 525, icon: iconCart, headline: 'ORDER', sub: 'FOOD & DRINKS', textX: 175, headlineSize: 22, subSize: 13 },
    { cx: 130, cy: 610, icon: iconCloche, headline: 'WE DELIVER', sub: 'TO YOU', textX: 175, headlineSize: 22, subSize: 13 },
  ];

  const logoFontSize = 30;
  const poweredByWidth = 150;
  const logo = koopLogoGroup(360 - poweredByWidth / 2 + 20, 850, logoFontSize, NAVY, logoDataUrl);

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 900">
      <rect x="0" y="0" width="720" height="900" fill="${WHITE}" />
      <rect x="10" y="10" width="700" height="880" rx="30" fill="none" stroke="${RED}" stroke-width="6" />
      <rect x="24" y="24" width="672" height="770" rx="26" fill="${NAVY}" />

      <text x="360" y="110" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="40" fill="${RED}">ORDER FOOD &amp; DRINKS</text>
      <text x="360" y="158" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="40" fill="${WHITE}">FROM RIGHT HERE</text>

      <rect x="90" y="195" width="540" height="175" rx="18" fill="${WHITE}" stroke="${RED}" stroke-width="4" />
      <text x="360" y="${195 + 175 / 2 + nameSize * 0.32}" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="${nameSize}" fill="${NAVY}">${esc(name)}</text>
      <line x1="175" y1="333" x2="290" y2="333" stroke="${RED}" stroke-width="3" />
      <text x="360" y="340" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="26" fill="${RED}" letter-spacing="1.5">GOLF CLUB</text>
      <line x1="430" y1="333" x2="545" y2="333" stroke="${RED}" stroke-width="3" />

      <line x1="420" y1="405" x2="420" y2="650" stroke="${WHITE}" stroke-opacity="0.15" stroke-width="2" />
      ${rows.map(iconRowMarkup).join('\n')}

      <rect x="440" y="390" width="210" height="210" rx="16" fill="${WHITE}" />
      <image href="${esc(qrDataUrl)}" x="452" y="402" width="186" height="186" />
      <rect x="440" y="615" width="210" height="46" rx="23" fill="${RED}" />
      <text x="545" y="644" text-anchor="middle" font-family="${FONT}" font-weight="900" font-size="16" fill="${WHITE}" letter-spacing="0.5">SCAN TO ORDER</text>

      <text x="${360 - poweredByWidth / 2}" y="856" text-anchor="start" font-family="${FONT}" font-weight="700" font-size="18" fill="${MUTED}" letter-spacing="1">POWERED BY</text>
      ${logo.markup}
    </svg>
  `.trim();

  return { svg, widthPx: widthIn * DPI, heightPx: heightIn * DPI, widthIn, heightIn };
}

/** Fetches a (same-origin-friendly) image URL and returns it as a base64 data URL, avoiding canvas taint. */
export async function fetchAsDataUrl(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Rasterizes an SVG string to a PNG data URL at the given pixel dimensions. */
export function rasterizeSvgToPngDataUrl(svg: string, widthPx: number, heightPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const svgDataUrl = `data:image/svg+xml;charset=utf-8;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = widthPx;
      canvas.height = heightPx;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas not supported.'));
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, widthPx, heightPx);
      ctx.drawImage(img, 0, 0, widthPx, heightPx);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to rasterize template.'));
    img.src = svgDataUrl;
  });
}

/** Builds a print-ready single-page PDF (sized to the template's physical dimensions) and downloads it. */
export async function downloadTemplateAsPdf(template: PrintAssetTemplate, filename: string) {
  const { jsPDF } = await import('jspdf');
  const pngDataUrl = await rasterizeSvgToPngDataUrl(template.svg, template.widthPx, template.heightPx);
  const orientation = template.widthIn >= template.heightIn ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'in', format: [template.widthIn, template.heightIn] });
  pdf.addImage(pngDataUrl, 'PNG', 0, 0, template.widthIn, template.heightIn, undefined, 'FAST');
  pdf.save(filename);
}
