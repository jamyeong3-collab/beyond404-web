"use client";

import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@/components/maps/google-maps-compat";
import { CheckCircle2, Clock3, MapPin, Navigation, Phone, ShieldCheck, Truck, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getTracking } from "@/lib/api";
import type { SwapRequest } from "@/types/swap";

type TrackingPanelProps = {
  swapRequest: SwapRequest | null;
  onNext: () => void;
};

type DriverStatus =
  | "requested"
  | "searching_nearby_crew"
  | "driver_assigned"
  | "driver_on_the_way"
  | "pickup_confirmed"
  | "processing_center"
  | "completed";

type DriverLocation = {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  updatedAt: string | Date | null;
};

type NearbyCrew = {
  crewId: number | null;
  crewName: string;
  status: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  assigned: boolean;
};

type TrackingOrder = {
  userId: string;
  driverId: string;
  status: DriverStatus;
  pickupLat: number;
  pickupLng: number;
  estimatedMinutes: number;
  driver: {
    name: string;
    phone: string;
    certificationStatus: string;
  };
  driverLocation?: DriverLocation | null;
  processingCenter?: {
    label: string;
    lat: number;
    lng: number;
  } | null;
  nearbyCrews: NearbyCrew[];
  events: {
    eventType: string;
    message: string;
    createdAt: string;
  }[];
  metrics?: {
    crewToPickupMeters: number | null;
    crewToProcessingCenterMeters: number | null;
    locationLive: boolean;
  } | null;
  phase?: string;
  message: string;
};

type TrackingStep = {
  key: DriverStatus;
  label: string;
  helper: string;
};

const mockPickup = { lat: 37.5665, lng: 126.9780 };
const mockProcessingCenter = { label: "Seoul West Processing Center", lat: 37.5481, lng: 126.8914 };
const mockNearbyCrews: NearbyCrew[] = [
  { crewId: 101, crewName: "LG Pickup Partner", status: "AVAILABLE", lat: 37.5665, lng: 126.9780, distanceMeters: 320, assigned: false },
  { crewId: 102, crewName: "Mapo Crew", status: "AVAILABLE", lat: 37.5563, lng: 126.9220, distanceMeters: 740, assigned: false },
  { crewId: 103, crewName: "Gangseo Crew", status: "AVAILABLE", lat: 37.5585, lng: 126.8321, distanceMeters: 1410, assigned: false },
];
const mockRoute = [
  { lat: 37.5625, lng: 126.964, heading: 25, speed: 19 },
  { lat: 37.5633, lng: 126.9685, heading: 38, speed: 20 },
  { lat: 37.5644, lng: 126.9722, heading: 48, speed: 15 },
  { lat: 37.5661, lng: 126.9763, heading: 60, speed: 11 },
  { lat: 37.5665, lng: 126.9780, heading: 85, speed: 6 },
];
const mockStatusSequence: DriverStatus[] = [
  "searching_nearby_crew",
  "driver_assigned",
  "driver_on_the_way",
  "driver_on_the_way",
  "pickup_confirmed",
  "processing_center",
  "completed",
];
const trackingSteps: TrackingStep[] = [
  { key: "searching_nearby_crew", label: "주문 확인", helper: "바로콜 요청이 접수되었어요." },
  { key: "driver_assigned", label: "크루 배정", helper: "가까운 수거 크루가 연결되었어요." },
  { key: "driver_on_the_way", label: "수거지 이동", helper: "크루가 수거 위치로 이동 중이에요." },
  { key: "pickup_confirmed", label: "수거 진행", helper: "현장 도착 후 수거를 진행하고 있어요." },
  { key: "processing_center", label: "처리센터 이동", helper: "수거 후 처리센터로 이동 중이에요." },
  { key: "completed", label: "처리 접수", helper: "처리센터 도착 후 최종 검수 단계예요." },
];

const statusMessages: Record<DriverStatus, string> = {
  requested: "수거 요청이 생성되었어요",
  searching_nearby_crew: "근처 수거 크루를 찾고 있어요",
  driver_assigned: "수거 크루가 배정되었어요",
  driver_on_the_way: "주문하신 곳으로 가고 있어요",
  pickup_confirmed: "현장에서 수거를 진행 중이에요",
  processing_center: "수거 후 처리센터로 이동 중이에요",
  completed: "수거가 완료되고 최종 처리 단계로 넘어갔어요",
};

