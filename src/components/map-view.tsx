'use client'

import { Truck, User } from 'lucide-react';
import { cn, getDriverColor } from '@/lib/utils';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { useEffect } from 'react';

// Static mapping for Tailwind JIT to pick up dynamic classes
const DRIVER_COLOR_CONFIG: Record<string, { bg: string, border: string, text: string, arrow: string }> = {
  'indigo-600': { bg: 'bg-indigo-600', border: 'border-indigo-600', text: 'text-indigo-600', arrow: 'border-t-indigo-600' },
  'blue-600': { bg: 'bg-blue-600', border: 'border-blue-600', text: 'text-blue-600', arrow: 'border-t-blue-600' },
  'purple-600': { bg: 'bg-purple-600', border: 'border-purple-600', text: 'text-purple-600', arrow: 'border-t-purple-600' },
  'pink-600': { bg: 'bg-pink-600', border: 'border-pink-600', text: 'text-pink-600', arrow: 'border-t-pink-600' },
  'cyan-600': { bg: 'bg-cyan-600', border: 'border-cyan-600', text: 'text-cyan-600', arrow: 'border-t-cyan-600' },
  'fuchsia-600': { bg: 'bg-fuchsia-600', border: 'border-fuchsia-600', text: 'text-fuchsia-600', arrow: 'border-t-fuchsia-600' },
  'violet-600': { bg: 'bg-violet-600', border: 'border-violet-600', text: 'text-violet-600', arrow: 'border-t-violet-600' },
};

interface MapViewProps {
  buyerLocation?: { latitude: number; longitude: number };
  sellerLocation?: { latitude: number; longitude: number };
  showPrimaryMarker?: boolean;
  primaryDriverId?: string;
  sellers?: {
    id: string;
    name: string;
    location: { latitude: number; longitude: number };
  }[];
  buyers?: {
    id: string;
    name: string;
    location: { latitude: number; longitude: number };
    colorClass?: string;
    assignedDriverId?: string;
  }[];
  radius?: number; // in meters
  zoomMode?: 'radius' | 'all';
  interactive?: boolean;
  fitTrigger?: number; // A value that triggers a re-fit when changed
}

