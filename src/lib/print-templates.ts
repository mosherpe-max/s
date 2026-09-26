/**
 * Cart sticker + yard sign print templates for golf venues. Unlike the
 * older inline-SVG templates in print-assets.ts (still used for the poster
 * and bowling table tent), these are real HTML/CSS - built from Koop's own
 * design mockups - rendered via html-to-image against the live DOM so real
 * web fonts (Barlow Condensed, Poppins) and flexbox layout come through
 * faithfully, then wrapped into a print-sized PDF with jsPDF.
 */

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface PrintHtmlTemplateInput {
  venueName: string;
  qrDataUrl: string;
  logoDataUrl: string;
}

export interface PrintHtmlDimensions {
  widthPx: number;
  heightPx: number;
  widthIn: number;
  heightIn: number;
}

export const CART_STICKER_DIMENSIONS: PrintHtmlDimensions = { widthPx: 672, heightPx: 480, widthIn: 7, heightIn: 5 };
export const YARD_SIGN_DIMENSIONS: PrintHtmlDimensions = { widthPx: 2304, heightPx: 1728, widthIn: 24, heightIn: 18 };

const GOOGLE_FONTS_HREF = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Poppins:wght@400;500;600;700&display=swap';

/** A self-contained Koop "K O [target] P" wordmark, so a venue with no custom logoUrl still gets a branded print asset without a static image asset to host. */
export function buildDefaultKoopLogoDataUri(colorHex: string = '#FFFFFF'): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="220" height="64" viewBox="0 0 220 64">
      <text x="0" y="48" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="48" fill="${colorHex}">K</text>
      <text x="36" y="48" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="48" fill="${colorHex}">O</text>
      <circle cx="106" cy="32" r="18" fill="none" stroke="#E50000" stroke-width="4.2" />
      <circle cx="106" cy="32" r="10.5" fill="none" stroke="#E50000" stroke-width="3.6" />
      <circle cx="106" cy="32" r="3.6" fill="#E50000" />
      <text x="132" y="48" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-size="48" fill="${colorHex}">P</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function buildCartStickerHtml({ venueName, qrDataUrl, logoDataUrl }: PrintHtmlTemplateInput): string {
  const name = esc(venueName.toUpperCase());
  return `
<div id="sticker" style="width: 672px; height: 480px; background: #F0F0F0; display: flex; flex-direction: column; font-family: 'Poppins', sans-serif; overflow: hidden">
  <div style="background: #213147; padding: 17px 28px; display: flex; justify-content: space-between; align-items: center; gap: 16px">
    <div id="venue-name" style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 34px; line-height: 1; color: #FFFFFF; text-transform: uppercase; letter-spacing: 0.5px; min-width: 0; white-space: nowrap">${name}</div>
    <div style="display: flex; align-items: baseline; gap: 5px; flex-shrink: 0">
      <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 10px; letter-spacing: 1.5px; color: #8FA1B8; text-transform: uppercase">Powered by</span>
      <img src="${logoDataUrl}" alt="Koop" style="height: 14px; width: auto; transform: translateY(3px)">
    </div>
  </div>
  <div style="height: 3px; background: #E50000; width: 100%"></div>
  <div style="flex-grow: 1; padding: 8px 26px; display: flex; align-items: center; gap: 24px">
    <div style="flex: 0.95; display: flex; flex-direction: column; gap: 16px; justify-content: center">
      <div style="display: flex; align-items: center; gap: 14px">
        <div style="width: 46px; height: 46px; border-radius: 11px; background: #E50000; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
          <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 25px; color: #FFFFFF">1</span>
        </div>
        <div style="display: flex; flex-direction: column">
          <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 30px; line-height: 1.05; color: #213147; text-transform: uppercase">Scan</div>
          <div style="font-family: 'Poppins', sans-serif; font-weight: 500; font-size: 15px; color: #4B5563">With Your Phone</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 14px">
        <div style="width: 46px; height: 46px; border-radius: 11px; background: #E50000; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
          <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 25px; color: #FFFFFF">2</span>
        </div>
        <div style="display: flex; flex-direction: column">
          <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 30px; line-height: 1.05; color: #213147; text-transform: uppercase">Order</div>
          <div style="font-family: 'Poppins', sans-serif; font-weight: 500; font-size: 15px; color: #4B5563">Food &amp; Drinks</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 14px">
        <div style="width: 46px; height: 46px; border-radius: 11px; background: #E50000; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
          <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 25px; color: #FFFFFF">3</span>
        </div>
        <div style="display: flex; flex-direction: column">
          <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 30px; line-height: 1.05; color: #213147; text-transform: uppercase">Delivered</div>
          <div style="font-family: 'Poppins', sans-serif; font-weight: 500; font-size: 15px; color: #4B5563">To You</div>
        </div>
      </div>
    </div>
    <div style="flex: 1.05; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px">
      <div style="background: #FFFFFF; border: 1.5px solid #DADADA; padding: 14px; border-radius: 13px; display: flex; align-items: center; justify-content: center">
        <img src="${qrDataUrl}" alt="QR code" style="width: 280px; height: 280px; display: block">
      </div>
      <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 18px; letter-spacing: 1px; color: #213147; text-transform: uppercase; text-align: center">Scan to Order</div>
    </div>
  </div>
  <div style="background: #E50000; padding: 11px 26px; display: flex; align-items: center; justify-content: center">
    <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 23px; letter-spacing: 1px; color: #FFFFFF; text-transform: uppercase; text-align: center; white-space: nowrap">Food &amp; Drinks Delivered On Course</span>
  </div>
</div>`.trim();
}

