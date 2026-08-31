'use client';

import React, { useMemo, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Sticker } from 'lucide-react';
import type { SolutionConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  buildCartStickerSvg,
  buildYardSignSvg,
  fetchAsDataUrl,
  downloadTemplateAsPdf,
  type PrintAssetTemplate,
} from '@/lib/print-assets';

interface PrintMarketingKitProps {
  courseName: string;
  patronMenuUrl: string;
}

type DownloadKind = 'sticker' | 'sign';

export function PrintMarketingKit({ courseName, patronMenuUrl }: PrintMarketingKitProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [downloadingKey, setDownloadingKey] = useState<DownloadKind | null>(null);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: config } = useDoc<SolutionConfig>(configRef);

  const displayName = courseName || 'Your Golf Club';
  const previewQrUrl = patronMenuUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(patronMenuUrl)}&ecc=H`
    : '';

  const stickerPreview = useMemo(
    () => buildCartStickerSvg({ courseName: displayName, qrDataUrl: previewQrUrl, logoDataUrl: config?.logoUrl }),
    [displayName, previewQrUrl, config?.logoUrl]
  );
  const signPreview = useMemo(
    () => buildYardSignSvg({ courseName: displayName, qrDataUrl: previewQrUrl, logoDataUrl: config?.logoUrl }),
    [displayName, previewQrUrl, config?.logoUrl]
  );

  const handleDownload = async (kind: DownloadKind) => {
    if (!patronMenuUrl) {
      toast({ variant: 'destructive', title: 'Access Key Missing', description: 'Activate the QR access key before generating print assets.' });
      return;
    }
    setDownloadingKey(kind);
    try {
      const fullQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(patronMenuUrl)}&ecc=H`;
      const [qrDataUrl, logoDataUrl] = await Promise.all([
        fetchAsDataUrl(fullQrUrl),
        config?.logoUrl ? fetchAsDataUrl(config.logoUrl).catch(() => undefined) : Promise.resolve(undefined),
      ]);
      const input = { courseName: displayName, qrDataUrl, logoDataUrl };
      const template: PrintAssetTemplate = kind === 'sticker' ? buildCartStickerSvg(input) : buildYardSignSvg(input);
      const safeName = displayName.replace(/\s+/g, '_');
      await downloadTemplateAsPdf(template, `${safeName}_${kind === 'sticker' ? 'Cart_Sticker' : 'Yard_Sign'}.pdf`);
      toast({ title: kind === 'sticker' ? 'Cart Sticker Downloaded' : 'Yard Sign Downloaded' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download Failed', description: e.message || 'Unable to generate print asset.' });
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <Card className="border-2 shadow-sm overflow-hidden bg-slate-50/50">
      <CardHeader className="bg-white border-b py-6 px-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/5 rounded-lg"><Sticker className="h-5 w-5 text-primary" /></div>
          <div className="text-left">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Print Marketing Kit</CardTitle>
            <CardDescription className="text-[8px] font-bold uppercase tracking-widest">Golf Cart Sticker &amp; Yard Sign, Auto-Branded for This Venue</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div
              className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-white [&_svg]:w-full [&_svg]:h-auto [&_svg]:block"
              dangerouslySetInnerHTML={{ __html: stickerPreview.svg }}
            />
            <Button
              onClick={() => handleDownload('sticker')}
              disabled={downloadingKey !== null || !patronMenuUrl}
              className="w-full h-11 font-black uppercase text-[10px] tracking-widest gap-2"
            >
              {downloadingKey === 'sticker' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Golf Cart Sticker (8&quot;&times;4&quot; PDF)
            </Button>
          </div>
          <div className="space-y-4">
            <div
              className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-white max-w-[240px] mx-auto [&_svg]:w-full [&_svg]:h-auto [&_svg]:block"
              dangerouslySetInnerHTML={{ __html: signPreview.svg }}
            />
            <Button
              onClick={() => handleDownload('sign')}
              disabled={downloadingKey !== null || !patronMenuUrl}
              className="w-full h-11 font-black uppercase text-[10px] tracking-widest gap-2"
            >
              {downloadingKey === 'sign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Yard Sign (18&quot;&times;24&quot; PDF)
            </Button>
          </div>
        </div>
        {!patronMenuUrl && (
          <p className="text-[9px] font-bold text-amber-600 uppercase tracking-widest text-center">
            Activate your QR access key above to enable print downloads.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
