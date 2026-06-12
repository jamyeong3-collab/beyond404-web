"use client";

import L from "leaflet";
import { MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import { useEffect, useMemo } from "react";

type Coordinates = {
  lat: number;
  lng: number;
};

type MarkerConfig = {
  key: string;
  position: Coordinates;
  variant: "pickup" | "crew" | "hub";
  label?: string;
};

type LeafletTrackingMapProps = {
  center: Coordinates;
  markers: MarkerConfig[];
  path?: Coordinates[];
  className?: string;
  zoom?: number;
};

function createMarkerIcon(variant: MarkerConfig["variant"], label = "") {
  const safeLabel = label.slice(0, 1).toUpperCase();
  return L.divIcon({
    className: "",
    html: `<div class="swapit-map-marker swapit-map-marker--${variant}">${safeLabel}</div>`,
    iconSize: variant === "pickup" ? [20, 20] : [22, 22],
    iconAnchor: variant === "pickup" ? [10, 10] : [11, 11],
  });
}

function MapViewport({
  center,
  markers,
  path,
  zoom,
}: {
  center: Coordinates;
  markers: MarkerConfig[];
  path: Coordinates[];
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    const points = [...markers.map((marker) => marker.position), ...path];
    if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]));
      map.fitBounds(bounds, { padding: [36, 36] });
      return;
    }

    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center, map, markers, path, zoom]);

  return null;
}

export function LeafletTrackingMap({
  center,
  markers,
  path = [],
  className,
  zoom = 16,
}: LeafletTrackingMapProps) {
  const normalizedPath = useMemo(() => path.filter(Boolean), [path]);

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      className={className}
      scrollWheelZoom
      zoom={zoom}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {markers.map((marker) => (
        <Marker
          icon={createMarkerIcon(marker.variant, marker.label)}
          key={marker.key}
          position={[marker.position.lat, marker.position.lng]}
        />
      ))}
      {normalizedPath.length > 1 ? (
        <Polyline
          color="#19c6bf"
          pathOptions={{ opacity: 0.9, weight: 5 }}
          positions={normalizedPath.map((point) => [point.lat, point.lng] as [number, number])}
        />
      ) : null}
      <MapViewport center={center} markers={markers} path={normalizedPath} zoom={zoom} />
    </MapContainer>
  );
}