export function buildYardSignHtml({ venueName, qrDataUrl, logoDataUrl }: PrintHtmlTemplateInput): string {
  const name = esc(venueName.toUpperCase());
  return `
<div id="sign" style="width: 2304px; height: 1728px; background: #F0F0F0; display: flex; flex-direction: column; font-family: 'Poppins', sans-serif; overflow: hidden">
  <div style="background: #213147; padding: 52px 112px; display: flex; justify-content: space-between; align-items: center; gap: 60px">
    <div id="venue-name" style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 120px; line-height: 1; color: #FFFFFF; text-transform: uppercase; letter-spacing: 1px; flex-shrink: 1; min-width: 0; white-space: nowrap">${name}</div>
    <div style="display: flex; align-items: baseline; gap: 12px; flex-shrink: 0">
      <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 700; font-size: 28px; letter-spacing: 4px; color: #8FA1B8; text-transform: uppercase">Powered by</span>
      <img src="${logoDataUrl}" alt="Koop" style="height: 46px; width: auto; transform: translateY(10px)">
    </div>
  </div>
  <div style="height: 6px; background: #E50000; width: 100%"></div>
  <div style="flex-grow: 1; padding: 56px 112px; display: flex; align-items: center; gap: 130px">
    <div style="flex: 0.95; display: flex; flex-direction: column; gap: 74px; justify-content: center">
      <div style="display: flex; align-items: center; gap: 44px">
        <div style="width: 148px; height: 148px; border-radius: 26px; background: #E50000; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
          <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 78px; color: #FFFFFF">1</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px">
          <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 96px; line-height: 1; color: #213147; text-transform: uppercase; letter-spacing: 1px">Scan</div>
          <div style="font-family: 'Poppins', sans-serif; font-weight: 500; font-size: 46px; color: #4B5563">With Your Phone</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 44px">
        <div style="width: 148px; height: 148px; border-radius: 26px; background: #E50000; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
          <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 78px; color: #FFFFFF">2</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px">
          <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 96px; line-height: 1; color: #213147; text-transform: uppercase; letter-spacing: 1px">Order</div>
          <div style="font-family: 'Poppins', sans-serif; font-weight: 500; font-size: 46px; color: #4B5563">Food &amp; Drinks</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 44px">
        <div style="width: 148px; height: 148px; border-radius: 26px; background: #E50000; display: flex; align-items: center; justify-content: center; flex-shrink: 0">
          <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 78px; color: #FFFFFF">3</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 6px">
          <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 96px; line-height: 1; color: #213147; text-transform: uppercase; letter-spacing: 1px">Delivered</div>
          <div style="font-family: 'Poppins', sans-serif; font-weight: 500; font-size: 46px; color: #4B5563">To You</div>
        </div>
      </div>
    </div>
    <div style="flex: 1.05; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 32px">
      <div style="background: #FFFFFF; border: 2px solid #DADADA; padding: 52px; border-radius: 28px; display: flex; align-items: center; justify-content: center">
        <img src="${qrDataUrl}" alt="QR code" style="width: 880px; height: 880px; display: block">
      </div>
      <div style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 60px; letter-spacing: 2px; color: #213147; text-transform: uppercase; text-align: center">Scan to Order</div>
    </div>
  </div>
  <div style="background: #E50000; padding: 52px 112px; display: flex; align-items: center; justify-content: center">
    <span style="font-family: 'Barlow Condensed', sans-serif; font-weight: 800; font-size: 94px; letter-spacing: 3px; color: #FFFFFF; text-transform: uppercase; text-align: center; white-space: nowrap">Food &amp; Drinks Delivered On Course</span>
  </div>
</div>`.trim();
}

let googleFontsPromise: Promise<void> | null = null;

