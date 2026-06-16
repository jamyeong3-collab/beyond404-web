"use client";

import { getTracking } from "@/lib/api";
import type { SwapRequest } from "@/types/swap";
import { Service3DIcon } from "@/components/Service3DIcon";
import { Phone, Star } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type TrackingPanelProps = {
  swapRequest: SwapRequest | null;
  onNext: () => void;
};

type PickupTrackingStatus =
  | "waiting"
  | "crew_assigned"
  | "en_route_pickup"
  | "arrived"
  | "en_route_hub"
  | "delivered_to_hub";

type Coordinates = {
  lat: number;
  lng: number;
};

type TrackingViewModel = {
  status: PickupTrackingStatus;
  title: string;
  subtitle: string;
  pickupLocation: Coordinates;
  pickupAddress: string;
  crewLocation: Coordinates | null;
  crewAddress: string;
  pickupDistanceLabel: string;
  hubDistanceLabel: string;
  crewUpdatedAt: string | null;
  processingCenter: { label: string; lat: number; lng: number } | null;
  etaLabel: string;
  routeDistanceLabel: string;
  routeDurationLabel: string;
  routePath: Coordinates[];
  crewProfile: {
    name: string;
    photoUrl: string;
    rating: number;
    reviewSummary: string[];
    phone: string;
  } | null;
  locationMessage: string;
  events: NonNullable<SwapRequest["tracking"]["events"]>;
};

const LeafletTrackingMap = dynamic(
  () => import("@/components/maps/LeafletTrackingMap").then((module) => module.LeafletTrackingMap),
  { ssr: false },
);

const GoogleCanvasMap = dynamic(
  () => import("@/components/maps/GoogleCanvasMap").then((module) => module.GoogleCanvasMap),
  { ssr: false },
);

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const progressSteps = [
  { key: "REQUESTED", label: "요청 접수" },
  { key: "ASSIGNED", label: "크루 배정" },
  { key: "EN_ROUTE", label: "수거지 이동" },
  { key: "ARRIVED", label: "문앞 도착" },
  { key: "HUB_DONE", label: "e-waste 공장 전달 완료" },
] as const;

