'use client'

import { Truck, User, AlertCircle, Loader2 } from 'lucide-react';
import { cn, getDriverColor } from '@/lib/utils';
import { Map, Marker, useMap, useApiIsLoaded, APIProvider } from '@vis.gl/react-google-maps';
import { useEffect, useState, useRef, useMemo } from 'react';

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
    colorOverride?: string;
  }[];
  buyers?: {
    id: string;
    name: string;
    location: { latitude: number; longitude: number };
    colorClass?: string;
    colorOverride?: string; // HEX code based on signal freshness
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
  const lastZoomMode = useRef<string | undefined>(undefined);
  const lastFitTime = useRef<number>(0);
  const lastBuyerPos = useRef<string>("");
  const lastSellerPos = useRef<string>("");

  useEffect(() => {
    if (!map || !apiIsLoaded || typeof window === 'undefined' || !window.google) return;

    const isModeChange = lastZoomMode.current !== zoomMode;
    const isExplicitTrigger = fitTrigger !== undefined && fitTrigger > 0;
    const isAutoFitMode = fitTrigger === undefined; 
    
    // Stringify positions for simple diff check
    const currentBuyerPos = buyerLocation ? `${buyerLocation.latitude},${buyerLocation.longitude}` : "";
    const currentSellerPos = sellerLocation ? `${sellerLocation.latitude},${sellerLocation.longitude}` : "";
    const posChanged = currentBuyerPos !== lastBuyerPos.current || currentSellerPos !== lastSellerPos.current;

    // Check if we have meaningful data to fit
    const hasData = (buyerLocation && (sellerLocation || zoomMode === 'radius')) || (sellers && sellers.length > 0) || (buyers && buyers.length > 0) || (drivers && drivers.length > 0) || (sellerLocation && sellerLocation.latitude);
    
    if (!hasData) return;
    
    // Throttle automated fits (max once every 5 seconds) to prevent visual bounce
    const now = Date.now();
    const isThrottled = isAutoFitMode && (now - lastFitTime.current < 5000);
    
    const shouldFit = lastZoomMode.current === undefined || isModeChange || isExplicitTrigger || (isAutoFitMode && posChanged && !isThrottled);
    
    if (!shouldFit) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // PATRON FOCUS MODE: 0.5 Mile Radius Zoom
    if (zoomMode === 'radius' && buyerLocation && radius) {
       const latOffset = radius / 111320; 
       const lngOffset = radius / (111320 * Math.cos(buyerLocation.latitude * (Math.PI / 180)));
       
       bounds.extend(new window.google.maps.LatLng(buyerLocation.latitude + latOffset, buyerLocation.longitude + lngOffset));
       bounds.extend(new window.google.maps.LatLng(buyerLocation.latitude - latOffset, buyerLocation.longitude - lngOffset));
       bounds.extend(new window.google.maps.LatLng(buyerLocation.latitude, buyerLocation.longitude));
       hasPoints = true;
    } 
    // BILATERAL MODE: Fit both Driver and Patron
    else if (buyerLocation && sellerLocation && sellerLocation.latitude && sellerLocation.latitude !== 0) {
      bounds.extend(new window.google.maps.LatLng(sellerLocation.latitude, sellerLocation.longitude));
      bounds.extend(new window.google.maps.LatLng(buyerLocation.latitude, buyerLocation.longitude));
      hasPoints = true;
    } else if (zoomMode === 'all') {
      if (sellerLocation && sellerLocation.latitude && sellerLocation.latitude !== 0) {
        bounds.extend(new window.google.maps.LatLng(sellerLocation.latitude, sellerLocation.longitude));
        hasPoints = true;
      }
      if (sellers) {
        sellers.forEach(s => {
          if (s.location.latitude) {
            bounds.extend(new window.google.maps.LatLng(s.location.latitude, s.location.longitude));
            hasPoints = true;
          }
        });
      }
      if (drivers) {
        drivers.forEach(d => {
          if (d.location.latitude) {
            bounds.extend(new window.google.maps.LatLng(d.location.latitude, d.location.longitude));
            hasPoints = true;
          }
        });
      }
      if (buyers) {
        buyers.forEach(buyer => {
          if (buyer.location.latitude) {
            bounds.extend(new window.google.maps.LatLng(buyer.location.latitude, buyer.location.longitude));
            hasPoints = true;
          }
        });
      }
    }

    if (hasPoints) {
      map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
      lastZoomMode.current = zoomMode;
      lastFitTime.current = now;
      lastBuyerPos.current = currentBuyerPos;
      lastSellerPos.current = currentSellerPos;
    } else if (sellerLocation && sellerLocation.latitude && sellerLocation.latitude !== 0) {
      map.setCenter({ lat: sellerLocation.latitude, lng: sellerLocation.longitude });
      map.setZoom(15);
      lastZoomMode.current = zoomMode;
      lastFitTime.current = now;
    }

  }, [map, apiIsLoaded, zoomMode, fitTrigger, buyerLocation, sellerLocation, radius, sellers, buyers, drivers]);

  useEffect(() => {
    if (!map || !apiIsLoaded || !radius || !buyerLocation || !window.google) return;

    const circle = new window.google.maps.Circle({
      strokeColor: "#E50000",
      strokeOpacity: 0.6,
      strokeWeight: 1,
      fillColor: "#E50000",
      fillOpacity: 0.1,
      map,
      center: { lat: buyerLocation.latitude, lng: buyerLocation.longitude },
      radius: radius,
    });

    return () => {
      circle.setMap(null);
    };
  }, [map, apiIsLoaded, buyerLocation?.latitude, buyerLocation?.longitude, radius]);

  return null;
}

