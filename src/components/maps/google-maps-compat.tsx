"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type LoaderResult = {
  isLoaded: boolean;
  loadError?: Error;
};

type UseJsApiLoaderOptions = {
  googleMapsApiKey: string;
};

type GoogleMapProps = {
  center: google.maps.LatLngLiteral;
  mapContainerClassName?: string;
  options?: google.maps.MapOptions;
  zoom: number;
  children?: ReactNode;
};

type MarkerProps = {
  position: google.maps.LatLngLiteral;
  label?: string | google.maps.MarkerLabel;
};

type PolylineProps = {
  path: google.maps.LatLngLiteral[];
  options?: google.maps.PolylineOptions;
};

const MapContext = createContext<google.maps.Map | null>(null);

let googleMapsPromise: Promise<void> | null = null;
let loadedApiKey: string | null = null;

function ensureGoogleMaps(apiKey: string) {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps is only available in the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsPromise && loadedApiKey === apiKey) {
    return googleMapsPromise;
  }

  loadedApiKey = apiKey;
  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const callbackName = "__swapitGoogleMapsCompatInit";
    const existingScript = document.getElementById("swapit-google-maps-compat") as HTMLScriptElement | null;

    (window as typeof window & { [key: string]: unknown })[callbackName] = () => {
      resolve();
    };

    if (existingScript) {
      existingScript.addEventListener("error", () => reject(new Error("Google Maps script failed to load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.id = "swapit-google-maps-compat";
    script.async = true;
    script.defer = true;
    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&v=weekly&loading=async&callback=${callbackName}`;
    script.onerror = () => reject(new Error("Google Maps script failed to load."));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

export function useJsApiLoader({ googleMapsApiKey }: UseJsApiLoaderOptions): LoaderResult {
  const [result, setResult] = useState<LoaderResult>({ isLoaded: false });

  useEffect(() => {
    let disposed = false;

    void ensureGoogleMaps(googleMapsApiKey)
      .then(() => {
        if (!disposed) {
          setResult({ isLoaded: true });
        }
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setResult({
            isLoaded: false,
            loadError: error instanceof Error ? error : new Error("Google Maps failed to load."),
          });
        }
      });

    return () => {
      disposed = true;
    };
  }, [googleMapsApiKey]);

  return result;
}

export function GoogleMap({
  center,
  mapContainerClassName,
  options,
  zoom,
  children,
}: GoogleMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mergedOptions = useMemo<google.maps.MapOptions>(
    () => ({
      clickableIcons: false,
      disableDefaultUI: true,
      gestureHandling: "greedy",
      ...options,
    }),
    [options],
  );

  useEffect(() => {
    if (!containerRef.current || !window.google?.maps || map) {
      return;
    }

    setMap(
      new window.google.maps.Map(containerRef.current, {
        ...mergedOptions,
        center,
        zoom,
      }),
    );
  }, [center, map, mergedOptions, zoom]);

  useEffect(() => {
    if (!map) {
      return;
    }

    map.setOptions(mergedOptions);
    map.setCenter(center);
    map.setZoom(zoom);
  }, [center, map, mergedOptions, zoom]);

  return (
    <MapContext.Provider value={map}>
      <div className={mapContainerClassName} ref={containerRef} />
      {children}
    </MapContext.Provider>
  );
}

export function MarkerF({ position, label }: MarkerProps) {
  const map = useContext(MapContext);

  useEffect(() => {
    if (!map) {
      return;
    }

    const marker = new window.google.maps.Marker({
      map,
      position,
      label,
    });

    return () => {
      marker.setMap(null);
    };
  }, [label, map, position]);

  return null;
}

export function PolylineF({ path, options }: PolylineProps) {
  const map = useContext(MapContext);

  useEffect(() => {
    if (!map) {
      return;
    }

    const polyline = new window.google.maps.Polyline({
      ...options,
      map,
      path,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, options, path]);

  return null;
}