function createMockOrder(routeIndex: number): TrackingOrder {
  const status = mockStatusSequence[Math.min(routeIndex, mockStatusSequence.length - 1)];
  const routePoint = mockRoute[Math.min(Math.max(routeIndex - 1, 0), mockRoute.length - 1)];
  const hasDriverLocation = status !== "searching_nearby_crew";

  return {
    userId: "demo-user-001",
    driverId: "101",
    status,
    pickupLat: mockPickup.lat,
    pickupLng: mockPickup.lng,
    estimatedMinutes: Math.max(1, 16 - routeIndex * 3),
    driver: {
      name: "LG Pickup Partner",
      phone: "+82-02-0000-0000",
      certificationStatus: "LG certified pickup crew",
    },
    driverLocation: hasDriverLocation
      ? {
          ...routePoint,
          updatedAt: new Date(),
        }
      : null,
    processingCenter: mockProcessingCenter,
    nearbyCrews: mockNearbyCrews,
    events: [
      { eventType: "INSTANT_CALL_REQUESTED", message: "Instant pickup call requested.", createdAt: new Date().toISOString() },
    ],
    metrics: {
      crewToPickupMeters: hasDriverLocation ? 640 : null,
      crewToProcessingCenterMeters: hasDriverLocation ? 7900 : null,
      locationLive: hasDriverLocation,
    },
    phase: status.toUpperCase(),
    message: statusMessages[status],
  };
}

function minutesUntil(value?: string | null) {
  if (!value) return 0;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 60000));
}

function deriveStatus(request: SwapRequest): DriverStatus {
  const phase = request.tracking.phase;
  const pickupStatus = request.pickupRequest?.status;

  if (pickupStatus === "COMPLETED") return "completed";
  if (phase === "EN_ROUTE_TO_PROCESSING_CENTER") return "processing_center";
  if (phase === "PICKUP_CONFIRMED" || pickupStatus === "ARRIVED") return "pickup_confirmed";
  if (pickupStatus === "IN_PROGRESS") return "driver_on_the_way";
  if (pickupStatus === "ASSIGNED" || phase === "CREW_ASSIGNED") return "driver_assigned";
  if (pickupStatus === "REQUESTED" || phase === "SEARCHING_NEARBY_CREW") return "searching_nearby_crew";
  if (pickupStatus === "CONFIRMED") return "requested";
  return request.tracking.driverLocation ? "driver_on_the_way" : "requested";
}

function mapSwapRequestToTrackingOrder(request: SwapRequest): TrackingOrder {
  return {
    userId: String(request.customerId ?? "demo-user"),
    driverId: String(request.pickupRequest?.crewId ?? "crew-pending"),
    status: deriveStatus(request),
    pickupLat: request.booking?.pickupLat ?? mockPickup.lat,
    pickupLng: request.booking?.pickupLng ?? mockPickup.lng,
    estimatedMinutes: minutesUntil(request.tracking.estimatedArrivalAt),
    driver: {
      name: request.pickupRequest?.crewName ?? "LG Pickup Partner",
      phone: "+82-02-0000-0000",
      certificationStatus: "LG certified pickup crew",
    },
    driverLocation: request.tracking.driverLocation
      ? {
          lat: request.tracking.driverLocation.lat,
          lng: request.tracking.driverLocation.lng,
          heading: request.tracking.driverLocation.heading,
          speed: request.tracking.driverLocation.speed,
          updatedAt: request.tracking.driverLocation.updatedAt,
        }
      : null,
    processingCenter: request.tracking.processingCenter ?? null,
    nearbyCrews: request.tracking.nearbyCrews ?? request.pickupRequest?.nearbyCrews ?? [],
    events: request.tracking.events ?? [],
    metrics: request.tracking.metrics ?? null,
    phase: request.tracking.phase,
    message: request.tracking.message || statusMessages[deriveStatus(request)],
  };
}

