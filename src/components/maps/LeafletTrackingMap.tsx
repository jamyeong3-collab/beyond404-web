"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  maxZoom?: number;
  minZoom?: number;
  onMapClick?: (coordinates: Coordinates) => void;
  zoom?: number;
};

type GoogleMapsApi = any;

declare global {
  interface Window {
    google?: GoogleMapsApi;
    __swapitGoogleMapsPromise?: Promise<GoogleMapsApi>;
  }
}

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

function loadGoogleMaps(): Promise<GoogleMapsApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only be loaded in the browser"));
  }

  if (window.google?.maps) {
    return Promise.resolve(window.google);
  }

  if (!googleMapsApiKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing"));
  }

  if (!window.__swapitGoogleMapsPromise) {
    window.__swapitGoogleMapsPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector<HTMLScriptElement>("script[data-swapit-google-maps]");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.google));
        existingScript.addEventListener("error", () => reject(new Error("Google Maps script failed to load")));
        return;
      }

      const script = document.createElement("script");
      const params = new URLSearchParams({
        key: googleMapsApiKey,
        language: "ko",
        region: "IN",
        v: "weekly",
      });

      script.async = true;
      script.dataset.swapitGoogleMaps = "true";
      script.defer = true;
      script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error("Google Maps script failed to load"));
      document.head.appendChild(script);
    });
  }

  return window.__swapitGoogleMapsPromise;
}

function markerColor(variant: MarkerConfig["variant"]) {
  if (variant === "crew") return "#c1003f";
  if (variant === "hub") return "#16a34a";
  return "#2563eb";
}

function markerScale(variant: MarkerConfig["variant"]) {
  return variant === "pickup" ? 11 : 12;
}

function createMarkerIcon(googleApi: GoogleMapsApi, variant: MarkerConfig["variant"]) {
  return {
    fillColor: markerColor(variant),
    fillOpacity: 1,
    path: googleApi.maps.SymbolPath.CIRCLE,
    scale: markerScale(variant),
    strokeColor: "#ffffff",
    strokeWeight: 3,
  };
}

function createMarkerLabel(label?: string) {
  const safeLabel = (label ?? "").slice(0, 1).toUpperCase();
  if (!safeLabel) return undefined;

  return {
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "800",
    text: safeLabel,
  };
}

function MapResizer() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const refresh = () => {
      window.requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    refresh();
    const timer = window.setTimeout(refresh, 180);
    const observer = new ResizeObserver(() => refresh());
    observer.observe(container);

    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [map]);

  return null;
}

export function LeafletTrackingMap({
  center,
  markers,
  path = [],
  className,
  maxZoom = 22,
  minZoom = 3,
  onMapClick,
  zoom = 17,
}: LeafletTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRefs = useRef<Map<string, any>>(new Map());
  const polylineRef = useRef<any>(null);
  const clickListenerRef = useRef<any>(null);
  const mapInteractionListenersRef = useRef<any[]>([]);
  const initializedRef = useRef(false);
  const userInteractedRef = useRef(false);
  const autoAdjustingRef = useRef(false);
  const [loadError, setLoadError] = useState("");
  const normalizedPath = useMemo(() => path.filter(Boolean), [path]);

  useEffect(() => {
    let mounted = true;

    loadGoogleMaps()
      .then((googleApi) => {
        if (!mounted || !containerRef.current || mapRef.current) {
          return;
        }

        const map = new googleApi.maps.Map(containerRef.current, {
          center,
          clickableIcons: true,
          disableDefaultUI: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          mapTypeControl: false,
          maxZoom,
          minZoom,
          scaleControl: true,
          streetViewControl: false,
          zoom,
          zoomControl: true,
        });

        mapRef.current = map;
        mapInteractionListenersRef.current = [
          map.addListener("dragstart", () => {
            userInteractedRef.current = true;
          }),
          map.addListener("zoom_changed", () => {
            if (!autoAdjustingRef.current && initializedRef.current) {
              userInteractedRef.current = true;
            }
          }),
        ];
      })
      .catch((error: Error) => {
        if (mounted) {
          setLoadError(error.message);
        }
      });

    return () => {
      mounted = false;
      mapInteractionListenersRef.current.forEach((listener) => listener.remove());
      mapInteractionListenersRef.current = [];
    };
  }, [center, maxZoom, minZoom, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    const googleApi = window.google;
    if (!map || !googleApi?.maps) return;

    const activeMarkerKeys = new Set<string>();

    markers.forEach((marker) => {
      activeMarkerKeys.add(marker.key);
      const existingMarker = markerRefs.current.get(marker.key);

      if (existingMarker) {
        existingMarker.setPosition(marker.position);
        existingMarker.setIcon(createMarkerIcon(googleApi, marker.variant));
        existingMarker.setLabel(createMarkerLabel(marker.label));
        existingMarker.setTitle(marker.label ?? "");
        existingMarker.setMap(map);
        return;
      }

      markerRefs.current.set(
        marker.key,
        new googleApi.maps.Marker({
          icon: createMarkerIcon(googleApi, marker.variant),
          label: createMarkerLabel(marker.label),
          map,
          position: marker.position,
          title: marker.label,
        }),
      );
    });

    markerRefs.current.forEach((marker, key) => {
      if (!activeMarkerKeys.has(key)) {
        marker.setMap(null);
        markerRefs.current.delete(key);
      }
    });

    if (normalizedPath.length > 1) {
      if (polylineRef.current) {
        polylineRef.current.setPath(normalizedPath);
      } else {
        polylineRef.current = new googleApi.maps.Polyline({
          geodesic: false,
          map,
          path: normalizedPath,
          strokeColor: "#1f6fff",
          strokeOpacity: 0.9,
          strokeWeight: 5,
        });
      }
    } else if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    if (!initializedRef.current && !userInteractedRef.current) {
      autoAdjustingRef.current = true;
      initializedRef.current = true;

      const points = [...markers.map((marker) => marker.position), ...normalizedPath];
      if (points.length > 1) {
        const bounds = new googleApi.maps.LatLngBounds();
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, 64);
      } else {
        map.setCenter(center);
        map.setZoom(zoom);
      }

      window.setTimeout(() => {
        autoAdjustingRef.current = false;
      }, 0);
    }
  }, [center, markers, normalizedPath, zoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;

    if (clickListenerRef.current) {
      clickListenerRef.current.remove();
      clickListenerRef.current = null;
    }

    if (onMapClick) {
      clickListenerRef.current = map.addListener("click", (event: any) => {
        const latLng = event.latLng;
        if (!latLng) return;
        onMapClick({
          lat: latLng.lat(),
          lng: latLng.lng(),
        });
      });
    }

    return () => {
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
    };
  }, [onMapClick]);

  if (loadError) {
    const missingKey = loadError.includes("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY");

    return (
      <div className={`${className ?? ""} flex items-center justify-center bg-slate-100 p-5 text-center`}>
        <div>
          <p className="text-sm font-black text-ink">Google Maps 연결이 필요합니다</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
            {missingKey
              ? "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 환경변수를 설정한 뒤 다시 빌드해주세요."
              : "Google Cloud에서 Maps JavaScript API, 결제, 도메인 제한 설정을 확인해주세요."}
          </p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
