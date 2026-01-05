'use client'

import { Truck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';

interface MapViewProps {
  buyerLocation?: { latitude: number; longitude: number };
  sellerLocation: { latitude: number; longitude: number };
  buyers?: { name: string; location: { latitude: number; longitude: number } }[];
  radius?: number; // in meters
}

function MapElements({ buyerLocation, sellerLocation, buyers, radius }: MapViewProps) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

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
        
        if (radius) {
            // If there's a radius, we can use it to set the bounds
            const circle = new window.google.maps.Circle({
                center: { lat: sellerLocation.latitude, lng: sellerLocation.longitude },
                radius: radius,
            });
            bounds.union(circle.getBounds()!);
        }
        
        map.fitBounds(bounds);

    }, [map, buyerLocation, sellerLocation, buyers, radius]);

    // Draw Circle
    useEffect(() => {
      if (!map || !radius) return;

      const circle = new window.google.maps.Circle({
          strokeColor: "hsl(var(--accent))",
          strokeOpacity: 0.8,
          strokeWeight: 2,
          fillColor: "hsl(var(--accent))",
          fillOpacity: 0.2,
          map,
          center: { lat: sellerLocation.latitude, lng: sellerLocation.longitude },
          radius: radius,
      });

      return () => {
          circle.setMap(null);
      };
    }, [map, sellerLocation, radius]);


    return null;
}


export function MapView({ buyerLocation, sellerLocation, buyers, radius }: MapViewProps) {
    const center = buyerLocation ? { lat: buyerLocation.latitude, lng: buyerLocation.longitude } : { lat: sellerLocation.latitude, lng: sellerLocation.longitude };
    
  return (
    <div className="relative w-full h-full">
      <Map
        defaultCenter={center}
        defaultZoom={12}
        mapId="a32a12d8a2a7a8a"
        mapTypeId="satellite"
        disableDefaultUI={true}
      >
        <MapElements sellerLocation={sellerLocation} buyerLocation={buyerLocation} buyers={buyers} radius={radius} />
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
                        "bg-accent"
                    )}>
                        {index + 1}
                    </div>
                    <div className={cn(
                        "w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8",
                        "border-t-accent"
                    )}></div>
                </div>
            </AdvancedMarker>
        ))}
      </Map>
    </div>
  );
}
