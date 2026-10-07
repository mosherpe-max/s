import { Fragment } from 'react';
import type { PatronTermsDocument, TermsBlock, TermsRun } from '@/lib/patron-terms-default';

// Renders the Patron Terms & Conditions from structured content (see
// src/lib/patron-terms-default.ts). Used by the checkout popup, the public /terms
// page, and the Koop Admin preview. Everything is rendered as plain React text, so
// published text can never inject markup.

function Runs({ runs }: { runs: TermsRun[] }) {
  return (
    <>
      {runs.map((r, i) => {
        let node: React.ReactNode = r.text;
        if (r.bold) node = <strong>{node}</strong>;
        if (r.italic) node = <em>{node}</em>;
        return <Fragment key={i}>{node}</Fragment>;
      })}
    </>
  );
}

function Block({ block }: { block: TermsBlock }) {
  if (block.type === 'heading') {
    if (block.level === 1) {
      return <h2 className="mb-2 text-xl font-black uppercase tracking-tight text-[#213147]">{block.text}</h2>;
    }
    return <h3 className="mt-5 mb-1.5 text-sm font-black uppercase tracking-wide text-[#213147]">{block.text}</h3>;
  }
  if (block.type === 'list') {
    return (
      <ul className="mb-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700">
        {block.items.map((item, i) => <li key={i}><Runs runs={item.runs} /></li>)}
      </ul>
    );
  }
  return <p className="mb-2 text-sm leading-relaxed text-slate-700"><Runs runs={block.runs} /></p>;
}

export function PatronTermsContent({ terms, showTitle = true }: { terms: PatronTermsDocument; showTitle?: boolean }) {
  // The first top-level heading is the document title; callers that show their own
  // title (e.g. a popup header) can hide it.
  const titleIndex = terms.blocks.findIndex((b) => b.type === 'heading' && b.level === 1);
  return (
    <div className="text-left">
      {terms.blocks.map((block, i) => (!showTitle && i === titleIndex ? null : <Block key={i} block={block} />))}
    </div>
  );
}
