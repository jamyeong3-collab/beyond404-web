"use client";

import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { CheckCircle2, Clock, Phone, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { getTracking } from "@/lib/api";
import type { SwapRequest } from "@/types/swap";

type DriverStatus =
  | "requested"
  | "driver_assigned"
  | "driver_on_the_way"
  | "nearby"
  | "arrived"
  | "completed";

type DriverLocation = {
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  updatedAt: string | Date | null;
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
};

type TrackingPanelProps = {
  swapRequest: SwapRequest | null;
  onNext: () => void;
};

const statusMessages: Record<DriverStatus, string> = {
  requested: "수거 요청이 접수되었어요",
  driver_assigned: "수거 크루가 배정되었어요",
  driver_on_the_way: "기사님이 이동 중이에요",
  nearby: "기사님이 곧 도착해요",
  arrived: "기사님이 도착했어요",
  completed: "수거가 완료되었어요",
};

const mockStatusSequence: DriverStatus[] = [
  "requested",
  "driver_assigned",
  "driver_on_the_way",
  "driver_on_the_way",
  "nearby",
  "arrived",
  "completed",
];

const mockPickup = { lat: 28.6197, lng: 77.2196 };

const mockRoute = [
  { lat: 28.6129, lng: 77.2295, heading: 25, speed: 18 },
  { lat: 28.6136, lng: 77.2269, heading: 42, speed: 22 },
  { lat: 28.6152, lng: 77.2242, heading: 55, speed: 21 },
  { lat: 28.617, lng: 77.2221, heading: 71, speed: 16 },
  { lat: 28.6185, lng: 77.2208, heading: 88, speed: 10 },
];

function createMockOrder(routeIndex: number): TrackingOrder {
  const status = mockStatusSequence[Math.min(routeIndex, mockStatusSequence.length - 1)];
  const routePoint = mockRoute[Math.min(Math.max(routeIndex - 1, 0), mockRoute.length - 1)];
  const hasDriverLocation = status !== "requested";

  return {
    userId: "demo-user-001",
    driverId: "driver-arjun-001",
    status,
    pickupLat: mockPickup.lat,
    pickupLng: mockPickup.lng,
    estimatedMinutes: Math.max(1, 15 - routeIndex * 3),
    driver: {
      name: "Arjun Kumar",
      phone: "+91 98765 43210",
      certificationStatus: "LG 인증 수거 파트너",
    },
    driverLocation: hasDriverLocation
      ? {
          ...routePoint,
          updatedAt: new Date(),
        }
      : null,
  };
}

function minutesUntil(value?: string | null) {
  if (!value) return 0;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 60000));
}

