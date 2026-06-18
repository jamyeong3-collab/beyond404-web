"use client";

import { Service3DIcon } from "@/components/Service3DIcon";
import { getTracking, submitCrewReview } from "@/lib/api";
import type { SwapRequest } from "@/types/swap";
import { Star } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

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
  hubDistanceLabel: string;
  processingCenter: { label: string; lat: number; lng: number } | null;
  etaLabel: string;
  routePath: Coordinates[];
  crewProfile: {
    name: string;
    photoUrl: string;
    rating: number;
    phone: string;
  } | null;
  locationMessage: string;
};

type RouteMode = "car" | "walk";

const KakaoCanvasMap = dynamic(
  () => import("@/components/maps/KakaoCanvasMap").then((module) => module.KakaoCanvasMap),
  { ssr: false },
);

const kakaoMapAppKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim() ?? "";

const progressSteps = [
  { key: "REQUESTED", label: "요청 접수" },
  { key: "ASSIGNED", label: "크루 배정" },
  { key: "EN_ROUTE", label: "수거지 이동" },
  { key: "ARRIVED", label: "문앞 도착" },
  { key: "HUB_DONE", label: "e-waste 공장 전달 완료" },
] as const;

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

function formatWalkDuration(distanceMeters?: number | null) {
  if (distanceMeters == null) return "-";
  const minutes = Math.max(1, Math.round(distanceMeters / 80));
  return `${minutes}분`;
}

function formatCalories(distanceMeters?: number | null) {
  if (distanceMeters == null) return "-";
  return `${Math.max(1, Math.round(distanceMeters * 0.044))}kcal`;
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
      return "수거 크루가 배정됐어요";
    case "en_route_pickup":
      return "크루가 수거지로 이동 중이에요";
    case "arrived":
      return "크루가 문앞에 도착했어요";
    case "en_route_hub":
      return "수거 후 처리 허브로 이동 중이에요";
    case "delivered_to_hub":
      return "e-waste 공장 전달이 완료됐어요";
    default:
      return "가까운 수거 크루를 찾고 있어요";
  }
}

