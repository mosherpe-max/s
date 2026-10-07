import type { TermsBlock, TermsRun } from '@/lib/patron-terms-default';

// Turns an uploaded Word document (.docx) into the structured Terms content.
// mammoth converts the document to simple HTML (headings, paragraphs, lists,
// bold/italic); that HTML is only ever read here, never shown. We copy just the
// text and basic emphasis into plain data, so nothing from the file can end up as
// markup in checkout. Anything else (images, tables, links) is dropped and reported.

export interface ParsedTermsDocument {
  title: string;
  blocks: TermsBlock[];
  skipped: string[];
}

function runsFromNode(node: Node, bold = false, italic = false, out: TermsRun[] = []): TermsRun[] {
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent || '').replace(/\s+/g, ' ');
      if (!text) return;
      const last = out[out.length - 1];
      if (last && !!last.bold === bold && !!last.italic === italic) last.text += text;
      else out.push({ text, ...(bold ? { bold: true } : {}), ...(italic ? { italic: true } : {}) });
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as Element).tagName.toLowerCase();
      if (tag === 'br') return;
      runsFromNode(child, bold || tag === 'strong' || tag === 'b', italic || tag === 'em' || tag === 'i', out);
    }
  });
  return out;
}

function trimRuns(runs: TermsRun[]): TermsRun[] {
  const out = runs.map((r) => ({ ...r }));
  if (out.length) out[0].text = out[0].text.replace(/^\s+/, '');
  if (out.length) out[out.length - 1].text = out[out.length - 1].text.replace(/\s+$/, '');
  return out.filter((r) => r.text !== '');
}

const plain = (runs: TermsRun[]) => runs.map((r) => r.text).join('');

export async function parseTermsDocx(file: File): Promise<ParsedTermsDocument> {
  const mammoth = await import('mammoth');
  const { value: htmlText } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  const dom = new DOMParser().parseFromString(htmlText, 'text/html');

  const blocks: TermsBlock[] = [];
  const skipped = new Set<string>();

  dom.body.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    const tag = el.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const text = plain(trimRuns(runsFromNode(el))).trim();
      if (text) blocks.push({ type: 'heading', level: Math.min(Number(tag[1]), 3) as 1 | 2 | 3, text });
    } else if (tag === 'p') {
      if (el.querySelector('img')) skipped.add('images');
      const runs = trimRuns(runsFromNode(el));
      if (plain(runs).trim()) blocks.push({ type: 'paragraph', runs });
    } else if (tag === 'ul' || tag === 'ol') {
      const items = Array.from(el.children)
        .filter((c) => c.tagName.toLowerCase() === 'li')
        .map((li) => ({ runs: trimRuns(runsFromNode(li)) }))
        .filter((item) => plain(item.runs).trim());
      if (items.length) blocks.push({ type: 'list', items });
    } else if (tag === 'table') {
      skipped.add('tables');
    } else {
      skipped.add(tag);
    }
  });

  // The first top-level heading is the title; if the document has none, use the file name.
  const firstH1 = blocks.find((b) => b.type === 'heading' && b.level === 1);
  const title = firstH1 && firstH1.type === 'heading' ? firstH1.text : file.name.replace(/\.docx$/i, '');
  if (!firstH1) blocks.unshift({ type: 'heading', level: 1, text: title });

  return { title, blocks, skipped: Array.from(skipped) };
}

// A document with next to no text is almost certainly the wrong file.
export function termsTextLength(blocks: TermsBlock[]): number {
  return blocks.reduce((n, b) => {
    if (b.type === 'heading') return n + b.text.length;
    if (b.type === 'paragraph') return n + plain(b.runs).length;
    return n + b.items.reduce((m, it) => m + plain(it.runs).length, 0);
  }, 0);
}
