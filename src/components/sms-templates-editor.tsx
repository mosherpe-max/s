'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DEFAULT_SMS_TEMPLATES, SMS_MESSAGES, SMS_SAMPLE_FIELDS,
  renderSmsTemplate, smsSegments, validateSmsTemplate, type SmsTemplateKey,
} from '@/lib/sms-templates';

// Koop admin > System settings: the wording of each text patrons get about their order. Leaving a message at its
// default stores nothing; the sender uses its own copy of the default.
export function SmsTemplatesEditor({ saved, onSave }: {
  saved?: Partial<Record<SmsTemplateKey, string>>;
  onSave: (key: SmsTemplateKey, text: string | null) => Promise<void>;
}) {
  return (
    <div className="space-y-4">
      <div className="text-left">
        <h5 className="text-xs font-black uppercase text-[#213147] flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Patron text messages</h5>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-relaxed mt-1 max-w-2xl">
          What patrons are texted at each step. Changes apply to the next text sent. Only the Koop admin can change these.
        </p>
      </div>
      {SMS_MESSAGES.map(m => (
        <MessageEditor key={m.key} def={m} savedText={saved?.[m.key]} onSave={onSave} />
      ))}
    </div>
  );
}

function MessageEditor({ def, savedText, onSave }: {
  def: (typeof SMS_MESSAGES)[number];
  savedText?: string;
  onSave: (key: SmsTemplateKey, text: string | null) => Promise<void>;
}) {
  const current = savedText ?? DEFAULT_SMS_TEMPLATES[def.key];
  const [text, setText] = useState(current);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  // Pick up a change saved from elsewhere, but never overwrite what is being typed.
  const lastCurrent = useRef(current);
  useEffect(() => {
    if (current !== lastCurrent.current) {
      if (text === lastCurrent.current) setText(current);
      lastCurrent.current = current;
    }
  }, [current, text]);

  const problem = validateSmsTemplate(def.key, text);
  const preview = renderSmsTemplate(text, SMS_SAMPLE_FIELDS);
  const size = smsSegments(preview);
  const isDefault = text.trim() === DEFAULT_SMS_TEMPLATES[def.key];
  const changed = text.trim() !== current.trim();

  const insert = (field: string) => {
    const el = ref.current;
    const token = `{${field}}`;
    if (!el) { setText(t => t + token); return; }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    setText(text.slice(0, start) + token + text.slice(end));
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + token.length, start + token.length); });
  };

  const save = async () => {
    if (problem) return;
    setSaving(true);
    try { await onSave(def.key, isDefault ? null : text.trim()); } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border-2 border-slate-100 bg-white p-4 space-y-3 text-left">
      <div>
        <p className="text-xs font-black uppercase text-[#213147]">{def.label}</p>
        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{def.when}</p>
      </div>
      <Textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label={`${def.label} text`}
        rows={3}
        className={`border-2 font-medium text-sm ${problem ? 'border-red-300' : ''}`}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mr-1">Insert</Label>
        {def.fields.map(f => (
          <Button key={f} type="button" variant="outline" size="sm" onClick={() => insert(f)} className="h-6 px-2 rounded-full border-2 font-mono text-[10px] font-bold">{`{${f}}`}</Button>
        ))}
      </div>
      {problem && <p role="alert" className="text-[11px] font-bold text-red-600">{problem}</p>}
      <div className="rounded-xl bg-slate-50 border-2 border-slate-100 p-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Preview</p>
        <p className="text-sm font-medium text-[#213147] break-words">{preview || <span className="opacity-40">Nothing to show</span>}</p>
      </div>
      <p className="text-[10px] font-bold text-muted-foreground">
        {size.length} characters · {size.segments} text segment{size.segments === 1 ? '' : 's'}
      </p>
      {size.unicode && (
        <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
          {size.oddCharacters.map(c => `"${c}"`).join(' ')} makes this a Unicode text, which fits only 70 characters per segment instead of 160, so it costs more.
          Swap it for a plain character (like a hyphen or straight quote) to keep it cheaper.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={save} disabled={!!problem || !changed || saving} className="h-9 px-4 font-black uppercase text-[10px] tracking-widest gap-2">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
        </Button>
        <Button type="button" variant="outline" onClick={() => setText(DEFAULT_SMS_TEMPLATES[def.key])} disabled={isDefault} className="h-9 px-3 border-2 font-black uppercase text-[10px] tracking-widest gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Use the default wording
        </Button>
      </div>
    </div>
  );
}
