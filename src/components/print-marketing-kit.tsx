'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { doc } from 'firebase/firestore';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Loader2, Sticker } from 'lucide-react';
import type { SolutionConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  buildPosterSvg,
  buildTableTentSvg,
  fetchAsDataUrl,
  downloadTemplateAsPdf,
  type PrintAssetTemplate,
  type PrintVenueType,
} from '@/lib/print-assets';
import {
  buildCartStickerHtml,
  buildYardSignHtml,
  buildDefaultKoopLogoDataUri,
  renderTemplatePreview,
  renderTemplateToPdfBlob,
  CART_STICKER_DIMENSIONS,
  YARD_SIGN_DIMENSIONS,
} from '@/lib/print-templates';

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

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PrintMarketingKit({ courseName, patronMenuUrl, venueType = 'Golf Course' }: PrintMarketingKitProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [downloadingKey, setDownloadingKey] = useState<DownloadKind | null>(null);
  const [htmlPreviews, setHtmlPreviews] = useState<{ sticker: string | null; sign: string | null }>({ sticker: null, sign: null });

  const configRef = useMemoFirebase(() => (firestore ? doc(firestore, 'solution', 'config') : null), [firestore]);
  const { data: config } = useDoc<SolutionConfig>(configRef);

  const posterVenueType: PrintVenueType = venueType === 'Bowling Center' ? 'bowling' : 'golf';
  const displayName = courseName || (posterVenueType === 'bowling' ? 'Your Bowling Center' : 'Your Golf Club');
  const previewQrUrl = patronMenuUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(patronMenuUrl)}&ecc=H`
    : '';
  const previewInput = { courseName: displayName, qrDataUrl: previewQrUrl, logoDataUrl: config?.logoUrl };

  const posterPreview = useMemo(() => buildPosterSvg(previewInput, posterVenueType), [displayName, previewQrUrl, config?.logoUrl, posterVenueType]);
  const tableTentPreview = useMemo(() => buildTableTentSvg(previewInput), [displayName, previewQrUrl]);

  // The new sticker/sign templates are real HTML/CSS (web fonts, flexbox),
  // not SVG, so they can't be dropped straight into the DOM like the poster
  // and table tent previews below - they're rendered off-screen to a PNG
  // first (see print-templates.ts) and shown as an <img>.
  useEffect(() => {
    if (venueType !== 'Golf Course' || !previewQrUrl) return;
    let cancelled = false;
    const logoDataUrl = config?.logoUrl || buildDefaultKoopLogoDataUri('#FFFFFF');
    (async () => {
      const [stickerUrl, signUrl] = await Promise.all([
        renderTemplatePreview(buildCartStickerHtml({ venueName: displayName, qrDataUrl: previewQrUrl, logoDataUrl }), CART_STICKER_DIMENSIONS, false).catch(() => null),
        renderTemplatePreview(buildYardSignHtml({ venueName: displayName, qrDataUrl: previewQrUrl, logoDataUrl }), YARD_SIGN_DIMENSIONS, true).catch(() => null),
      ]);
      if (!cancelled) setHtmlPreviews({ sticker: stickerUrl, sign: signUrl });
    })();
    return () => { cancelled = true; };
  }, [venueType, displayName, previewQrUrl, config?.logoUrl]);

  const otherAssets: DownloadableAsset[] = venueType === 'Bowling Center'
    ? [
        { kind: 'tableTent', label: 'Table Tent (5"×7" PDF)', filenameSuffix: 'Table_Tent', preview: tableTentPreview, previewMaxWidthClass: 'max-w-[220px] mx-auto' },
        { kind: 'poster', label: 'Poster (11"×17" PDF)', filenameSuffix: 'Poster', preview: posterPreview, previewMaxWidthClass: 'max-w-[240px] mx-auto' },
      ]
    : [
        { kind: 'poster', label: 'Poster (11"×17" PDF)', filenameSuffix: 'Poster', preview: posterPreview, previewMaxWidthClass: 'max-w-[240px] mx-auto' },
      ];

  const handleDownload = async (kind: DownloadKind, filenameSuffix: string) => {
    if (!patronMenuUrl) {
      toast({ variant: 'destructive', title: 'Access Key Missing', description: 'Activate the QR access key before generating print assets.' });
      return;
    }
    setDownloadingKey(kind);
    try {
      const safeName = displayName.replace(/\s+/g, '_');
      if (kind === 'sticker' || kind === 'sign') {
        const fullQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(patronMenuUrl)}&ecc=H`;
        const [qrDataUrl, logoDataUrl] = await Promise.all([
          fetchAsDataUrl(fullQrUrl),
          config?.logoUrl ? fetchAsDataUrl(config.logoUrl).catch(() => buildDefaultKoopLogoDataUri('#FFFFFF')) : Promise.resolve(buildDefaultKoopLogoDataUri('#FFFFFF')),
        ]);
        const html = kind === 'sticker'
          ? buildCartStickerHtml({ venueName: displayName, qrDataUrl, logoDataUrl })
          : buildYardSignHtml({ venueName: displayName, qrDataUrl, logoDataUrl });
        const dims = kind === 'sticker' ? CART_STICKER_DIMENSIONS : YARD_SIGN_DIMENSIONS;
        const blob = await renderTemplateToPdfBlob(html, dims, kind === 'sign');
        downloadBlob(blob, `${safeName}_${filenameSuffix}.pdf`);
      } else {
        const fullQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(patronMenuUrl)}&ecc=H`;
        const [qrDataUrl, logoDataUrl] = await Promise.all([
          fetchAsDataUrl(fullQrUrl),
          config?.logoUrl ? fetchAsDataUrl(config.logoUrl).catch(() => undefined) : Promise.resolve(undefined),
        ]);
        const input = { courseName: displayName, qrDataUrl, logoDataUrl };
        const template: PrintAssetTemplate = kind === 'tableTent' ? buildTableTentSvg(input) : buildPosterSvg(input, posterVenueType);
        await downloadTemplateAsPdf(template, `${safeName}_${filenameSuffix}.pdf`);
      }
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
        <div className={`grid grid-cols-1 gap-8 ${venueType === 'Golf Course' ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
          {venueType === 'Golf Course' && (
            <>
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-white aspect-[7/5] flex items-center justify-center">
                  {htmlPreviews.sticker ? <img src={htmlPreviews.sticker} alt="Cart sticker preview" className="w-full h-auto block" /> : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                </div>
                <Button
                  onClick={() => handleDownload('sticker', 'Cart_Sticker')}
                  disabled={downloadingKey !== null || !patronMenuUrl}
                  className="w-full h-11 font-black uppercase text-[10px] tracking-widest gap-2"
                >
                  {downloadingKey === 'sticker' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Golf Cart Sticker (7&quot;&times;5&quot; PDF)
                </Button>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-white max-w-[240px] mx-auto aspect-[24/18] flex items-center justify-center">
                  {htmlPreviews.sign ? <img src={htmlPreviews.sign} alt="Yard sign preview" className="w-full h-auto block" /> : <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
                </div>
                <Button
                  onClick={() => handleDownload('sign', 'Yard_Sign')}
                  disabled={downloadingKey !== null || !patronMenuUrl}
                  className="w-full h-11 font-black uppercase text-[10px] tracking-widest gap-2"
                >
                  {downloadingKey === 'sign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Yard Sign (24&quot;&times;18&quot; PDF)
                </Button>
              </div>
            </>
          )}
          {otherAssets.map((asset) => (
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
