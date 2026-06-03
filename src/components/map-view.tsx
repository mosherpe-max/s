'use client'

import { Truck, User, AlertCircle } from 'lucide-react';
import { cn, getDriverColor } from '@/lib/utils';
import { Map, Marker, useMap } from '@vis.gl/react-google-maps';
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
      map.setZoom(15);
    }

  }, [map, zoomMode, fitTrigger, buyerLocation?.latitude, buyerLocation?.longitude, sellerLocation?.latitude, sellerLocation?.longitude, buyers?.length]);

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
  }, [map, sellerLocation?.latitude, sellerLocation?.longitude, radius]);

  return null;
}

export function MapView({ buyerLocation, sellerLocation, showPrimaryMarker = true, primaryDriverId = 'demo-course', sellers, buyers, radius, zoomMode, interactive = true, fitTrigger }: MapViewProps) {
  const center = buyerLocation ? { lat: buyerLocation.latitude, lng: buyerLocation.longitude } : (sellerLocation ? { lat: sellerLocation.latitude, lng: sellerLocation.longitude } : { lat: 0, lng: 0 });
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const isKeyUnset = !apiKey || apiKey === "REPLACE_WITH_YOUR_KEY_IN_CONSOLE";

  if (isKeyUnset) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="font-headline font-black uppercase text-lg mb-2">Google Maps Key Required</h3>
        <p className="text-xs text-slate-400 max-w-xs leading-relaxed uppercase font-bold">
          Please add your Google Maps API Key to the project configuration to enable live tracking and navigation.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
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

        {showPrimaryMarker && sellerLocation && (!sellers || !sellers.some(s => s.location.latitude === sellerLocation.latitude && s.location.longitude === sellerLocation.longitude)) && (
          <Marker 
            position={{ lat: sellerLocation.latitude, lng: sellerLocation.longitude }}
            title="Your Location"
          />
        )}

        {buyerLocation && (
          <Marker 
            position={{ lat: buyerLocation.latitude, lng: buyerLocation.longitude }}
            title="Patron Location"
          />
        )}

        {buyers && buyers.map((buyer, index) => (
          <Marker 
            key={buyer.id} 
            position={{ lat: buyer.location.latitude, lng: buyer.location.longitude }}
            label={(index + 1).toString()}
            title={buyer.name}
          />
        ))}
      </Map>
    </div>
  );
}