function formatPhoneTime(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatDistance(meters?: number | null) {
  if (meters == null) return "-";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)}km`;
  return `${Math.round(meters)}m`;
}

function minutesUntil(value?: string | null) {
  if (!value) return 0;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.max(0, Math.ceil((target.getTime() - Date.now()) / 60000));
}

function deriveStatus(request: SwapRequest): PickupTrackingStatus {
  if (request.tracking.phase === "DELIVERED_TO_EWASTE_HUB" || request.pickupRequest?.status === "COMPLETED") {
    return "delivered_to_hub";
  }
  if (request.tracking.phase === "EN_ROUTE_TO_PROCESSING_CENTER") {
    return "en_route_hub";
  }
  if (request.pickupRequest?.status === "ARRIVED" || request.tracking.phase === "PICKUP_CONFIRMED") {
    return "arrived";
  }
  if (request.pickupRequest?.status === "IN_PROGRESS" || request.tracking.phase === "EN_ROUTE_TO_PICKUP") {
    return "en_route_pickup";
  }
  if (request.pickupRequest?.status === "ASSIGNED" || request.tracking.phase === "CREW_ASSIGNED") {
    return "crew_assigned";
  }
  return "waiting";
}

function titleFor(status: PickupTrackingStatus) {
  switch (status) {
    case "crew_assigned":
      return "수거 크루가 배정되었어요";
    case "en_route_pickup":
      return "크루가 수거지로 이동 중이에요";
    case "arrived":
      return "크루가 문앞에 도착했어요";
    case "en_route_hub":
      return "수거 후 처리 허브로 이동 중이에요";
    case "delivered_to_hub":
      return "e-waste 공장 전달이 완료되었어요";
    default:
      return "근처 수거 크루를 찾고 있어요";
  }
}

function subtitleFor(status: PickupTrackingStatus) {
  switch (status) {
    case "crew_assigned":
      return "배정된 크루의 현재 위치와 프로필을 바로 확인할 수 있어요.";
    case "en_route_pickup":
      return "실시간으로 크루의 이동 경로와 예상 도착 시간을 확인할 수 있어요.";
    case "arrived":
      return "문앞 도착 이후 현장 확인과 수거가 진행됩니다.";
    case "en_route_hub":
      return "수거 완료 후 처리 허브까지의 이동이 계속 업데이트됩니다.";
    case "delivered_to_hub":
      return "안심 처리 완료 상태입니다. 다음 단계로 넘어갈 수 있어요.";
    default:
      return "매칭 점수가 높은 크루에게 우선 배차 알림을 보내고 있어요.";
  }
}

function progressIndex(status: PickupTrackingStatus) {
  switch (status) {
    case "crew_assigned":
      return 1;
    case "en_route_pickup":
      return 2;
    case "arrived":
    case "en_route_hub":
      return 3;
    case "delivered_to_hub":
      return 4;
    default:
      return 0;
  }
}

function mapToViewModel(request: SwapRequest): TrackingViewModel | null {
  const pickupLat = request.booking?.pickupLat;
  const pickupLng = request.booking?.pickupLng;

  if (pickupLat == null || pickupLng == null) {
    return null;
  }

  const status = deriveStatus(request);
  const minutes = minutesUntil(request.tracking.estimatedArrivalAt);
  const driverLocation = request.tracking.driverLocation
    ? {
        lat: request.tracking.driverLocation.lat,
        lng: request.tracking.driverLocation.lng,
      }
    : null;
  const routePath =
    request.tracking.route?.points?.map((point) => ({
      lat: point.lat,
      lng: point.lng,
    })) ?? [];

  return {
    status,
    title: titleFor(status),
    subtitle: subtitleFor(status),
    pickupLocation: { lat: pickupLat, lng: pickupLng },
    pickupAddress: request.pickupRequest?.address ?? request.booking?.address ?? "수거 위치 정보 없음",
    crewLocation: driverLocation,
    crewAddress: driverLocation ? "크루 현재 이동 위치" : "크루 위치 확인 중",
    pickupDistanceLabel: formatDistance(request.tracking.metrics?.crewToPickupMeters),
    hubDistanceLabel: formatDistance(request.tracking.metrics?.crewToProcessingCenterMeters),
    crewUpdatedAt: request.tracking.driverLocation?.updatedAt ?? null,
    processingCenter: request.tracking.processingCenter ?? null,
    etaLabel: status === "delivered_to_hub" ? "처리 완료" : minutes > 0 ? `${minutes}분 예상` : "곧 도착",
    routeDistanceLabel: request.tracking.route?.distanceLabel ?? "-",
    routeDurationLabel: request.tracking.route?.durationLabel ?? "-",
    routePath,
    crewProfile: request.crewProfile
      ? {
          name: request.crewProfile.name,
          photoUrl: request.crewProfile.photoUrl,
          rating: request.crewProfile.rating,
          reviewSummary: request.crewProfile.reviewSummary,
          phone: "+82-10-0000-0000",
        }
      : null,
    locationMessage: request.tracking.metrics?.locationLive
      ? `실시간 위치 갱신 ${request.tracking.driverLocation?.updatedAt ? formatDateTime(request.tracking.driverLocation.updatedAt) : ""}`.trim()
      : "최신 위치를 확인하는 중입니다.",
    events: request.tracking.events ?? [],
  };
}

export function TrackingPanel({ swapRequest, onNext }: TrackingPanelProps) {
  const [liveRequest, setLiveRequest] = useState<SwapRequest | null>(swapRequest);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => formatPhoneTime());

  useEffect(() => {
    setLiveRequest(swapRequest);
  }, [swapRequest]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(formatPhoneTime());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!swapRequest?.id || swapRequest.id < 0) {
      return undefined;
    }

    let disposed = false;

    const fetchTracking = async () => {
      try {
        const latest = await getTracking(swapRequest.id);
        if (!disposed) {
          setLiveRequest(latest);
          setError(null);
        }
      } catch (requestError) {
        if (!disposed) {
          setError(requestError instanceof Error ? requestError.message : "tracking request failed");
        }
      }
    };

    void fetchTracking();
    const timer = window.setInterval(() => {
      void fetchTracking();
    }, 2000);

    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [swapRequest?.id]);

  const viewModel = liveRequest ? mapToViewModel(liveRequest) : null;

  if (!liveRequest || !viewModel) {
    return (
      <section className="rounded-[28px] bg-white p-6 shadow-sm">
        <h2 className="text-[15px] font-bold leading-5 text-ink">수거 추적 정보가 아직 준비되지 않았어요</h2>
        <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">
          수거 요청이 접수되면 이 화면에서 크루 배정과 이동 상태를 바로 확인할 수 있어요.
        </p>
      </section>
    );
  }

  const currentStepIndex = progressIndex(viewModel.status);
  const nextDestination =
    viewModel.status === "en_route_hub" || viewModel.status === "delivered_to_hub"
      ? viewModel.processingCenter
      : viewModel.pickupLocation;

  return (
    <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
      <div className="bg-[linear-gradient(135deg,#fff5f8,#ffffff_55%,#f8fafc)] p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="inline-flex rounded-full bg-lgred/10 px-3 py-1 text-xs font-bold text-lgred">
              이동 중인 크루 확인
            </span>
            <h2 className="mt-4 text-[20px] font-bold leading-6 text-ink">{viewModel.title}</h2>
            <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">{viewModel.subtitle}</p>
          </div>
          <div className="rounded-2xl bg-[#202632] px-4 py-3 text-right text-white">
            <p className="text-xs font-semibold text-white/60">현재 시간</p>
            <p className="mt-1 text-[15px] font-bold leading-5">{now}</p>
            <p className="mt-1 text-xs font-medium text-white/70">{viewModel.etaLabel}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="-mt-2 rounded-[26px] border border-[#f1d7df] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {viewModel.crewProfile ? (
                <img
                  alt={viewModel.crewProfile.name}
                  className="h-14 w-14 rounded-2xl object-cover"
                  src={viewModel.crewProfile.photoUrl}
                />
              ) : (
                <Service3DIcon type="truck" className="h-14 w-14 shrink-0" />
              )}
              <div>
                <p className="text-xs font-bold text-lgred">배정 크루</p>
                <p className="text-[15px] font-bold leading-5 text-ink">{viewModel.crewProfile?.name ?? "배정 대기 중"}</p>
                <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Star size={12} className="fill-current text-[#ffb800]" />
                  {viewModel.crewProfile ? viewModel.crewProfile.rating.toFixed(1) : "-"}
                </div>
              </div>
            </div>
            {viewModel.crewProfile ? (
              <a
                className="flex h-11 items-center gap-2 rounded-2xl bg-slate-100 px-4 text-[13px] font-bold text-slate-700"
                href={`tel:${viewModel.crewProfile.phone}`}
              >
                <Phone size={16} />
                연락
              </a>
            ) : null}
          </div>

          {viewModel.crewProfile?.reviewSummary?.length ? (
            <div className="mt-4 rounded-2xl bg-[#fff7f9] px-4 py-3">
              {viewModel.crewProfile.reviewSummary.slice(0, 2).map((review, index) => (
                <p key={`${review}-${index}`} className="text-[13px] font-semibold leading-5 text-slate-600">
                  {review}
                </p>
              ))}
            </div>
          ) : null}

          <TrackingMap
            crewLocation={viewModel.crewLocation}
            pickupLocation={viewModel.pickupLocation}
            processingCenter={viewModel.processingCenter}
            routePath={viewModel.routePath}
            status={viewModel.status}
          />

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoCard
              icon={<Service3DIcon type="navigation" className="h-9 w-9" />}
              title="크루 현재 위치"
              value={viewModel.crewAddress}
              caption={`수거지까지 ${viewModel.pickupDistanceLabel} · ${viewModel.locationMessage}`}
            />
            <InfoCard
              icon={<Service3DIcon type="location" className="h-9 w-9" />}
              title="수거 위치"
              value={viewModel.pickupAddress}
              caption={`크루와 거리 ${viewModel.pickupDistanceLabel}`}
            />
            <InfoCard
              icon={<Service3DIcon type="truck" className="h-9 w-9" />}
              title="예상 소요 시간"
              value={viewModel.routeDurationLabel}
              caption={`현재 경로 기준 거리 ${viewModel.routeDistanceLabel}`}
            />
            <InfoCard
              icon={<Service3DIcon type="warehouse" className="h-9 w-9" />}
              title="처리 허브"
              value={viewModel.processingCenter?.label ?? "배정 후 안내"}
              caption={`크루와 거리 ${viewModel.hubDistanceLabel}`}
            />
          </div>
        </div>

        <div className="mt-4 rounded-[26px] border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-ink">
            <Service3DIcon type="check" className="h-7 w-7 shrink-0" />
            수거 진행 상태
          </div>
          <div className="mt-4 space-y-4">
            {progressSteps.map((step, index) => {
              const active = index <= currentStepIndex;
              const event = viewModel.events[index];

              return (
                <div key={step.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`h-4 w-4 rounded-full border-4 ${
                        active ? "border-lgred bg-lgred" : "border-slate-300 bg-white"
                      }`}
                    />
                    {index < progressSteps.length - 1 ? (
                      <span className={`mt-1 h-10 w-[2px] ${active ? "bg-lgred/50" : "bg-slate-200"}`} />
                    ) : null}
                  </div>
                  <div className="flex-1 pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-[14px] leading-5 ${active ? "font-bold text-ink" : "font-semibold text-slate-500"}`}>{step.label}</p>
                      <span className="text-xs font-medium text-slate-500">{formatDateTime(event?.createdAt ?? null)}</span>
                    </div>
                    <p className="mt-1 text-[13px] font-medium leading-5 text-slate-500">
                      {event?.message ?? defaultEventMessage(step.key)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">{error}</p>
          ) : null}

          {viewModel.status === "delivered_to_hub" ? (
            <button
              className="mt-4 h-12 w-full rounded-2xl bg-lgred text-[13px] font-bold text-white"
              onClick={onNext}
              type="button"
            >
              다음 단계로 이동
            </button>
          ) : null}
        </div>

        {nextDestination ? null : (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
            지도 표시를 위해 수거지 좌표가 필요합니다.
          </p>
        )}
      </div>
    </section>
  );
}

