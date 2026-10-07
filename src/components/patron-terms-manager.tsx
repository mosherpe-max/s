'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { doc, getDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { FileText, Loader2, Upload, Eye, ExternalLink } from 'lucide-react';
import { useFirestore, useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PatronTermsContent } from '@/components/patron-terms-content';
import { loadActivePatronTerms } from '@/lib/patron-terms';
import { parseTermsDocx, termsTextLength, type ParsedTermsDocument } from '@/lib/terms-docx';
import { DEFAULT_PATRON_TERMS, type PatronTermsDocument } from '@/lib/patron-terms-default';

const MIN_TEXT_LENGTH = 300;
const MAX_TEXT_LENGTH = 200000;

// Koop Admin: see the Patron Terms & Conditions patrons currently agree to, and publish
// a new version by uploading a Word document. Publishing keeps a copy of every version
// (solution/patronTerms/versions) and makes every patron agree again on their next order.
export function PatronTermsManager() {
  const firestore = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [current, setCurrent] = useState<PatronTermsDocument | null>(null);
  const [publishedAt, setPublishedAt] = useState<Date | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [pending, setPending] = useState<{ parsed: ParsedTermsDocument; fileName: string } | null>(null);

  const refresh = useCallback(async () => {
    if (!firestore) return;
    setCurrent(await loadActivePatronTerms(firestore));
    try {
      const snap = await getDoc(doc(firestore, 'solution', 'patronTerms'));
      setPublishedAt(snap.exists() && snap.data().updatedAt?.toDate ? snap.data().updatedAt.toDate() : null);
    } catch {
      setPublishedAt(null);
    }
  }, [firestore]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleFile = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    if (!/\.docx$/i.test(file.name)) {
      toast({ variant: 'destructive', title: 'Word Document Required', description: 'Please choose a .docx file.' });
      return;
    }
    setIsParsing(true);
    try {
      const parsed = await parseTermsDocx(file);
      const length = termsTextLength(parsed.blocks);
      if (parsed.blocks.length < 3 || length < MIN_TEXT_LENGTH) {
        toast({ variant: 'destructive', title: 'Document Looks Empty', description: 'That file has very little text. Check it is the right document.' });
        return;
      }
      if (length > MAX_TEXT_LENGTH) {
        toast({ variant: 'destructive', title: 'Document Too Long', description: 'That file is too large to publish as Terms & Conditions.' });
        return;
      }
      setPending({ parsed, fileName: file.name });
    } catch {
      toast({ variant: 'destructive', title: 'Could Not Read Document', description: 'The file could not be read as a Word document.' });
    } finally {
      setIsParsing(false);
    }
  };

  const handlePublish = async () => {
    if (!firestore || !pending) return;
    setIsPublishing(true);
    const version = new Date().toISOString().replace(/[:.]/g, '-');
    const payload = {
      version,
      title: pending.parsed.title,
      blocks: pending.parsed.blocks,
      fileName: pending.fileName,
      updatedBy: user?.email || null,
      updatedAt: serverTimestamp(),
    };
    try {
      const batch = writeBatch(firestore);
      batch.set(doc(firestore, 'solution', 'patronTerms'), payload);
      batch.set(doc(firestore, 'solution', 'patronTerms', 'versions', version), payload);
      await batch.commit();
      toast({ title: 'New Terms Published', description: 'Patrons will be asked to agree to the new version on their next order.' });
      setPending(null);
      await refresh();
    } catch {
      toast({ variant: 'destructive', title: 'Publish Failed', description: 'The Terms could not be saved. Check that the latest Firestore rules are deployed.' });
    } finally {
      setIsPublishing(false);
    }
  };

  const isBuiltIn = !current || current.fileName == null;

  return (
    <Card className="border-2 shadow-sm p-8 space-y-6 text-left">
      <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
        <FileText className="h-4 w-4" /> Patron Terms &amp; Conditions
      </h4>

      <div className="rounded-xl border-2 border-slate-100 bg-slate-50 p-4 space-y-1">
        {current ? (
          <>
            <p className="text-sm font-black uppercase text-[#213147]">{current.title}</p>
            <p className="text-[10px] font-bold uppercase text-muted-foreground">
              {isBuiltIn
                ? `Built-in original (${DEFAULT_PATRON_TERMS.version})`
                : `From ${current.fileName}${publishedAt ? ` - published ${publishedAt.toLocaleString()}` : ''}`}
            </p>
            <p className="text-[9px] font-bold uppercase text-muted-foreground">Version {current.version}</p>
          </>
        ) : (
          <Loader2 className="h-5 w-5 animate-spin text-primary opacity-30" />
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={() => setPreviewing(true)} disabled={!current} className="h-11 border-2 font-black uppercase text-[10px] tracking-widest gap-2">
          <Eye className="h-4 w-4" /> View Current
        </Button>
        <Button asChild variant="outline" className="h-11 border-2 font-black uppercase text-[10px] tracking-widest gap-2">
          <a href="/terms" target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Public Page</a>
        </Button>
        <Button onClick={() => fileInput.current?.click()} disabled={isParsing} className="h-11 font-black uppercase text-[10px] tracking-widest gap-2">
          {isParsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload New Document
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      <p className="text-[10px] font-bold uppercase leading-relaxed text-muted-foreground">
        Upload a Word (.docx) file to replace the Terms. You&apos;ll review it before it goes live. Headings, paragraphs, bullet lists and bold/italic text are kept; images and tables are not. Publishing asks every patron to agree again on their next order. Past versions are kept on file.
      </p>

      {/* Current version */}
      <Dialog open={previewing} onOpenChange={setPreviewing}>
        <DialogContent className="flex max-h-[88vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-3 p-5 text-left">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-black uppercase tracking-wide text-[#213147]">Current Terms</DialogTitle>
            <DialogDescription className="text-[11px] font-semibold">What patrons agree to at checkout right now.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border-2 border-slate-100 bg-white p-4">
            {current && <PatronTermsContent terms={current} showTitle={false} />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Review an uploaded document before publishing */}
      <Dialog open={!!pending} onOpenChange={(o) => { if (!o && !isPublishing) setPending(null); }}>
        <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-3 p-5 text-left">
          <DialogHeader className="text-left">
            <DialogTitle className="text-base font-black uppercase tracking-wide text-[#213147]">Review Before Publishing</DialogTitle>
            <DialogDescription className="text-[11px] font-semibold">
              {pending?.fileName}. Check it reads correctly. Once published, every patron is asked to agree again on their next order.
            </DialogDescription>
          </DialogHeader>
          {pending && pending.parsed.skipped.length > 0 && (
            <p className="rounded-lg border-2 border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-800">
              Left out of the document (not supported): {pending.parsed.skipped.join(', ')}.
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border-2 border-slate-100 bg-white p-4">
            {pending && (
              <PatronTermsContent
                terms={{ version: 'preview', title: pending.parsed.title, blocks: pending.parsed.blocks }}
                showTitle
              />
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPending(null)} disabled={isPublishing} className="h-11 flex-1 border-2 font-black uppercase text-[10px] tracking-widest">
              Cancel
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing} className="h-11 flex-1 font-black uppercase text-[10px] tracking-widest gap-2">
              {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />} Publish New Terms
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