/**
 * The core map rendering logic. 
 */
function MapInternal({ buyerLocation, sellerLocation, showPrimaryMarker, primaryDriverId, sellers, buyers, drivers, radius, zoomMode, interactive, fitTrigger }: MapViewProps) {
  const apiIsLoaded = useApiIsLoaded();
  const center = useMemo(() => 
    buyerLocation ? { lat: buyerLocation.latitude, lng: buyerLocation.longitude } : (sellerLocation ? { lat: sellerLocation.latitude, lng: sellerLocation.longitude } : { lat: 0, lng: 0 }),
  [buyerLocation, sellerLocation]);

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
            key={`seller-${s.id}`} 
            position={{ lat: s.location.latitude, lng: s.location.longitude }}
            title={s.name}
          />
        ))}

        {/* Driver Pins - Unique Hexagonal Shape with Dynamic Color-Coding */}
        {drivers && drivers.map(driver => {
          const hexPath = "M 0,-15 L 13,-7.5 L 13,7.5 L 0,15 L -13,7.5 L -13,-7.5 Z";
          return (
            <Marker 
              key={`driver-item-${driver.id}`} 
              position={{ lat: driver.location.latitude, lng: driver.location.longitude }}
              title={`${driver.name} (${driver.type})`}
              icon={{
                path: hexPath,
                fillColor: driver.colorOverride || (driver.type === 'Beverage Cart' ? '#E50000' : '#4F46E5'),
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
                scale: 1,
              }}
            />
          );
        })}

        {/* Local Primary Driver Marker */}
        {sellerLocation && sellerLocation.latitude && sellerLocation.latitude !== 0 && (
          <Marker 
            key="primary-seller-marker"
            position={{ lat: sellerLocation.latitude, lng: sellerLocation.longitude }}
            title="Delivery Driver"
            icon={{
              path: "M 0,-15 L 13,-7.5 L 13,7.5 L 0,15 L -13,7.5 L -13,-7.5 Z",
              fillColor: '#4F46E5', 
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#FFFFFF',
              scale: 0.8,
            }}
          />
        )}

        {buyerLocation && (
          <Marker 
            key="primary-buyer-marker"
            position={{ lat: buyerLocation.latitude, lng: buyerLocation.longitude }}
            title="Your Location"
          />
        )}

        {/* Patron Markers - Circular symbols with freshness-aware coloring and order index */}
        {buyers && buyers.map((buyer, index) => {
          if (!apiIsLoaded || typeof window === 'undefined' || !window.google) return null;
          
          return (
            <Marker 
              key={`buyer-list-${buyer.id}`} 
              position={{ lat: buyer.location.latitude, lng: buyer.location.longitude }}
              label={{
                text: (index + 1).toString(),
                color: 'white',
                fontSize: '10px',
                fontWeight: '900'
              }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: buyer.colorOverride || '#E50000',
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#FFFFFF',
                scale: 11,
                labelOrigin: new window.google.maps.Point(0, 0)
              }}
              title={buyer.name}
            />
          );
        })}
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