export function TrackingPanel({ swapRequest, onNext }: TrackingPanelProps) {
  const shouldUseMock =
    !swapRequest || !swapRequest.pickupRequest || process.env.NEXT_PUBLIC_USE_MOCK_TRACKING === "true";
  const backendTracking = useBackendTrackingOrder(swapRequest, !shouldUseMock);
  const mockTracking = useMockTrackingOrder();
  const { data: order, loading, error } = shouldUseMock ? mockTracking : backendTracking;

  if (loading) {
    return (
      <TrackingStateBox
        title="실시간 수거 위치를 불러오는 중이에요"
        description="배정된 크루와 최신 GPS 정보를 확인하고 있습니다."
      />
    );
  }

  if (error) {
    return <TrackingStateBox title="추적 정보를 불러오지 못했어요" description={error} />;
  }

  if (!order) {
    return <TrackingStateBox title="추적 정보가 아직 없어요" description="바로콜 또는 예약을 먼저 진행해 주세요." />;
  }

  if (order.status === "completed") {
    return <CompletedTrackingView order={order} onNext={onNext} />;
  }

  return <LiveTrackingView order={order} onComplete={onNext} />;
}

function useMockTrackingOrder() {
  const [routeIndex, setRouteIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRouteIndex((current) => current + 1);
    }, 2500);

    return () => window.clearInterval(timer);
  }, []);

  return {
    data: createMockOrder(routeIndex),
    loading: false,
    error: null as string | null,
  };
}

function useBackendTrackingOrder(swapRequest: SwapRequest | null, enabled: boolean) {
  const [data, setData] = useState<TrackingOrder | null>(
    swapRequest ? mapSwapRequestToTrackingOrder(swapRequest) : null,
  );
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !swapRequest) {
      setLoading(false);
      return undefined;
    }

    let disposed = false;

    const fetchTracking = async () => {
      try {
        const latest = await getTracking(swapRequest.id);
        if (disposed) return;
        setData(mapSwapRequestToTrackingOrder(latest));
        setError(null);
      } catch (requestError) {
        if (disposed) return;
        setError(requestError instanceof Error ? requestError.message : "Tracking request failed");
      } finally {
        if (!disposed) {
          setLoading(false);
        }
      }
    };

    void fetchTracking();
    const timer = window.setInterval(() => {
      void fetchTracking();
    }, 5000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [enabled, swapRequest]);

  return { data, loading, error };
}

