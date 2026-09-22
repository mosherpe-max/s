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
  buildPosterSvg,
  buildTableTentSvg,
  fetchAsDataUrl,
  downloadTemplateAsPdf,
  type PrintAssetTemplate,
  type PrintVenueType,
} from '@/lib/print-assets';

interface PrintMarketingKitProps {
  courseName: string;
  patronMenuUrl: string;
  /** Defaults to 'Golf Course' so the existing self-serve venue-owner usage keeps its current sticker + sign kit unchanged. */
  venueType?: 'Golf Course' | 'Bowling Center';
}

type DownloadKind = 'sticker' | 'sign' | 'poster' | 'tableTent';

interface DownloadableAsset {
  kind: DownloadKind;
  label: string;
  filenameSuffix: string;
  preview: PrintAssetTemplate;
  previewMaxWidthClass?: string;
}

export function PrintMarketingKit({ courseName, patronMenuUrl, venueType = 'Golf Course' }: PrintMarketingKitProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [downloadingKey, setDownloadingKey] = useState<DownloadKind | null>(null);

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: config } = useDoc<SolutionConfig>(configRef);

  const posterVenueType: PrintVenueType = venueType === 'Bowling Center' ? 'bowling' : 'golf';
  const displayName = courseName || (posterVenueType === 'bowling' ? 'Your Bowling Center' : 'Your Golf Club');
  const previewQrUrl = patronMenuUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(patronMenuUrl)}&ecc=H`
    : '';
  const previewInput = { courseName: displayName, qrDataUrl: previewQrUrl, logoDataUrl: config?.logoUrl };

  const stickerPreview = useMemo(() => buildCartStickerSvg(previewInput), [displayName, previewQrUrl, config?.logoUrl]);
  const signPreview = useMemo(() => buildYardSignSvg(previewInput), [displayName, previewQrUrl, config?.logoUrl]);
  const posterPreview = useMemo(() => buildPosterSvg(previewInput, posterVenueType), [displayName, previewQrUrl, config?.logoUrl, posterVenueType]);
  const tableTentPreview = useMemo(() => buildTableTentSvg(previewInput), [displayName, previewQrUrl]);

  const assets: DownloadableAsset[] = venueType === 'Bowling Center'
    ? [
        { kind: 'tableTent', label: 'Table Tent (5"×7" PDF)', filenameSuffix: 'Table_Tent', preview: tableTentPreview, previewMaxWidthClass: 'max-w-[220px] mx-auto' },
        { kind: 'poster', label: 'Poster (11"×17" PDF)', filenameSuffix: 'Poster', preview: posterPreview, previewMaxWidthClass: 'max-w-[240px] mx-auto' },
      ]
    : [
        { kind: 'sticker', label: 'Golf Cart Sticker (8"×4" PDF)', filenameSuffix: 'Cart_Sticker', preview: stickerPreview },
        { kind: 'sign', label: 'Yard Sign (18"×24" PDF)', filenameSuffix: 'Yard_Sign', preview: signPreview, previewMaxWidthClass: 'max-w-[240px] mx-auto' },
        { kind: 'poster', label: 'Poster (11"×17" PDF)', filenameSuffix: 'Poster', preview: posterPreview, previewMaxWidthClass: 'max-w-[240px] mx-auto' },
      ];

  const handleDownload = async (kind: DownloadKind, filenameSuffix: string) => {
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
      let template: PrintAssetTemplate;
      if (kind === 'sticker') template = buildCartStickerSvg(input);
      else if (kind === 'sign') template = buildYardSignSvg(input);
      else if (kind === 'tableTent') template = buildTableTentSvg(input);
      else template = buildPosterSvg(input, posterVenueType);

      const safeName = displayName.replace(/\s+/g, '_');
      await downloadTemplateAsPdf(template, `${safeName}_${filenameSuffix}.pdf`);
      toast({ title: `${filenameSuffix.replace(/_/g, ' ')} Downloaded` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Download Failed', description: e.message || 'Unable to generate print asset.' });
    } finally {
      setDownloadingKey(null);
    }
  };

  const description = venueType === 'Bowling Center'
    ? 'Table Tent & Poster, Auto-Branded for This Venue'
    : 'Golf Cart Sticker, Yard Sign & Poster, Auto-Branded for This Venue';

  return (
    <Card className="border-2 shadow-sm overflow-hidden bg-slate-50/50">
      <CardHeader className="bg-white border-b py-6 px-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/5 rounded-lg"><Sticker className="h-5 w-5 text-primary" /></div>
          <div className="text-left">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-[#213147]">Print Marketing Kit</CardTitle>
            <CardDescription className="text-[8px] font-bold uppercase tracking-widest">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <div className={`grid grid-cols-1 gap-8 ${assets.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          {assets.map((asset) => (
            <div key={asset.kind} className="space-y-4">
              <div
                className={`rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-white [&_svg]:w-full [&_svg]:h-auto [&_svg]:block ${asset.previewMaxWidthClass || ''}`}
                dangerouslySetInnerHTML={{ __html: asset.preview.svg }}
              />
              <Button
                onClick={() => handleDownload(asset.kind, asset.filenameSuffix)}
                disabled={downloadingKey !== null || !patronMenuUrl}
                className="w-full h-11 font-black uppercase text-[10px] tracking-widest gap-2"
              >
                {downloadingKey === asset.kind ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {asset.label}
              </Button>
            </div>
          ))}
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