/** Loads the two Google Fonts these templates need exactly once per page, and resolves once the browser reports them ready to paint. */
function ensureGoogleFontsLoaded(): Promise<void> {
  if (typeof document === 'undefined') return Promise.resolve();
  if (!googleFontsPromise) {
    if (!document.head.querySelector(`link[href="${GOOGLE_FONTS_HREF}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = GOOGLE_FONTS_HREF;
      document.head.appendChild(link);
    }
    const fontsReady: Promise<any> = (document as any).fonts?.ready || Promise.resolve();
    googleFontsPromise = fontsReady.then(() => undefined);
  }
  return googleFontsPromise;
}

/** Mirrors the auto-shrink <script> in the original template mockups - inert once inserted via innerHTML, so it's reimplemented as a real function run right before capture. */
function fitVenueNameInPlace(root: HTMLElement, maxFontSize: number, minFontSize: number, step: number) {
  const el = root.querySelector('#venue-name') as HTMLElement | null;
  if (!el) return;
  const header = el.parentElement as HTMLElement;
  const logoBlock = header.lastElementChild as HTMLElement;
  const gap = parseFloat(getComputedStyle(header).columnGap || getComputedStyle(header).gap || '0') || 0;
  const available = header.clientWidth
    - parseFloat(getComputedStyle(header).paddingLeft)
    - parseFloat(getComputedStyle(header).paddingRight)
    - logoBlock.offsetWidth
    - gap;
  let size = maxFontSize;
  el.style.fontSize = size + 'px';
  while (el.scrollWidth > available && size > minFontSize) {
    size -= step;
    el.style.fontSize = size + 'px';
  }
}

/**
 * Renders one of the templates above to a high-resolution PNG data URL by
 * inserting it into a hidden, off-screen (but laid-out and painted) node,
 * running the venue-name auto-fit, capturing with html-to-image (which
 * fetches and embeds the real web fonts itself), then cleaning up.
 */
async function renderToPngDataUrl(html: string, dims: PrintHtmlDimensions, isSign: boolean, pixelRatio: number): Promise<string> {
  await ensureGoogleFontsLoaded();
  const { toPng } = await import('html-to-image');

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = dims.widthPx + 'px';
  container.style.height = dims.heightPx + 'px';
  container.style.pointerEvents = 'none';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const root = container.firstElementChild as HTMLElement;
    const imgs = Array.from(root.querySelectorAll('img'));
    await Promise.all(imgs.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())));
    fitVenueNameInPlace(root, isSign ? 120 : 34, isSign ? 48 : 16, isSign ? 2 : 1);
    return await toPng(root, { width: dims.widthPx, height: dims.heightPx, pixelRatio, backgroundColor: '#F0F0F0' });
  } finally {
    document.body.removeChild(container);
  }
}

/** Low-res preview for on-screen display - same template, cheaper capture. */
export function renderTemplatePreview(html: string, dims: PrintHtmlDimensions, isSign: boolean): Promise<string> {
  return renderToPngDataUrl(html, dims, isSign, 1);
}

// html-to-image's DOM-to-SVG-to-canvas pipeline runs synchronously on the
// main thread, so its cost scales with total output pixel count, not just
// pixelRatio. A flat pixelRatio of 3 is fine for the small cart sticker
// (672x480 -> ~2016x1440, ~2.9MP) but explodes for the much larger yard
// sign (2304x1728 -> ~6912x5184, ~35.8MP) - long enough to freeze the tab,
// and on a memory-constrained device, enough to crash/reload it. Capping
// the longest output edge instead of using a flat multiplier keeps every
// template's render cost bounded regardless of its physical size.
const MAX_PRINT_OUTPUT_EDGE_PX = 3600;
const IDEAL_PRINT_PIXEL_RATIO = 3;

function printPixelRatioFor(dims: PrintHtmlDimensions): number {
  const longestEdge = Math.max(dims.widthPx, dims.heightPx);
  return Math.min(IDEAL_PRINT_PIXEL_RATIO, MAX_PRINT_OUTPUT_EDGE_PX / longestEdge);
}

/** Full print-resolution PDF, sized to the template's real physical dimensions. */
export async function renderTemplateToPdfBlob(html: string, dims: PrintHtmlDimensions, isSign: boolean): Promise<Blob> {
  const pngDataUrl = await renderToPngDataUrl(html, dims, isSign, printPixelRatioFor(dims));
  const { jsPDF } = await import('jspdf');
  const orientation = dims.widthIn >= dims.heightIn ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'in', format: [dims.widthIn, dims.heightIn] });
  pdf.addImage(pngDataUrl, 'PNG', 0, 0, dims.widthIn, dims.heightIn, undefined, 'FAST');
  return pdf.output('blob');
}