function LiveTrackingView({
  order,
  onComplete,
}: {
  order: TrackingOrder;
  onComplete: () => void;
}) {
  const updatedAt = normalizeUpdatedAt(order.driverLocation?.updatedAt);
  const locationMessage = getLocationMessage(updatedAt, order.metrics?.locationLive ?? false);
  const activeStepIndex = getActiveStepIndex(order.status);
  const driverDistance = formatDistance(order.metrics?.crewToPickupMeters ?? null);
  const centerDistance = formatDistance(order.metrics?.crewToProcessingCenterMeters ?? null);

  return (
    <section className="flex min-h-full flex-col overflow-hidden rounded-[30px] bg-[#eef3f6] shadow-sm">
      <div className="relative h-[340px] shrink-0">
        <TrackingMap order={order} />
        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-xs font-black text-ink shadow">
          {order.driverLocation ? "크루 위치 실시간 추적 중" : "크루 배정 대기 중"}
        </div>
        <div className="absolute right-4 top-4 rounded-full bg-[#202632]/90 px-4 py-2 text-xs font-black text-white shadow">
          {order.estimatedMinutes > 0 ? `${order.estimatedMinutes}분 예상` : "곧 출발"}
        </div>
      </div>

      <div className="-mt-6 flex min-h-0 flex-1 flex-col rounded-t-[32px] bg-white px-5 pb-5 pt-4 shadow-[0_-18px_40px_rgba(15,23,42,.08)]">
        <div className="mx-auto h-1.5 w-14 rounded-full bg-slate-200" />
        <span className="mt-4 inline-flex w-fit rounded-full bg-[#dff8f6] px-4 py-2 text-sm font-black text-[#149f9a]">
          LG SwapIt GPS
        </span>
        <h1 className="mt-4 text-[2rem] font-black leading-tight text-ink">
          {order.message || statusMessages[order.status]}
        </h1>
        <p className="mt-2 text-base font-semibold text-slate-500">
          {order.status === "processing_center" ? "수거 후 처리센터로 이동하고 있어요" : "주문하신 곳으로 가고 있어요"}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <InfoTile label="수거지까지" value={driverDistance} tone="dark" />
          <InfoTile label="처리센터까지" value={centerDistance} tone="light" />
        </div>

        <div className="mt-5 rounded-[28px] bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1ad6cf] text-white">
                  <Truck size={20} />
                </span>
                <div>
                  <p className="text-xs font-black text-[#149f9a]">{order.driver.certificationStatus}</p>
                  <p className="text-lg font-black text-ink">{order.driver.name}</p>
                </div>
              </div>
              <p className="mt-3 text-xs font-bold leading-5 text-slate-500">{locationMessage}</p>
            </div>
            <a
              className="flex h-11 shrink-0 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-ink shadow-sm"
              href={`tel:${order.driver.phone}`}
            >
              <Phone size={16} />
              전화
            </a>
          </div>
        </div>

        <div className="mt-5 rounded-[28px] bg-white p-1">
          <div className="rounded-[26px] bg-slate-50 px-4 py-5">
            <div className="flex items-center gap-2 text-sm font-black text-ink">
              <Clock3 size={17} />
              진행 단계
            </div>
            <div className="mt-4 space-y-4">
              {trackingSteps.map((step, index) => {
                const active = index <= activeStepIndex;
                const event = findEventForStep(order.events, step.key);
                return (
                  <div key={step.key} className="grid grid-cols-[20px_minmax(0,1fr)_72px] items-start gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`h-4 w-4 rounded-full border-4 ${
                          active ? "border-[#21c7c0] bg-[#21c7c0]" : "border-slate-200 bg-white"
                        }`}
                      />
                      {index < trackingSteps.length - 1 ? (
                        <span className={`mt-1 h-10 w-1 rounded-full ${active ? "bg-[#21c7c0]" : "bg-slate-200"}`} />
                      ) : null}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-lg font-black ${active ? "text-ink" : "text-slate-400"}`}>{step.label}</p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{step.helper}</p>
                    </div>
                    <p className={`pt-0.5 text-right text-sm font-semibold ${active ? "text-slate-500" : "text-slate-300"}`}>
                      {event ? formatShortTime(event.createdAt) : "--:--"}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CompactCard
            icon={<MapPin size={16} />}
            title="수거 위치"
            description={`${order.pickupLat.toFixed(5)}, ${order.pickupLng.toFixed(5)}`}
          />
          <CompactCard
            icon={<Navigation size={16} />}
            title="처리센터"
            description={order.processingCenter ? order.processingCenter.label : "배정 후 표시됩니다."}
          />
        </div>

        <section className="mt-5 rounded-[28px] bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-ink">
            <Users size={16} />
            근처 수거 크루
          </div>
          <div className="mt-3 space-y-2">
            {order.nearbyCrews.length > 0 ? (
              order.nearbyCrews.slice(0, 3).map((crew) => (
                <div key={`${crew.crewId}-${crew.crewName}`} className="rounded-2xl bg-white p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-ink">{crew.crewName}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        {crew.status} · {formatDistance(crew.distanceMeters)}
                      </p>
                    </div>
                    {crew.assigned ? (
                      <span className="rounded-full bg-lgred px-3 py-1 text-[10px] font-black text-white">배정됨</span>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs font-semibold text-slate-500">수거 좌표가 저장되면 근처 크루가 표시됩니다.</p>
            )}
          </div>
        </section>

        <button
          className="mt-5 h-12 w-full rounded-2xl bg-lgred text-sm font-black text-white disabled:bg-slate-300"
          disabled={!order.driverLocation}
          onClick={onComplete}
          type="button"
        >
          데모: 수거 완료 처리
        </button>
      </div>
    </section>
  );
}

function TrackingMap({ order }: { order: TrackingOrder }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const pickupLocation = { lat: order.pickupLat, lng: order.pickupLng };
  const driverLocation = order.driverLocation
    ? { lat: order.driverLocation.lat, lng: order.driverLocation.lng }
    : null;
  const processingCenter = order.processingCenter
    ? { lat: order.processingCenter.lat, lng: order.processingCenter.lng }
    : null;

  if (!apiKey) {
    return (
      <PrototypeMapFallback
        status={order.status}
        hasDriverLocation={Boolean(driverLocation)}
        locationMessage={order.message}
      />
    );
  }

  return (
    <GoogleTrackingMap
      apiKey={apiKey}
      driverLocation={driverLocation}
      pickupLocation={pickupLocation}
      processingCenter={processingCenter}
      nearbyCrews={order.nearbyCrews}
    />
  );
}

function GoogleTrackingMap({
  apiKey,
  driverLocation,
  pickupLocation,
  processingCenter,
  nearbyCrews,
}: {
  apiKey: string;
  driverLocation: { lat: number; lng: number } | null;
  pickupLocation: { lat: number; lng: number };
  processingCenter: { lat: number; lng: number } | null;
  nearbyCrews: NearbyCrew[];
}) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });
  const mapCenter = driverLocation ?? pickupLocation;
  const nearbyMarkers = useMemo(
    () => nearbyCrews.filter((crew) => !crew.assigned).slice(0, 3),
    [nearbyCrews],
  );

  if (loadError) {
    return (
      <PrototypeMapFallback
        status="driver_on_the_way"
        hasDriverLocation={Boolean(driverLocation)}
        locationMessage="지도를 불러오지 못했어요"
      />
    );
  }

  if (!isLoaded) {
    return (
      <PrototypeMapFallback
        status="driver_on_the_way"
        hasDriverLocation={Boolean(driverLocation)}
        locationMessage="지도를 불러오는 중이에요"
      />
    );
  }

  return (
    <GoogleMap
      center={mapCenter}
      mapContainerClassName="h-full w-full"
      options={{
        clickableIcons: false,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      }}
      zoom={13}
    >
      <MarkerF position={pickupLocation} label={{ color: "#ffffff", fontWeight: "900", text: "P" }} />
      {processingCenter ? (
        <MarkerF position={processingCenter} label={{ color: "#ffffff", fontWeight: "900", text: "C" }} />
      ) : null}
      {driverLocation ? (
        <MarkerF position={driverLocation} label={{ color: "#ffffff", fontWeight: "900", text: "LG" }} />
      ) : null}
      {nearbyMarkers.map((crew) => (
        <MarkerF
          key={`${crew.crewId}-${crew.crewName}`}
          position={{ lat: crew.lat, lng: crew.lng }}
          label={{ color: "#ffffff", fontWeight: "900", text: "N" }}
        />
      ))}
      {driverLocation ? (
        <PolylineF
          path={
            processingCenter
              ? [driverLocation, pickupLocation, processingCenter]
              : [driverLocation, pickupLocation]
          }
          options={{ strokeColor: "#19c6bf", strokeOpacity: 0.9, strokeWeight: 5 }}
        />
      ) : null}
    </GoogleMap>
  );
}

function PrototypeMapFallback({
  status,
  hasDriverLocation,
  locationMessage,
}: {
  status: DriverStatus;
  hasDriverLocation: boolean;
  locationMessage: string;
}) {
  const label = status === "processing_center" ? "처리센터 이동" : "수거지 이동";

  return (
    <div className="relative h-full overflow-hidden bg-[radial-gradient(circle_at_70%_30%,rgba(32,38,50,.18),transparent_20%),linear-gradient(180deg,#f4f6f8,#e7edf3)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.17)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.17)_1px,transparent_1px)] bg-[length:28px_28px]" />
      <span className="absolute left-[8%] top-[22%] h-3 w-[84%] rotate-[14deg] rounded-full bg-white/90 shadow-sm" />
      <span className="absolute left-[12%] top-[60%] h-3 w-[90%] -rotate-[12deg] rounded-full bg-white/90 shadow-sm" />
      <span className="absolute left-[60%] top-0 h-full w-3 rotate-[7deg] rounded-full bg-white/90 shadow-sm" />

      <div className="absolute bottom-[24%] right-[18%] z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#202632] text-xs font-black text-white shadow-lg">
        P
      </div>
      <div className="absolute top-[28%] left-[55%] z-10 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#1ad6cf] text-xs font-black text-white shadow-lg">
        C
      </div>
      {hasDriverLocation ? (
        <div className="absolute left-[38%] top-[34%] z-10 flex h-14 w-14 animate-pulse items-center justify-center rounded-[20px] border-4 border-white bg-[#1ad6cf] text-xs font-black text-white shadow-lg">
          LG
        </div>
      ) : null}

      <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-ink shadow">
        {label}
      </div>
      <div className="absolute bottom-5 left-4 right-4 rounded-3xl bg-white/96 px-4 py-4 shadow-xl backdrop-blur">
        <p className="text-sm font-black text-ink">{locationMessage}</p>
        <p className="mt-1 text-[11px] font-semibold text-slate-500">
          Google Maps API가 없으면 이 데모 지도가 표시됩니다.
        </p>
      </div>
    </div>
  );
}

function CompletedTrackingView({
  order,
  onNext,
}: {
  order: TrackingOrder;
  onNext: () => void;
}) {
  return (
    <section className="flex min-h-full flex-col rounded-[30px] bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mt-10 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-lgred text-white">
        <CheckCircle2 size={34} />
      </div>
      <p className="mt-5 text-xs font-black text-lgred">수거 추적 완료</p>
      <h1 className="mt-2 text-3xl font-black leading-tight text-ink">수거가 완료되었어요</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        {order.driver.name} 크루가 수거를 마쳤고, 제품은 최종 검수 및 처리 단계로 이동했습니다.
      </p>
      <button
        className="mt-auto h-12 w-full rounded-2xl bg-lgred text-sm font-black text-white"
        onClick={onNext}
        type="button"
      >
        최종 감정 단계로 이동
      </button>
    </section>
  );
}

function TrackingStateBox({ title, description }: { title: string; description: string }) {
  return (
    <section className="flex min-h-full flex-col justify-center rounded-[30px] bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-lgred" />
      <h1 className="text-2xl font-black leading-tight text-ink">{title}</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{description}</p>
    </section>
  );
}

function InfoTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "dark" | "light";
}) {
  return (
    <div className={`min-w-0 rounded-[24px] p-4 ${tone === "dark" ? "bg-[#202632] text-white" : "bg-slate-50 text-ink"}`}>
      <span className={`block text-xs font-black ${tone === "dark" ? "text-white/70" : "text-slate-500"}`}>{label}</span>
      <strong className="mt-2 block truncate text-lg font-black">{value}</strong>
    </div>
  );
}

function CompactCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-black text-slate-400">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm font-black leading-6 text-ink">{description}</p>
    </div>
  );
}