function deriveStatus(request: SwapRequest): DriverStatus {
  const pickupStatus = request.pickupRequest?.status;
  const hasDriverLocation = Boolean(request.tracking.driverLocation);
  const eta = minutesUntil(request.tracking.estimatedArrivalAt);

  if (pickupStatus === "COMPLETED") return "completed";
  if (pickupStatus === "ARRIVED") return "arrived";
  if (pickupStatus === "IN_PROGRESS") return eta <= 5 ? "nearby" : "driver_on_the_way";
  if (pickupStatus === "ASSIGNED") return hasDriverLocation ? "driver_on_the_way" : "driver_assigned";
  if (pickupStatus === "REQUESTED") return "requested";

  if (request.status === "CREDIT_ISSUED" || request.finalValuation?.status === "COMPLETED") {
    return "completed";
  }

  if (hasDriverLocation) {
    return eta <= 5 ? "nearby" : "driver_on_the_way";
  }

  return "requested";
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
      name: request.pickupRequest?.crewName ?? "LG 인증 수거 파트너",
      phone: "+82-02-0000-0000",
      certificationStatus: "LG 인증 수거 파트너",
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
        title="수거 정보를 불러오고 있어요"
        description="배정된 수거 크루와 현재 위치를 확인하는 중입니다."
      />
    );
  }

  if (error) {
    return <TrackingStateBox title="추적 정보를 불러오지 못했어요" description={error} />;
  }

  if (!order) {
    return (
      <TrackingStateBox
        title="수거 정보를 찾을 수 없어요"
        description="예약 또는 바로콜 요청이 정상적으로 생성되었는지 먼저 확인해주세요."
      />
    );
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
  const locationMessage = getLocationMessage(updatedAt);
  const progressPercent = getProgressPercent(order.status);
  const isLocationStale = locationMessage === "기사 위치를 다시 확인 중이에요.";

  return (
    <section className="flex min-h-full flex-col rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <Truck size={18} />
        STEP 4. 실시간 수거 추적
      </div>

      <section className="mt-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <p className="text-xs font-black text-lgred">LG 인증 방문 수거</p>
        <h1 className="mt-1 text-2xl font-black leading-tight text-ink">
          {statusMessages[order.status]}
        </h1>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-lgred to-lgdark transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
          {order.driverLocation ? locationMessage : "기사 위치를 기다리는 중이에요."}
        </p>
      </section>

      <section className="relative mt-3 min-h-[260px] overflow-hidden rounded-[26px] bg-slate-100">
        <TrackingMap order={order} updatedAt={updatedAt} />
        {isLocationStale ? (
          <div className="absolute left-3 right-3 top-3 rounded-2xl bg-white/95 px-3 py-2 text-xs font-black text-lgred shadow-sm">
            마지막 위치가 오래되어 새 위치를 다시 확인하고 있습니다.
          </div>
        ) : null}
      </section>

      <section className="mt-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-lgred text-white">
            <ShieldCheck size={24} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-black text-lgred">{order.driver.certificationStatus}</p>
            <h2 className="text-lg font-black leading-tight text-ink">{order.driver.name}</h2>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <InfoTile label="예상 도착 시간" value={`${Math.max(order.estimatedMinutes, 1)}분`} />
          <InfoTile label="위치 마지막 갱신" value={formatUpdatedAt(updatedAt)} />
        </div>

        <div className="mt-3 rounded-2xl bg-lgred/5 p-3">
          <div className="flex gap-2">
            <Clock className="mt-0.5 shrink-0 text-lgred" size={16} />
            <p className="text-xs font-bold leading-5 text-slate-600">
              방문 직전 알림이 전달되며, 기사 정보와 현재 위치를 같은 화면에서 계속 확인할 수 있습니다.
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-lgred/20 bg-white text-sm font-black text-lgred"
            href={`tel:${order.driver.phone}`}
          >
            <Phone size={16} />
            연락하기
          </a>
          <button
            className="h-12 rounded-xl bg-lgred text-sm font-black text-white"
            onClick={onComplete}
            type="button"
          >
            데모: 수거 완료
          </button>
        </div>
      </section>
    </section>
  );
}