function subtitleFor(status: PickupTrackingStatus) {
  switch (status) {
    case "crew_assigned":
      return "배정된 크루의 현재 위치와 프로필을 바로 확인할 수 있어요.";
    case "en_route_pickup":
      return "실시간 이동 경로와 예상 도착 시간을 확인할 수 있어요.";
    case "arrived":
      return "문앞 도착 후 실물 확인과 수거가 진행됩니다.";
    case "en_route_hub":
      return "수거 후 처리 허브까지의 이동 상황을 계속 확인할 수 있어요.";
    case "delivered_to_hub":
      return "수거와 처리 단계가 완료되어 보상 확인 단계로 이동할 수 있어요.";
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

function kakaoWalkRouteUrl(origin: Coordinates, destination: Coordinates) {
  return `https://map.kakao.com/link/by/walk/crew,${origin.lat},${origin.lng}/pickup,${destination.lat},${destination.lng}`;
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

  return {
    status,
    title: titleFor(status),
    subtitle: subtitleFor(status),
    pickupLocation: { lat: pickupLat, lng: pickupLng },
    pickupAddress: request.pickupRequest?.address ?? request.booking?.address ?? "수거 위치 정보 없음",
    crewLocation: driverLocation,
    crewAddress: driverLocation ? "크루 현재 이동 위치" : "크루 위치 확인 중",
    hubDistanceLabel: formatDistance(request.tracking.metrics?.crewToProcessingCenterMeters),
    processingCenter: request.tracking.processingCenter ?? null,
    etaLabel: status === "delivered_to_hub" ? "처리 완료" : minutes > 0 ? `${minutes}분 예상` : "곧 도착",
    routeDistanceLabel: request.tracking.route?.distanceLabel ?? "-",
    routeDurationLabel: request.tracking.route?.durationLabel ?? "-",
    routeDistanceMeters: request.tracking.route?.distanceMeters ?? request.tracking.metrics?.crewToPickupMeters ?? null,
    routePath:
      request.tracking.route?.points?.map((point) => ({
        lat: point.lat,
        lng: point.lng,
      })) ?? [],
    crewProfile: request.crewProfile
      ? {
          name: request.crewProfile.name,
          photoUrl: request.crewProfile.photoUrl,
          rating: request.crewProfile.rating,
          phone: "+82-10-0000-0000",
        }
      : null,
    locationMessage: request.tracking.metrics?.locationLive
      ? `실시간 위치 갱신 ${request.tracking.driverLocation?.updatedAt ? formatDateTime(request.tracking.driverLocation.updatedAt) : ""}`.trim()
      : "최신 위치를 확인하는 중입니다.",
  };
}

export function TrackingPanel({ swapRequest, onNext }: TrackingPanelProps) {
  const [liveRequest, setLiveRequest] = useState<SwapRequest | null>(swapRequest);
  const [error, setError] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  useEffect(() => {
    setLiveRequest(swapRequest);
  }, [swapRequest]);

  useEffect(() => {
    if (!liveRequest?.crewReview) return;
    setReviewRating(liveRequest.crewReview.rating);
    setReviewComment(liveRequest.crewReview.comment ?? "");
  }, [liveRequest?.crewReview]);

  useEffect(() => {
    if (!swapRequest?.id || swapRequest.id < 0) {
      return undefined;
    }

    let disposed = false;

    const fetchTracking = async () => {
      try {
        const latest = await getTracking(swapRequest.id);
        if (!disposed) {
          setLiveRequest((current) => {
            const currentStatus = current ? deriveStatus(current) : "waiting";
            const latestStatus = deriveStatus(latest);
            if (
              (currentStatus === "en_route_pickup" || currentStatus === "crew_assigned") &&
              latestStatus === "waiting"
            ) {
              return current;
            }
            return latest;
          });
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

  const nextDestination =
    viewModel.status === "en_route_hub" || viewModel.status === "delivered_to_hub"
      ? viewModel.processingCenter
      : viewModel.pickupLocation;
  const hasSubmittedReview = Boolean(liveRequest.crewReview);

  const handleSubmitReview = async () => {
    if (!liveRequest.id) return;

    setReviewSubmitting(true);
    setReviewError(null);

    try {
      const updated = await submitCrewReview(liveRequest.id, {
        rating: reviewRating,
        comment: reviewComment,
      });
      setLiveRequest(updated);
    } catch (submitError) {
      setReviewError(submitError instanceof Error ? submitError.message : "평점을 등록하지 못했어요.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-[28px] bg-white shadow-sm">
      <div className="bg-[linear-gradient(135deg,#fff5f8,#ffffff_55%,#f8fafc)] p-4">
        <div>
          <div className="min-w-0">
            <span className="inline-flex rounded-full bg-lgred/10 px-3 py-1 text-xs font-bold text-lgred">
              이동 중인 크루 확인
            </span>
            <h2 className="mt-4 whitespace-nowrap text-[18px] font-bold leading-6 text-ink">{viewModel.title}</h2>
            <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">{viewModel.subtitle}</p>
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
                <p className="text-[15px] font-bold leading-5 text-ink">
                  {viewModel.crewProfile?.name ?? "배정 대기 중"}
                </p>
                <div className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                  <Star size={12} className="fill-current text-[#ffb800]" />
                  {viewModel.crewProfile ? viewModel.crewProfile.rating.toFixed(1) : "-"}
                </div>
              </div>
            </div>
            <div className="flex h-11 shrink-0 items-center rounded-2xl bg-lgred/10 px-4 text-[13px] font-bold text-lgred ring-1 ring-lgred/15">
              {viewModel.etaLabel}
            </div>
          </div>

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
              caption={`현재 경로 거리 ${viewModel.routeDistanceLabel}`}
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
                      <p
                        className={`text-[14px] leading-5 ${
                          active ? "font-bold text-ink" : "font-semibold text-slate-500"
                        }`}
                      >
                        {step.label}
                      </p>
                      <span className="text-xs font-medium text-slate-500">
                        {formatDateTime(event?.createdAt ?? null)}
                      </span>
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
            <p className="mt-4 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
              {error}
            </p>
          ) : null}

          {viewModel.status === "delivered_to_hub" ? (
            <div className="mt-4 rounded-[24px] border border-[#f1d7df] bg-[#fff7f9] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-black text-lgred">크루 평점</p>
                  <p className="mt-1 text-[15px] font-bold text-ink">
                    {viewModel.crewProfile?.name ?? "담당 크루"}님은 어떠셨나요?
                  </p>
                </div>
                {hasSubmittedReview ? (
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-600">
                    제출 완료
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-white ring-1 ring-slate-200 transition"
                    disabled={reviewSubmitting}
                    onClick={() => setReviewRating(value)}
                    type="button"
                  >
                    <Star
                      size={20}
                      className={value <= reviewRating ? "fill-[#ffb800] text-[#ffb800]" : "text-slate-300"}
                    />
                  </button>
                ))}
              </div>

              <textarea
                className="mt-4 h-24 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] font-medium text-ink outline-none placeholder:text-slate-400"
                disabled={reviewSubmitting}
                maxLength={120}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="크루의 시간 준수, 수거 진행 방식에 대한 후기를 남겨 주세요."
                value={reviewComment}
              />

              {reviewError ? (
                <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-700">
                  {reviewError}
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  className="h-12 rounded-2xl border border-slate-200 bg-white text-[13px] font-bold text-slate-700"
                  onClick={onNext}
                  type="button"
                >
                  보상 확인으로 이동
                </button>
                <button
                  className="h-12 rounded-2xl bg-lgred text-[13px] font-bold text-white disabled:bg-slate-300"
                  disabled={reviewSubmitting}
                  onClick={() => void handleSubmitReview()}
                  type="button"
                >
                  {reviewSubmitting ? "등록 중..." : hasSubmittedReview ? "평점 다시 등록" : "평점 남기기"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {nextDestination ? null : (
          <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
            지도를 표시하려면 수거지 좌표가 필요합니다.
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
  const [routeMode, setRouteMode] = useState<RouteMode>("car");
  const [lockedCarPath, setLockedCarPath] = useState<Coordinates[]>([]);

  const routeTarget =
    status === "en_route_hub" || status === "delivered_to_hub"
      ? processingCenter
        ? { lat: processingCenter.lat, lng: processingCenter.lng }
        : pickupLocation
      : pickupLocation;

  const markers = [
    { key: "pickup", label: "home", position: pickupLocation, variant: "pickup" as const },
    ...(crewLocation ? [{ key: "crew", label: "C", position: crewLocation, variant: "crew" as const }] : []),
    ...(processingCenter
      ? [
          {
            key: "hub",
            label: "H",
            position: { lat: processingCenter.lat, lng: processingCenter.lng },
            variant: "hub" as const,
          },
        ]
      : []),
  ];

  useEffect(() => {
    setLockedCarPath([]);
  }, [routeTarget.lat, routeTarget.lng]);

  useEffect(() => {
    if (routePath.length <= 1) return;
    setLockedCarPath((previous) => (previous.length > 1 ? previous : routePath));
  }, [routePath]);

  const carPath = lockedCarPath.length > 1 ? lockedCarPath : [];
  const path = routeMode === "car" ? carPath : [];
  const hasRoadRoute = routeMode === "car" && carPath.length > 1;
  const isRouteSearching = routeMode === "car" && !hasRoadRoute && Boolean(crewLocation);
  const canOpenWalkLink = routeMode === "walk" && crewLocation;
  const calorieLabel = formatCalories(routeDistanceMeters);
  const routeMetric = [
    routeDistanceLabel,
    routeMode === "walk" ? formatWalkDuration(routeDistanceMeters) : routeDurationLabel,
    calorieLabel,
  ]
    .filter((value) => value && value !== "-")
    .join(" · ");

  return (
    <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100">
      <div className="relative isolate overflow-hidden">
        {kakaoMapAppKey ? (
          <KakaoCanvasMap
            appKey={kakaoMapAppKey}
            center={crewLocation ?? routeTarget}
            className="relative z-0 h-[340px] w-full"
            fitBounds
            markers={markers}
            path={carPath}
            routeColor={hasRoadRoute ? "#2563eb" : "#64748b"}
            routeOpacity={hasRoadRoute ? 0.78 : 0.52}
            routeWeight={hasRoadRoute ? 6 : 4}
          />
        ) : (
          <TrackingFallbackMap crewLocation={crewLocation} pickupLocation={pickupLocation} />
        )}
          <div className="flex h-[340px] w-full items-center justify-center px-6 text-center">
            <div>
              <p className="text-sm font-black text-ink">Kakao Maps 연결이 필요합니다</p>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                `NEXT_PUBLIC_KAKAO_MAP_APP_KEY` 값을 확인한 뒤 앱을 다시 실행해 주세요.
              </p>
            </div>
          </div>
        )}

        <div className="absolute right-3 top-3 z-30 flex rounded-full bg-white/95 p-1 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur">
          {(["car", "walk"] as const).map((mode) => (
            <button
              key={mode}
              className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                routeMode === mode ? "bg-lgred text-white" : "text-slate-500"
              }`}
              onClick={() => setRouteMode(mode)}
              type="button"
            >
              {mode === "car" ? "차량" : "도보"}
            </button>
          ))}
        </div>

        <div className="pointer-events-none absolute left-3 right-3 top-14 z-30 rounded-[18px] bg-white/95 px-4 py-3 text-center shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur">
          <p className="text-xs font-black text-lgred">실시간 이동 경로</p>
          <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
            {routeMode === "walk"
              ? "도보 경로는 카카오맵에서 자세히 확인할 수 있어요."
              : hasRoadRoute
                ? "차량 최단 경로를 표시하고 있어요."
                : isRouteSearching
                  ? "경로를 계산하고 있어요."
                  : "차량 경로를 준비 중이에요."}
          </p>
          {routeMetric ? <p className="mt-1 text-xs font-black text-ink">{routeMetric}</p> : null}
        </div>

        {canOpenWalkLink ? (
          <button
            className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-black text-white shadow-[0_8px_24px_rgba(15,23,42,0.18)]"
            onClick={() => window.open(kakaoWalkRouteUrl(crewLocation, routeTarget), "_blank", "noopener,noreferrer")}
            type="button"
          >
            카카오맵 도보 길찾기
          </button>
        ) : null}
      </div>

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

function TrackingFallbackMap({
  crewLocation,
  pickupLocation,
}: {
  crewLocation: Coordinates | null;
  pickupLocation: Coordinates;
}) {
  return (
    <div className="relative h-[340px] w-full overflow-hidden bg-[#eef1f4]">
      <div className="absolute inset-0 opacity-80">
        <div className="absolute left-[-18%] top-[38%] h-10 w-[140%] rotate-[-18deg] bg-white shadow-sm" />
        <div className="absolute left-[-18%] top-[60%] h-9 w-[140%] rotate-[-8deg] bg-white shadow-sm" />
        <div className="absolute left-[38%] top-[-10%] h-[130%] w-9 rotate-[28deg] bg-white shadow-sm" />
        <div className="absolute left-[7%] top-[12%] h-24 w-28 rounded-[18px] border border-slate-200 bg-slate-100" />
        <div className="absolute right-[9%] top-[18%] h-20 w-24 rounded-[18px] border border-slate-200 bg-slate-100" />
        <div className="absolute bottom-[10%] left-[16%] h-24 w-32 rounded-[18px] border border-slate-200 bg-slate-100" />
      </div>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path d="M38 64 C48 56 56 55 66 43" fill="none" stroke="#c0003b" strokeWidth="1.6" strokeDasharray="3 2" opacity="0.7" />
      </svg>
      <div className="absolute left-[30%] top-[60%] flex flex-col items-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-[#2563eb] text-[11px] font-bold text-white shadow-lg">
          집
        </div>
        <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">수거 위치</span>
      </div>
      <div className="absolute left-[62%] top-[36%] flex flex-col items-center">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-white bg-[#dc2626] text-[11px] font-bold text-white shadow-lg">
          크루
        </div>
        <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-sm">이동 중</span>
      </div>
      <div className="absolute bottom-3 left-3 right-3 rounded-2xl bg-white/90 px-3 py-2 text-[11px] font-semibold leading-4 text-slate-500 shadow-sm">
        지도 연결 전에도 위치 흐름을 확인할 수 있는 미리보기예요. 수거 위치 {pickupLocation.lat.toFixed(4)}, {pickupLocation.lng.toFixed(4)}
        {crewLocation ? ` · 크루 ${crewLocation.lat.toFixed(4)}, ${crewLocation.lng.toFixed(4)}` : ""}
      </div>
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
      return "문앞 도착 후 실물 확인과 수거가 진행됩니다.";
    case "HUB_DONE":
      return "e-waste 공장 전달 완료 시 최종 완료 상태가 표시됩니다.";
  }
}
