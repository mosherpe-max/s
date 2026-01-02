import Image from 'next/image';
import type { ImagePlaceholder } from '@/lib/placeholder-images';
import { Truck, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapViewProps {
  buyerLocation?: { latitude: number; longitude: number };
  sellerLocation: { latitude: number; longitude: number };
  mapImage: ImagePlaceholder;
  buyers?: { name: string; location: { latitude: number; longitude: number } }[];
}

// These are arbitrary conversions for placing pins on a static image.
// In a real map, you'd use the map library's coordinate system.
const latToY = (lat: number) => (34.056 - lat) * 100000;
const lonToX = (lon: number) => (lon - (-118.252)) * 100000;


export function MapView({ buyerLocation, sellerLocation, mapImage, buyers }: MapViewProps) {
  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-accent/20 shadow-inner">
      <Image
        src={mapImage.imageUrl}
        alt={mapImage.description}
        fill
        className="object-cover"
        data-ai-hint={mapImage.imageHint}
      />
      
      {/* Seller Pin */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-full"
        style={{ top: `${latToY(sellerLocation.latitude)}%`, left: `${lonToX(sellerLocation.longitude)}%` }}
      >
        <div className="flex flex-col items-center">
            <div className="bg-primary p-2 rounded-full shadow-lg">
                <Truck className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-primary"></div>
        </div>
      </div>

      {/* Single Buyer Pin */}
      {buyerLocation && (
         <div
            className="absolute transform -translate-x-1/2 -translate-y-full"
            style={{ top: `${latToY(buyerLocation.latitude)}%`, left: `${lonToX(buyerLocation.longitude)}%` }}
        >
             <div className="flex flex-col items-center">
                <div className="bg-accent p-2 rounded-full shadow-lg">
                    <User className="w-5 h-5 text-accent-foreground" />
                </div>
                <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-accent"></div>
            </div>
        </div>
      )}

      {/* Multiple Buyer Pins (for seller view) */}
      {buyers && buyers.map((buyer, index) => (
        <div
            key={buyer.name}
            className="absolute transform -translate-x-1/2 -translate-y-full"
            style={{ top: `${latToY(buyer.location.latitude)}%`, left: `${lonToX(buyer.location.longitude)}%` }}
        >
            <div className="flex flex-col items-center">
                <div className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-full shadow-lg font-bold text-accent-foreground",
                    index % 2 === 0 ? "bg-accent" : "bg-secondary text-secondary-foreground"
                )}>
                    {index + 1}
                </div>
                <div className={cn(
                    "w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8",
                     index % 2 === 0 ? "border-t-accent" : "border-t-secondary"
                )}></div>
            </div>
        </div>
      ))}
    </div>
  );
}