function normalizeUpdatedAt(updatedAt: DriverLocation["updatedAt"] | undefined) {
  if (!updatedAt) return null;
  if (updatedAt instanceof Date) return updatedAt;

  const parsed = new Date(updatedAt);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatShortTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getLocationMessage(updatedAt: Date | null, isLive: boolean) {
  if (!updatedAt) return "크루 위치를 기다리는 중이에요.";
  if (!isLive) return "최근 위치를 새로 고치는 중이에요.";

  const seconds = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
  return `${seconds}초 전에 크루 위치가 업데이트되었어요.`;
}

function getActiveStepIndex(status: DriverStatus) {
  switch (status) {
    case "requested":
    case "searching_nearby_crew":
      return 0;
    case "driver_assigned":
      return 1;
    case "driver_on_the_way":
      return 2;
    case "pickup_confirmed":
      return 3;
    case "processing_center":
      return 4;
    case "completed":
      return 5;
    default:
      return 0;
  }
}

function findEventForStep(
  events: TrackingOrder["events"],
  step: DriverStatus,
) {
  const reversed = [...events].reverse();

  if (step === "searching_nearby_crew") {
    return reversed.find((event) => event.eventType.includes("REQUEST"));
  }
  if (step === "driver_assigned") {
    return reversed.find((event) => event.eventType === "CREW_ASSIGNED");
  }
  if (step === "driver_on_the_way") {
    return reversed.find((event) => event.eventType === "CREW_DEPARTED" || event.eventType === "CREW_LOCATION_UPDATED");
  }
  if (step === "pickup_confirmed") {
    return reversed.find((event) => event.eventType === "CREW_ARRIVED");
  }
  if (step === "processing_center") {
    return reversed.find((event) => event.eventType === "CREW_LOCATION_UPDATED");
  }
  if (step === "completed") {
    return reversed.find((event) => event.eventType === "PICKUP_COMPLETED");
  }

  return undefined;
}

function formatDistance(distance: number | null) {
  if (distance === null) {
    return "-";
  }

  if (distance >= 1000) {
    return `${(distance / 1000).toFixed(1)} km`;
  }

  return `${Math.round(distance)} m`;
}
