import { Truck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';

interface MapViewProps {
  buyerLocation?: { latitude: number; longitude: number };
  sellerLocation: { latitude: number; longitude: number };
  buyers?: { name: string; location: { latitude: number; longitude: number } }[];
}

export function MapView({ buyerLocation, sellerLocation, buyers }: MapViewProps) {
    const center = buyerLocation ? { lat: buyerLocation.latitude, lng: buyerLocation.longitude } : { lat: sellerLocation.latitude, lng: sellerLocation.longitude };
    
    // Calculate bounds
    const bounds = new window.google.maps.LatLngBounds();
    bounds.extend(new window.google.maps.LatLng(sellerLocation.latitude, sellerLocation.longitude));
    if (buyerLocation) {
        bounds.extend(new window.google.maps.LatLng(buyerLocation.latitude, buyerLocation.longitude));
    }
    if(buyers) {
        buyers.forEach(buyer => {
            bounds.extend(new window.google.maps.LatLng(buyer.location.latitude, buyer.location.longitude));
        });
    }

  return (
    <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-accent/20 shadow-inner">
      <Map
        defaultBounds={bounds}
        mapId="a32a12d8a2a7a8a"
        mapTypeId="satellite"
        disableDefaultUI={true}
      >
        {/* Seller Pin */}
        <AdvancedMarker position={{ lat: sellerLocation.latitude, lng: sellerLocation.longitude }}>
            <div className="flex flex-col items-center">
                <div className="bg-primary p-2 rounded-full shadow-lg">
                    <Truck className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-primary"></div>
            </div>
        </AdvancedMarker>

        {/* Single Buyer Pin */}
        {buyerLocation && (
            <AdvancedMarker position={{ lat: buyerLocation.latitude, lng: buyerLocation.longitude }}>
                <div className="flex flex-col items-center">
                    <div className="bg-accent p-2 rounded-full shadow-lg">
                        <User className="w-5 h-5 text-accent-foreground" />
                    </div>
                    <div className="w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-accent"></div>
                </div>
            </AdvancedMarker>
        )}

        {/* Multiple Buyer Pins (for seller view) */}
        {buyers && buyers.map((buyer, index) => (
            <AdvancedMarker key={buyer.name} position={{ lat: buyer.location.latitude, lng: buyer.location.longitude }}>
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
            </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
}
