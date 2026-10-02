import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, useMap, Pin, InfoWindow } from '@vis.gl/react-google-maps';
import type { OptimizeResponse } from '../types';

interface Props {
  result: OptimizeResponse | null;
  apiKey: string;
}

const ROUTE_COLORS = ['#4285F4', '#EA4335', '#FBBC04', '#34A853', '#FF6D01', '#46BDC6', '#7B1FA2', '#C2185B'];

const MapContent: React.FC<{ result: OptimizeResponse | null }> = ({ result }) => {
  const map = useMap();
  const [openInfoWindow, setOpenInfoWindow] = useState<string | null>(null);
  const [polylines, setPolylines] = useState<google.maps.Polyline[]>([]);

  useEffect(() => {
    if (!map) return;

    polylines.forEach(p => p.setMap(null));
    const newPolylines: google.maps.Polyline[] = [];

    if (result && result.routes.length > 0) {
      const bounds = new google.maps.LatLngBounds();

      result.routes.forEach((route, idx) => {
        const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];

        bounds.extend({ lat: route.origin.lat, lng: route.origin.lng });
        bounds.extend({ lat: route.destination.lat, lng: route.destination.lng });
        route.pickup_points.forEach(p => bounds.extend({ lat: p.location.lat, lng: p.location.lng }));

        if (route.polyline && window.google?.maps?.geometry) {
          try {
            const path = google.maps.geometry.encoding.decodePath(route.polyline);
            const polyline = new google.maps.Polyline({
              path,
              strokeColor: color,
              strokeOpacity: 0.8,
              strokeWeight: 5,
              map
            });
            newPolylines.push(polyline);
          } catch (e) {
            console.error('Failed to decode polyline', e);
          }
        }
      });

      map.fitBounds(bounds, 50);
      setPolylines(newPolylines);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, result]);

  return (
    <>
      {result?.routes.map((route, i) => (
        <React.Fragment key={`route-${i}`}>
          <AdvancedMarker position={{ lat: route.origin.lat, lng: route.origin.lng }} onClick={() => setOpenInfoWindow(`origin-${i}`)}>
            <Pin background={ROUTE_COLORS[i % ROUTE_COLORS.length]} borderColor={'#000'} glyphColor={'#fff'}>🚗</Pin>
          </AdvancedMarker>
          {openInfoWindow === `origin-${i}` && (
            <InfoWindow position={{ lat: route.origin.lat, lng: route.origin.lng }} onCloseClick={() => setOpenInfoWindow(null)}>
              <div><strong>{route.driver_name}の出発地</strong><br/>{route.origin.address}</div>
            </InfoWindow>
          )}

          {route.pickup_points.map((pickup, pIdx) => (
            <React.Fragment key={`pickup-${i}-${pIdx}`}>
              <AdvancedMarker position={{ lat: pickup.location.lat, lng: pickup.location.lng }} onClick={() => setOpenInfoWindow(`pickup-${i}-${pIdx}`)}>
                <Pin background={'#34A853'} borderColor={'#000'} glyphColor={'#fff'}>📍</Pin>
              </AdvancedMarker>
              {openInfoWindow === `pickup-${i}-${pIdx}` && (
                <InfoWindow position={{ lat: pickup.location.lat, lng: pickup.location.lng }} onCloseClick={() => setOpenInfoWindow(null)}>
                  <div><strong>{pickup.poi_name}</strong><br/>{pickup.location.address}<br/>同乗者: {pickup.assigned_passengers.join(', ')}</div>
                </InfoWindow>
              )}
            </React.Fragment>
          ))}

          <AdvancedMarker position={{ lat: route.destination.lat, lng: route.destination.lng }} onClick={() => setOpenInfoWindow(`dest-${i}`)}>
             <Pin background={'#EA4335'} borderColor={'#000'} glyphColor={'#fff'}>🏁</Pin>
          </AdvancedMarker>
          {openInfoWindow === `dest-${i}` && (
            <InfoWindow position={{ lat: route.destination.lat, lng: route.destination.lng }} onCloseClick={() => setOpenInfoWindow(null)}>
              <div><strong>目的地</strong><br/>{route.destination.address}</div>
            </InfoWindow>
          )}
        </React.Fragment>
      ))}
    </>
  );
}

export const MapView: React.FC<Props> = ({ result, apiKey }) => {
  if (!apiKey) {
    return (
      <div className="w-full h-full bg-gray-100 rounded-xl overflow-hidden shadow-sm flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">🗺️</div>
          <p>VITE_GOOGLE_MAPS_API_KEY を設定すると地図が表示されます</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-100 rounded-xl overflow-hidden shadow-sm">
      <APIProvider apiKey={apiKey} libraries={['geometry']}>
        <Map defaultCenter={{ lat: 35.6762, lng: 139.6503 }} defaultZoom={10} mapId="carpool-map">
          <MapContent result={result} />
        </Map>
      </APIProvider>
    </div>
  );
};