function MapElements({ buyerLocation, sellerLocation, sellers, buyers, radius, zoomMode = 'all', fitTrigger }: Omit<MapViewProps, 'interactive'>) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    const bounds = new window.google.maps.LatLngBounds();
    const hasBuyers = buyers && buyers.length > 0;
    const hasSellers = sellers && sellers.length > 0;

    if (buyerLocation && sellerLocation) {
      bounds.extend(new window.google.maps.LatLng(sellerLocation.latitude, sellerLocation.longitude));
      bounds.extend(new window.google.maps.LatLng(buyerLocation.latitude, buyerLocation.longitude));
      map.fitBounds(bounds, 50);

    } else if (zoomMode === 'all' && (hasBuyers || hasSellers || sellerLocation)) {
      if (sellerLocation) {
        bounds.extend(new window.google.maps.LatLng(sellerLocation.latitude, sellerLocation.longitude));
      }
      if (sellers) {
        sellers.forEach(s => {
          bounds.extend(new window.google.maps.LatLng(s.location.latitude, s.location.longitude));
        });
      }
      if (buyers) {
        buyers.forEach(buyer => {
          bounds.extend(new window.google.maps.LatLng(buyer.location.latitude, buyer.location.longitude));
        });
      }
      map.fitBounds(bounds, 100);

    } else if (sellerLocation) {
      map.setCenter({ lat: sellerLocation.latitude, lng: sellerLocation.longitude });
      // Zoom 15 is roughly a 1-mile radius view on satellite maps
      map.setZoom(15);
    }

  }, [map, zoomMode, fitTrigger]); // Only re-fit camera when map is ready, mode changes, or explicit trigger

  useEffect(() => {
    if (!map || !radius || !sellerLocation) return;

    const circle = new window.google.maps.Circle({
      strokeColor: "#E50000",
      strokeOpacity: 0.6,
      strokeWeight: 1,
      fillColor: "#E50000",
      fillOpacity: 0.1,
      map,
      center: { lat: sellerLocation.latitude, lng: sellerLocation.longitude },
      radius: radius,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, sellerLocation, radius]); // Circle follows location, but doesn't move camera


  return null;
}


export function MapView({ buyerLocation, sellerLocation, showPrimaryMarker = true, primaryDriverId = 'demo-course', sellers, buyers, radius, zoomMode, interactive = true, fitTrigger }: MapViewProps) {
  const center = buyerLocation ? { lat: buyerLocation.latitude, lng: buyerLocation.longitude } : (sellerLocation ? { lat: sellerLocation.latitude, lng: sellerLocation.longitude } : { lat: 0, lng: 0 });

  return (
    <div className="relative w-full h-full">
      <Map
        defaultCenter={center}
        defaultZoom={12}
        mapId="a32a12d8a2a7a8a"
        mapTypeId="satellite"
        disableDefaultUI={!interactive}
        gestureHandling={interactive ? 'auto' : 'none'}
        zoomControl={interactive}
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={false}
      >
        <MapElements 
          sellerLocation={sellerLocation} 
          buyerLocation={buyerLocation} 
          sellers={sellers} 
          buyers={buyers} 
          radius={radius} 
          zoomMode={zoomMode} 
          fitTrigger={fitTrigger}
        />

        {/* Render all Sellers (Drivers) */}
        {sellers && sellers.map(s => {
          const driverColor = getDriverColor(s.id);
          const config = DRIVER_COLOR_CONFIG[driverColor];
          if (!config) return null;

          return (
            <AdvancedMarker key={s.id} position={{ lat: s.location.latitude, lng: s.location.longitude }}>
              <div className="flex flex-col items-center">
                <div className={cn("p-2 rounded-full shadow-lg border-2 border-white", config.bg)}>
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <div className={cn("w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8", config.arrow)}></div>
              </div>
            </AdvancedMarker>
          );
        })}

        {/* Primary Seller Pin */}
        {showPrimaryMarker && sellerLocation && (!sellers || !sellers.some(s => s.location.latitude === sellerLocation.latitude && s.location.longitude === sellerLocation.longitude)) && (
          <AdvancedMarker position={{ lat: sellerLocation.latitude, lng: sellerLocation.longitude }}>
            {(() => {
              const driverColor = getDriverColor(primaryDriverId);
              const config = DRIVER_COLOR_CONFIG[driverColor];
              if (!config) return null;
              return (
                <div className="flex flex-col items-center">
                  <div className={cn("p-2 rounded-full shadow-lg border-2 border-white", config.bg)}>
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div className={cn("w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8", config.arrow)}></div>
                </div>
              );
            })()}
          </AdvancedMarker>
        )}

        {/* Single Buyer Pin (for order tracking view) */}
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

        {/* Multiple Buyer Pins (for ops view) */}
        {buyers && buyers.map((buyer, index) => {
          const statusColorClass = buyer.colorClass || "bg-accent";
          const assignedDriverColor = buyer.assignedDriverId ? getDriverColor(buyer.assignedDriverId) : null;
          const assignedStyles = assignedDriverColor ? DRIVER_COLOR_CONFIG[assignedDriverColor] : null;

          // The inside (background) uses the time-based color (green/yellow/red)
          const bgClass = statusColorClass;
          
          // The outline (border) matches the driver color if assigned, else white/accent
          const borderClass = assignedStyles ? `border-4 ${assignedStyles.border}` : 'border-4 border-white';
          const textClass = 'text-white';
          const arrowClass = assignedStyles ? assignedStyles.arrow : statusColorClass.replace('bg-', 'border-t-');

          return (
            <AdvancedMarker key={buyer.id} position={{ lat: buyer.location.latitude, lng: buyer.location.longitude }}>
              <div className="flex flex-col items-center">
                <div className={cn(
                  "flex items-center justify-center w-11 h-11 rounded-full shadow-2xl font-black transition-all duration-500",
                  bgClass,
                  borderClass,
                  textClass
                )}>
                  {index + 1}
                </div>
                <div className={cn(
                  "w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] transition-all duration-500 -mt-1",
                  arrowClass
                )}></div>
              </div>
            </AdvancedMarker>
          );
        })}
      </Map>
    </div>
  );
}