function TrackingMap({
  crewLocation,
  pickupLocation,
  processingCenter,
  routePath,
  status,
}: {
  crewLocation: Coordinates | null;
  pickupLocation: Coordinates;
  processingCenter: { label: string; lat: number; lng: number } | null;
  routePath: Coordinates[];
  status: PickupTrackingStatus;
}) {
  const routeTarget =
    status === "en_route_hub" || status === "delivered_to_hub"
      ? processingCenter
        ? { lat: processingCenter.lat, lng: processingCenter.lng }
        : pickupLocation
      : pickupLocation;

  const markers = [
    { key: "pickup", label: "P", position: pickupLocation, variant: "pickup" as const },
    ...(crewLocation ? [{ key: "crew", label: "C", position: crewLocation, variant: "crew" as const }] : []),
    ...(processingCenter
      ? [{ key: "hub", label: "H", position: { lat: processingCenter.lat, lng: processingCenter.lng }, variant: "hub" as const }]
      : []),
  ];

  const path = routePath.length > 1 ? routePath : crewLocation ? [crewLocation, routeTarget] : [];

  return (
    <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
      <LeafletTrackingMap
        center={crewLocation ?? routeTarget}
        className="h-[320px] w-full"
        markers={markers}
        path={path}
      />
      <div className="grid grid-cols-1 gap-2 border-t border-slate-200 bg-white p-3 text-xs font-bold text-slate-500 sm:grid-cols-3">
        <MapLegend colorClass="bg-[#2563eb]" label="수거 위치" />
        <MapLegend colorClass="bg-[#dc2626]" label="크루 현재 위치" />
        <MapLegend colorClass="bg-[#16a34a]" label="처리 허브" />
      </div>
    </div>
  );
}

function MapLegend({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      {label}
    </div>
  );
}

function InfoCard({
  icon,
  title,
  value,
  caption,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-xs font-bold text-lgred">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-[13px] font-bold leading-5 text-ink">{value}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{caption}</p>
    </div>
  );
}

function defaultEventMessage(stepKey: (typeof progressSteps)[number]["key"]) {
  switch (stepKey) {
    case "REQUESTED":
      return "예약 또는 바로콜 요청이 접수된 상태입니다.";
    case "ASSIGNED":
      return "매칭 점수가 높은 크루가 배정됩니다.";
    case "EN_ROUTE":
      return "크루 위치가 실시간으로 갱신됩니다.";
    case "ARRIVED":
      return "문앞 도착 후 실물 확인과 수거가 진행돼요.";
    case "HUB_DONE":
      return "e-waste 공장 전달 완료 시 안심처리 완료 알림이 표시됩니다.";
  }
}