function TrackingMap({
  order,
  updatedAt,
}: {
  order: TrackingOrder;
  updatedAt: Date | null;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const pickupLocation = { lat: order.pickupLat, lng: order.pickupLng };
  const driverLocation = order.driverLocation
    ? { lat: order.driverLocation.lat, lng: order.driverLocation.lng }
    : null;

  if (!apiKey) {
    return (
      <PrototypeMapFallback
        hasDriverLocation={Boolean(driverLocation)}
        locationMessage={getLocationMessage(updatedAt)}
      />
    );
  }

  return (
    <GoogleTrackingMap
      apiKey={apiKey}
      driverLocation={driverLocation}
      pickupLocation={pickupLocation}
    />
  );
}

function GoogleTrackingMap({
  apiKey,
  driverLocation,
  pickupLocation,
}: {
  apiKey: string;
  driverLocation: { lat: number; lng: number } | null;
  pickupLocation: { lat: number; lng: number };
}) {
  const { isLoaded } = useJsApiLoader({ googleMapsApiKey: apiKey });
  const mapCenter = driverLocation ?? pickupLocation;

  if (!isLoaded) {
    return (
      <PrototypeMapFallback
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
      zoom={15}
    >
      <MarkerF position={pickupLocation} label={{ color: "#ffffff", fontWeight: "900", text: "수거" }} />
      {driverLocation ? (
        <MarkerF position={driverLocation} label={{ color: "#ffffff", fontWeight: "900", text: "LG" }} />
      ) : null}
      {driverLocation ? (
        <PolylineF
          path={[driverLocation, pickupLocation]}
          options={{ strokeColor: "#A50034", strokeOpacity: 0.85, strokeWeight: 4 }}
        />
      ) : null}
    </GoogleMap>
  );
}

function PrototypeMapFallback({
  hasDriverLocation,
  locationMessage,
}: {
  hasDriverLocation: boolean;
  locationMessage: string;
}) {
  return (
    <div className="relative h-full min-h-[260px] overflow-hidden bg-[radial-gradient(circle_at_70%_34%,rgba(165,0,52,.13),transparent_22%),linear-gradient(145deg,#eef1f6,#dfe5ee)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.22)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.22)_1px,transparent_1px)] bg-[length:34px_34px]" />
      <span className="absolute left-[8%] top-[28%] h-2.5 w-[92%] rotate-[15deg] rounded-full bg-white/80 shadow-sm" />
      <span className="absolute left-[12%] top-[62%] h-2.5 w-[86%] -rotate-[13deg] rounded-full bg-white/80 shadow-sm" />
      <span className="absolute left-[55%] top-[4%] h-[92%] w-2.5 rotate-[7deg] rounded-full bg-white/80 shadow-sm" />

      <div className="absolute bottom-[24%] right-[18%] z-10 flex h-11 w-11 items-center justify-center rounded-full border-4 border-white bg-ink text-[11px] font-black text-white shadow-lg">
        수거
      </div>
      {hasDriverLocation ? (
        <div className="absolute left-[30%] top-[30%] z-10 flex h-11 w-11 animate-pulse items-center justify-center rounded-full border-4 border-white bg-lgred text-xs font-black text-white shadow-lg">
          LG
        </div>
      ) : null}

      <div className="absolute bottom-12 left-3 right-3 z-20 rounded-2xl bg-white/95 px-3 py-3 text-sm font-black text-ink shadow-sm backdrop-blur">
        {locationMessage}
      </div>
      <div className="absolute bottom-3 left-3 z-20 text-[10px] font-bold text-slate-500">
        Google Maps API 미설정 시 표시되는 데모 지도입니다.
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
    <section className="flex min-h-full flex-col rounded-[28px] bg-white p-5 text-center shadow-sm">
      <div className="mx-auto mt-10 flex h-16 w-16 items-center justify-center rounded-full bg-lgred text-white">
        <CheckCircle2 size={32} />
      </div>
      <p className="mt-5 text-xs font-black text-lgred">실시간 수거 추적</p>
      <h1 className="mt-2 text-2xl font-black leading-tight text-ink">수거가 완료되었어요</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
        {order.driver.name} 크루가 수거를 완료했습니다. 이후 최종 검수와 보상가 안내 단계로 이어집니다.
      </p>
      <button
        className="mt-auto h-12 w-full rounded-xl bg-lgred text-sm font-black text-white"
        onClick={onNext}
        type="button"
      >
        최종 검수 화면으로 이동
      </button>
    </section>
  );
}

function TrackingStateBox({ title, description }: { title: string; description: string }) {
  return (
    <section className="flex min-h-full flex-col justify-center rounded-[28px] bg-white p-6 text-center shadow-sm">
      <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-lgred" />
      <h1 className="text-2xl font-black leading-tight text-ink">{title}</h1>
      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500">{description}</p>
    </section>
  );
}

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-cloud p-3">
      <span className="block text-[11px] font-black text-slate-500">{label}</span>
      <strong className="mt-1 block truncate text-sm font-black text-ink">{value}</strong>
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

function formatUpdatedAt(date: Date | null) {
  if (!date) return "위치 정보 없음";

  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function getLocationMessage(updatedAt: Date | null) {
  if (!updatedAt) return "기사 위치를 기다리는 중이에요.";

  const seconds = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
  if (seconds >= 30) return "기사 위치를 다시 확인 중이에요.";
  return `${seconds}초 전에 위치가 갱신되었어요.`;
}

function getProgressPercent(status: DriverStatus) {
  switch (status) {
    case "requested":
      return 12;
    case "driver_assigned":
      return 32;
    case "driver_on_the_way":
      return 62;
    case "nearby":
      return 82;
    case "arrived":
      return 94;
    case "completed":
      return 100;
    default:
      return 50;
  }
}
