'use client'

import { Truck, User, AlertCircle, Loader2 } from 'lucide-react';
import { cn, getDriverColor } from '@/lib/utils';
import { Map, Marker, useMap, useApiIsLoaded, APIProvider } from '@vis.gl/react-google-maps';
import { useEffect, useState } from 'react';

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
  drivers?: {
    id: string;
    name: string;
    location: { latitude: number; longitude: number };
    type: string;
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

/**
 * Internal component to handle map bounds and overlays.
 * Only runs once the API is loaded and the map instance is ready.
 */
function MapElements({ buyerLocation, sellerLocation, sellers, buyers, drivers, radius, zoomMode = 'all', fitTrigger }: Omit<MapViewProps, 'interactive'>) {
  const map = useMap();
  const apiIsLoaded = useApiIsLoaded();

  useEffect(() => {
    // 🌟 CRITICAL: Ensure window.google exists before attempting bounds logic
    if (!map || !apiIsLoaded || typeof window === 'undefined' || !window.google) return;

    const bounds = new window.google.maps.LatLngBounds();
    const hasBuyers = buyers && buyers.length > 0;
    const hasSellers = sellers && sellers.length > 0;
    const hasDrivers = drivers && drivers.length > 0;

    let hasPoints = false;

    if (buyerLocation && sellerLocation) {
      bounds.extend(new window.google.maps.LatLng(sellerLocation.latitude, sellerLocation.longitude));
      bounds.extend(new window.google.maps.LatLng(buyerLocation.latitude, buyerLocation.longitude));
      hasPoints = true;
    } else if (zoomMode === 'all' && (hasBuyers || hasSellers || hasDrivers || sellerLocation)) {
      if (sellerLocation) {
        bounds.extend(new window.google.maps.LatLng(sellerLocation.latitude, sellerLocation.longitude));
        hasPoints = true;
      }
      if (sellers) {
        sellers.forEach(s => {
          bounds.extend(new window.google.maps.LatLng(s.location.latitude, s.location.longitude));
          hasPoints = true;
        });
      }
      if (drivers) {
        drivers.forEach(d => {
          bounds.extend(new window.google.maps.LatLng(d.location.latitude, d.location.longitude));
          hasPoints = true;
        });
      }
      if (buyers) {
        buyers.forEach(buyer => {
          bounds.extend(new window.google.maps.LatLng(buyer.location.latitude, buyer.location.longitude));
          hasPoints = true;
        });
      }
    }

    if (hasPoints) {
      map.fitBounds(bounds, { top: 50, bottom: 50, left: 50, right: 50 });
    } else if (sellerLocation) {
      map.setCenter({ lat: sellerLocation.latitude, lng: sellerLocation.longitude });
      map.setZoom(15);
    }

  }, [map, apiIsLoaded, zoomMode, fitTrigger, buyerLocation?.latitude, buyerLocation?.longitude, sellerLocation?.latitude, sellerLocation?.longitude, buyers?.length, drivers?.length]);

  useEffect(() => {
    if (!map || !apiIsLoaded || !radius || !sellerLocation || !window.google) return;

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
  }, [map, apiIsLoaded, sellerLocation?.latitude, sellerLocation?.longitude, radius]);

  return null;
}

/**
 * The core map rendering logic. 
 * This is separated so it can safely use the useApiIsLoaded hook inside APIProvider.
 */
function MapInternal({ buyerLocation, sellerLocation, showPrimaryMarker, primaryDriverId, sellers, buyers, drivers, radius, zoomMode, interactive, fitTrigger }: MapViewProps) {
  const apiIsLoaded = useApiIsLoaded();
  const center = buyerLocation ? { lat: buyerLocation.latitude, lng: buyerLocation.longitude } : (sellerLocation ? { lat: sellerLocation.latitude, lng: sellerLocation.longitude } : { lat: 0, lng: 0 });

  return (
    <div className="relative w-full h-full bg-[#1a2d44]">
      {!apiIsLoaded && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#1a2d44] text-white gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40">Initializing Satellite Data...</p>
        </div>
      )}

      <Map
        defaultCenter={center}
        defaultZoom={15}
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
          drivers={drivers}
          radius={radius} 
          zoomMode={zoomMode} 
          fitTrigger={fitTrigger}
        />

        {sellers && sellers.map(s => (
          <Marker 
            key={s.id} 
            position={{ lat: s.location.latitude, lng: s.location.longitude }}
            title={s.name}
          />
        ))}

        {/* Driver Pins - Unique Hexagonal Shape */}
        {drivers && drivers.map(driver => (
          <Marker 
            key={driver.id} 
            position={{ lat: driver.location.latitude, lng: driver.location.longitude }}
            title={`${driver.name} (${driver.type})`}
            icon={{
              path: "M 0,-15 L 13,-7.5 L 13,7.5 L 0,15 L -13,7.5 L -13,-7.5 Z", // Pointy top Hexagon
              fillColor: driver.type === 'Beverage Cart' ? '#E50000' : '#4F46E5',
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
              scale: 1,
            }}
          />
        ))}

        {showPrimaryMarker && sellerLocation && (!sellers || !sellers.some(s => s.location.latitude === sellerLocation.latitude && s.location.longitude === sellerLocation.longitude)) && (
          <Marker 
            position={{ lat: sellerLocation.latitude, lng: sellerLocation.longitude }}
            title="Venue/Cart Hub"
          />
        )}

        {buyerLocation && (
          <Marker 
            position={{ lat: buyerLocation.latitude, lng: buyerLocation.longitude }}
            title="Patron Destination"
          />
        )}

        {buyers && buyers.map((buyer, index) => (
          <Marker 
            key={buyer.id} 
            position={{ lat: buyer.location.latitude, lng: buyer.location.longitude }}
            label={{
              text: (index + 1).toString(),
              color: 'white',
              fontSize: '10px',
              fontWeight: '900'
            }}
            title={buyer.name}
          />
        ))}
      </Map>
    </div>
  );
}

export function MapView(props: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const isKeyUnset = !apiKey || apiKey === "REPLACE_WITH_YOUR_KEY_IN_CONSOLE" || apiKey === "";

  if (isKeyUnset) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#1a2d44] text-white p-8 text-center border-4 border-white/5">
        <AlertCircle className="h-12 w-12 text-red-500 mb-6 drop-shadow-xl" />
        <h3 className="font-headline font-black uppercase text-lg mb-2 tracking-tight">Map Service Unavailable</h3>
        <p className="text-[10px] text-white/50 max-w-xs leading-relaxed uppercase font-black tracking-widest">
          Please add a valid Google Maps API Key to your environment variables to enable live delivery tracking.
        </p>
      </div>
    );
  }

  return (
    <APIProvider apiKey={apiKey!}>
      <MapInternal {...props} />
    </APIProvider>
  );
}
