'use client';

import { useCallback, useRef, useState } from 'react';
import Image from 'next/image';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useStorage } from '@/firebase';
import { UploadCloud, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ImageUploadDropzoneProps {
  value?: string;
  onChange: (url: string) => void;
  storagePath: string;
  aspectRatio?: number;
  disabled?: boolean;
  className?: string;
}

// Every upload is center-cropped to this aspect ratio (matching the 4:3
// customer-facing menu card) and resized to a fixed width, so a photo shot
// on any phone/tablet, in any orientation, always comes out the same
// consistent size - no manual cropping or "right dimensions" knowledge needed.
const OUTPUT_WIDTH = 1200;

export function ImageUploadDropzone({
  value,
  onChange,
  storagePath,
  aspectRatio = 4 / 3,
  disabled,
  className,
}: ImageUploadDropzoneProps) {
  const storage = useStorage();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const processAndUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Not a Photo', description: 'Please choose an image file (JPG, PNG, HEIC).' });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const outputHeight = Math.round(OUTPUT_WIDTH / aspectRatio);
      const sourceRatio = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (sourceRatio > aspectRatio) {
        sw = img.height * aspectRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / aspectRatio;
        sy = (img.height - sh) / 2;
      }

      const canvas = document.createElement('canvas');
      canvas.width = OUTPUT_WIDTH;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast({ variant: 'destructive', title: 'Could Not Process Photo' });
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_WIDTH, outputHeight);

      canvas.toBlob((blob) => {
        if (!blob) {
          toast({ variant: 'destructive', title: 'Could Not Process Photo' });
          return;
        }

        const fileName = `${crypto.randomUUID()}.jpg`;
        const storageRef = ref(storage, `${storagePath}/${fileName}`);
        const uploadTask = uploadBytesResumable(storageRef, blob, { contentType: 'image/jpeg' });

        setProgress(0);
        uploadTask.on(
          'state_changed',
          (snapshot) => setProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)),
          () => {
            setProgress(null);
            toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not upload the photo. Please try again.' });
          },
          async () => {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            setProgress(null);
            onChange(downloadUrl);
          }
        );
      }, 'image/jpeg', 0.85);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast({ variant: 'destructive', title: 'Unsupported Photo', description: "That file couldn't be read as an image. Try a JPG or PNG." });
    };

    img.src = objectUrl;
  }, [storage, storagePath, aspectRatio, onChange, toast]);

  const handleFiles = useCallback((files: FileList | null) => {
    const file = files?.[0];
    if (file) processAndUpload(file);
  }, [processAndUpload]);

  const isUploading = progress !== null;

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl border-2 border-dashed transition-colors overflow-hidden cursor-pointer",
        isDragging ? "border-primary bg-primary/5" : "border-slate-200 bg-slate-50",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      style={{ aspectRatio: String(aspectRatio) }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !isUploading && inputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
      />

      {value ? (
        <>
          <Image src={value} alt="Uploaded photo" fill className="object-cover" />
          {!disabled && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-4">
          <UploadCloud className="h-6 w-6 text-muted-foreground/40" />
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Drag &amp; Drop a Photo</p>
          <p className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest">or tap to browse &mdash; auto-sized, no editing needed</p>
        </div>
      )}

      {isUploading && (
        <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center gap-2 z-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Uploading {progress}%</p>
        </div>
      )}
    </div>
  );
}
