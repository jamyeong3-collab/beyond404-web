"use client";

import { GoogleMap, MarkerF, useJsApiLoader } from "@/components/maps/google-maps-compat";
import type { SwapRequest } from "@/types/swap";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Crosshair,
  Loader2,
  MapPin,
  Navigation,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";

type BookingPanelProps = {
  swapRequest: SwapRequest | null;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
};

type BookingMode = "schedule" | "call";
type ScheduleStage = "calendar" | "details";
type CallStage = "ready" | "searching" | "matched";
type CallPickupMethod = "gps" | "manual";

type AddressSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
};

type PickupCoordinates = {
  lat: number;
  lng: number;
};

export type BookingSelection = {
  mode: BookingMode;
  reservedAt: string;
  pickupAddress?: string;
  detailAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  bookingDate?: string;
  bookingTime?: string;
};

const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1);
const availableDays = [10, 11, 12, 13, 14, 17, 18, 19, 21, 24, 26, 28];
const timeSlots = ["09:00", "11:00", "13:00", "15:00", "17:00"] as const;
const defaultPickupCoords = { lat: 37.5665, lng: 126.978 };
const defaultAddress = "서울특별시 중구 세종대로 110";
const quickPlaceChips = ["집", "회사", "홍대입구역", "연남동"];
const loadingAddressText = "현재 위치를 확인하는 중입니다.";

function formatBookingDate(day: number) {
  return `2026-06-${String(day).padStart(2, "0")}`;
}

function compactAddress(address: string) {
  return address.split(",")[0]?.trim() || address;
}

async function reverseGeocode(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    format: "json",
    lat: String(latitude),
    lon: String(longitude),
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const data = (await response.json()) as { display_name?: string };
  return data.display_name ?? `현재 위치 (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
}

async function geocodeAddress(query: string) {
  const params = new URLSearchParams({
    format: "json",
    q: query,
    countrycodes: "kr",
    limit: "1",
    addressdetails: "1",
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error("Address geocoding failed");
  }

  const data = (await response.json()) as AddressSuggestion[];
  const first = data[0];

  if (!first) {
    throw new Error("Address not found");
  }

  return {
    address: first.display_name,
    coordinates: {
      lat: Number(first.lat),
      lng: Number(first.lon),
    },
  };
}

export function BookingPanel({ swapRequest, loading, onBooking }: BookingPanelProps) {
  const [mode, setMode] = useState<BookingMode>("schedule");
  const canBook = Boolean(swapRequest && swapRequest.preValuation.minEstimatedValue > 0);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <CalendarCheck size={18} />
        STEP 3. 수거 예약
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        시간 예약은 날짜와 주소를 정해서 진행하고, 바로콜은 현재 위치를 기준으로 가장 가까운 수거 크루를 찾습니다.
      </p>

      <div className="mt-3 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <ModeButton active={mode === "schedule"} label="시간 예약" onClick={() => setMode("schedule")} />
        <ModeButton active={mode === "call"} label="바로콜" onClick={() => setMode("call")} />
      </div>

      <div className="mt-3 min-h-0 flex-1">
        {mode === "schedule" ? (
          <ScheduleBooking canBook={canBook} loading={loading} onBooking={onBooking} />
        ) : (
          <InstantCallBooking canBook={canBook} loading={loading} onBooking={onBooking} />
        )}
      </div>
    </section>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`h-10 rounded-xl text-sm font-black transition ${
        active ? "bg-white text-lgred shadow-sm" : "text-slate-500"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function ScheduleBooking({
  canBook,
  loading,
  onBooking,
}: {
  canBook: boolean;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
}) {
  const [stage, setStage] = useState<ScheduleStage>("calendar");
  const [selectedDay, setSelectedDay] = useState(10);
  const [selectedTime, setSelectedTime] = useState<(typeof timeSlots)[number]>("11:00");
  const [pickupAddress, setPickupAddress] = useState(defaultAddress);
  const [detailAddress, setDetailAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<PickupCoordinates>(defaultPickupCoords);

  if (stage === "details") {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <button
            className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-ink"
            onClick={() => setStage("calendar")}
            type="button"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="text-right">
            <p className="text-xs font-black text-slate-400">선택한 날짜</p>
            <p className="text-sm font-black text-ink">6월 {selectedDay}일</p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-lgred/5 p-4">
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 shrink-0 text-lgred" size={18} />
            <p className="text-xs font-semibold leading-5 text-slate-600">
              시간을 고른 뒤 수거 주소와 상세 위치를 입력하면 예약이 바로 확정됩니다.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {timeSlots.map((time) => {
            const active = selectedTime === time;
            return (
              <button
                key={time}
                className={`h-11 rounded-xl border text-sm font-black ${
                  active ? "border-lgred bg-lgred text-white" : "border-slate-200 bg-slate-50 text-ink"
                }`}
                onClick={() => setSelectedTime(time)}
                type="button"
              >
                {time}
              </button>
            );
          })}
        </div>

        <LocationEditor
          address={pickupAddress}
          detailAddress={detailAddress}
          onAddressChange={setPickupAddress}
          onCoordinateChange={setPickupCoords}
          onDetailAddressChange={setDetailAddress}
        />

        <button
          className="mt-4 h-12 w-full rounded-xl bg-lgred text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canBook || loading || !pickupAddress.trim()}
          onClick={() => {
            const bookingDate = formatBookingDate(selectedDay);
            onBooking({
              mode: "schedule",
              reservedAt: `예약 ${bookingDate} ${selectedTime}`,
              pickupAddress,
              detailAddress,
              pickupLat: pickupCoords.lat,
              pickupLng: pickupCoords.lng,
              bookingDate,
              bookingTime: selectedTime,
            });
          }}
          type="button"
        >
          {loading ? "예약 중..." : "예약하기"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-black text-slate-400">2026년 6월</p>
          <h3 className="mt-1 text-lg font-black text-ink">예약 가능한 날짜</h3>
        </div>
        <span className="rounded-full bg-lgred/10 px-3 py-1 text-xs font-black text-lgred">
          {availableDays.length}일 선택 가능
        </span>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-400">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1">
        {calendarDays.map((day) => {
          const available = availableDays.includes(day);
          const active = selectedDay === day;
          return (
            <button
              key={day}
              className={`h-9 rounded-xl text-xs font-black transition ${
                active
                  ? "bg-lgred text-white"
                  : available
                    ? "bg-lgred/10 text-lgred"
                    : "bg-slate-50 text-slate-300"
              }`}
              disabled={!available}
              onClick={() => {
                setSelectedDay(day);
                setStage("details");
              }}
              type="button"
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 shrink-0 text-lgred" size={18} />
          <p className="text-xs font-semibold leading-5 text-slate-600">
            날짜를 고르면 시간 선택과 수거 위치 입력 단계로 이어집니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function InstantCallBooking({
  canBook,
  loading,
  onBooking,
}: {
  canBook: boolean;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
}) {
  const [stage, setStage] = useState<CallStage>("ready");
  const [pickupMethod, setPickupMethod] = useState<CallPickupMethod>("gps");
  const [pickupAddress, setPickupAddress] = useState(loadingAddressText);
  const [detailAddress, setDetailAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<PickupCoordinates | null>(null);
  const [manualCoords, setManualCoords] = useState<PickupCoordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const activeCoords = pickupMethod === "gps" ? pickupCoords : manualCoords;
  const displayAddress = pickupMethod === "gps" ? pickupAddress : pickupAddress || "직접 주소를 입력해 주세요.";
  const mapAddress = pickupAddress === loadingAddressText ? "위치를 찾는 중..." : compactAddress(pickupAddress);

  const detectCurrentLocation = async () => {
    if (!("geolocation" in navigator)) {
      setLocationError("이 브라우저에서는 위치 정보를 사용할 수 없습니다.");
      return false;
    }

    setLocating(true);
    setLocationError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 10000,
        });
      });

      const nextCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };

      setPickupCoords(nextCoords);

      try {
        const currentAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
        setPickupAddress(currentAddress);
      } catch {
        setPickupAddress(`현재 위치 (${nextCoords.lat.toFixed(5)}, ${nextCoords.lng.toFixed(5)})`);
      }

      return true;
    } catch {
      setLocationError("현재 위치를 가져오지 못했습니다. 위치 권한을 확인하거나 주소를 직접 입력해 주세요.");
      return false;
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (pickupMethod === "gps") {
      void detectCurrentLocation();
    }
  }, [pickupMethod]);

  const startMatching = async () => {
    let finalAddress = pickupAddress.trim();
    let finalDetail = detailAddress.trim();
    let finalCoords = activeCoords;

    if (pickupMethod === "gps") {
      const locationReady = finalCoords ? true : await detectCurrentLocation();
      if (!locationReady) {
        return;
      }

      finalCoords = pickupCoords ?? finalCoords;
      finalAddress = pickupAddress.trim();
      finalDetail = detailAddress.trim() || "현재 위치";
    } else {
      if (!finalAddress) {
        setLocationError("주소를 입력해 주세요.");
        return;
      }

      if (!finalCoords) {
        try {
          const geocoded = await geocodeAddress(finalAddress);
          finalAddress = geocoded.address;
          finalCoords = geocoded.coordinates;
          setPickupAddress(geocoded.address);
          setManualCoords(geocoded.coordinates);
        } catch {
          setLocationError("입력한 주소의 위치를 찾지 못했습니다. 주소를 다시 확인해 주세요.");
          return;
        }
      }
    }

    if (!finalCoords) {
      setLocationError("수거 위치를 확인하지 못했습니다.");
      return;
    }

    setLocationError(null);
    setStage("searching");

    window.setTimeout(() => {
      setPickupAddress(finalAddress);
      setDetailAddress(finalDetail);
      setStage("matched");
    }, 1700);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="relative overflow-hidden rounded-[28px] bg-slate-100 shadow-sm">
        <PickupPreviewMap
          addressLabel={mapAddress}
          coordinates={activeCoords}
          locating={locating}
        />
        <div className="absolute bottom-4 left-4 right-4 rounded-[26px] bg-white/96 p-4 shadow-xl backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black text-slate-400">바로콜 출발 위치</p>
              <p className="mt-1 line-clamp-2 text-xl font-black leading-tight text-ink">
                {pickupMethod === "gps" ? "현재 위치" : "입력한 주소"}
              </p>
            </div>
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-ink"
              onClick={() => void detectCurrentLocation()}
              type="button"
            >
              <Crosshair size={18} />
            </button>
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">{displayAddress}</p>
          {activeCoords ? (
            <p className="mt-2 text-xs font-bold text-slate-400">
              {activeCoords.lat.toFixed(5)}, {activeCoords.lng.toFixed(5)}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {quickPlaceChips.map((chip, index) => (
              <span
                key={chip}
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  index === 0 ? "bg-slate-100 text-ink" : "border border-slate-200 bg-white text-slate-500"
                }`}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <ModeButton
          active={pickupMethod === "gps"}
          label="현재 위치"
          onClick={() => {
            setPickupMethod("gps");
            setStage("ready");
          }}
        />
        <ModeButton
          active={pickupMethod === "manual"}
          label="직접 입력"
          onClick={() => {
            setPickupMethod("manual");
            setStage("ready");
            setLocationError(null);
          }}
        />
      </div>

      {pickupMethod === "gps" ? (
        <div className="mt-4 rounded-3xl bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-lgred/10 text-lgred">
              <Navigation size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black text-slate-400">내 위치 확인</p>
              <p className="mt-1 text-base font-black leading-6 text-ink">
                {locating ? "GPS 위치를 확인 중입니다..." : compactAddress(displayAddress)}
              </p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                {detailAddress || "필요하면 상세 위치를 추가해 주세요."}
              </p>
            </div>
          </div>
          <input
            className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-lgred"
            value={detailAddress}
            onChange={(event) => setDetailAddress(event.target.value)}
            placeholder="예: 건물 앞, 지하주차장 입구"
          />
          <button
            className="mt-3 h-11 w-full rounded-2xl border border-lgred/20 bg-white text-sm font-black text-lgred"
            onClick={() => void detectCurrentLocation()}
            type="button"
          >
            현재 위치 다시 확인
          </button>
        </div>
      ) : (
        <LocationEditor
          address={pickupAddress === loadingAddressText ? "" : pickupAddress}
          detailAddress={detailAddress}
          onAddressChange={setPickupAddress}
          onCoordinateChange={setManualCoords}
          onDetailAddressChange={setDetailAddress}
        />
      )}

      {locationError ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-bold leading-5 text-red-600">
          {locationError}
        </p>
      ) : null}

      {stage === "ready" ? (
        <button
          className="mt-4 h-[52px] w-full rounded-2xl bg-[#202632] text-base font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canBook || locating}
          onClick={() => void startMatching()}
          type="button"
        >
          근처 수거 크루 찾기
        </button>
      ) : null}

      {stage === "searching" ? (
        <div className="mt-4 rounded-3xl bg-[#202632] px-4 py-5 text-center text-white">
          <Loader2 className="mx-auto animate-spin" size={24} />
          <p className="mt-3 text-base font-black">근처 수거 크루를 찾고 있어요</p>
          <p className="mt-1 text-xs font-semibold text-white/70">
            선택한 위치를 기준으로 가장 가까운 크루를 연결하고 있습니다.
          </p>
        </div>
      ) : null}

      {stage === "matched" ? (
        <>
          <div className="mt-4 rounded-3xl border border-lgred/10 bg-lgred/5 p-4">
            <p className="text-xs font-black text-lgred">매칭 완료</p>
            <p className="mt-1 text-lg font-black text-ink">LG 수거 크루가 배정되었습니다</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">예상 도착 시간 약 12분</p>
          </div>
          <button
            className="mt-4 h-[52px] w-full rounded-2xl bg-lgred text-base font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={!canBook || loading || !activeCoords}
            onClick={() =>
              onBooking({
                mode: "call",
                reservedAt: "바로콜 매칭 완료",
                pickupAddress,
                detailAddress: detailAddress || (pickupMethod === "gps" ? "현재 위치" : ""),
                pickupLat: activeCoords?.lat,
                pickupLng: activeCoords?.lng,
              })
            }
            type="button"
          >
            {loading ? "수거 연결 중..." : "이 위치로 바로콜 요청"}
          </button>
        </>
      ) : null}
    </div>
  );
}

function PickupPreviewMap({
  addressLabel,
  coordinates,
  locating,
}: {
  addressLabel: string;
  coordinates: PickupCoordinates | null;
  locating: boolean;
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || !coordinates) {
    return (
      <div className="relative h-[360px] bg-[radial-gradient(circle_at_72%_24%,rgba(255,184,0,.25),transparent_18%),linear-gradient(180deg,#f5f6f8,#e8edf3)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.16)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.16)_1px,transparent_1px)] bg-[length:28px_28px]" />
        <span className="absolute left-[64%] top-0 h-full w-16 bg-[#f7ebbe]/70" />
        <span className="absolute bottom-[26%] left-0 right-0 h-16 bg-[#f7ebbe]/70" />
        <span className="absolute bottom-[43%] left-[58%] h-16 w-16 rotate-45 bg-[#f7ebbe]/70" />
        <div className="absolute left-[54%] top-[35%] z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#1f6fff] text-white shadow-xl">
          <MapPin size={22} />
        </div>
        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-ink shadow">
          {locating ? "현재 위치 확인 중" : addressLabel}
        </div>
      </div>
    );
  }

  return <GooglePickupMap apiKey={apiKey} coordinates={coordinates} />;
}

function GooglePickupMap({
  apiKey,
  coordinates,
}: {
  apiKey: string;
  coordinates: PickupCoordinates;
}) {
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: apiKey });

  if (loadError) {
    return (
      <div className="relative h-[360px] bg-[radial-gradient(circle_at_72%_24%,rgba(255,184,0,.25),transparent_18%),linear-gradient(180deg,#f5f6f8,#e8edf3)]">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.16)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.16)_1px,transparent_1px)] bg-[length:28px_28px]" />
        <span className="absolute left-[64%] top-0 h-full w-16 bg-[#f7ebbe]/70" />
        <span className="absolute bottom-[26%] left-0 right-0 h-16 bg-[#f7ebbe]/70" />
        <span className="absolute bottom-[43%] left-[58%] h-16 w-16 rotate-45 bg-[#f7ebbe]/70" />
        <div className="absolute left-[54%] top-[35%] z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#1f6fff] text-white shadow-xl">
          <MapPin size={22} />
        </div>
        <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-ink shadow">
          지도 로딩 오류
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="h-[360px] animate-pulse bg-slate-100" />;
  }

  return (
    <GoogleMap
      center={coordinates}
      mapContainerClassName="h-[360px] w-full"
      options={{
        clickableIcons: false,
        disableDefaultUI: true,
        gestureHandling: "greedy",
        styles: [
          { featureType: "poi", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "off" }] },
        ],
      }}
      zoom={16}
    >
      <MarkerF position={coordinates} label={{ color: "#ffffff", fontWeight: "900", text: "내 위치" }} />
    </GoogleMap>
  );
}

function LocationEditor({
  address,
  detailAddress,
  onAddressChange,
  onCoordinateChange,
  onDetailAddressChange,
}: {
  address: string;
  detailAddress: string;
  onAddressChange: (address: string) => void;
  onCoordinateChange: (coordinates: PickupCoordinates) => void;
  onDetailAddressChange: (address: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(address);
  const [lockedAddress, setLockedAddress] = useState(address);

  useEffect(() => {
    setSelectedAddress(address);
  }, [address]);

  useEffect(() => {
    const query = selectedAddress.trim();

    if (query.length < 3 || query === lockedAddress) {
      setSuggestions([]);
      setSearchingAddress(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearchingAddress(true);

      try {
        const params = new URLSearchParams({
          format: "json",
          q: query,
          countrycodes: "kr",
          limit: "5",
          addressdetails: "1",
        });
        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Address search failed");
        }

        const data = (await response.json()) as AddressSuggestion[];
        setSuggestions(data);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearchingAddress(false);
        }
      }
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lockedAddress, selectedAddress]);

  const handleAddressInput = (value: string) => {
    setSelectedAddress(value);
    setLockedAddress("");
    onAddressChange(value);
  };

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion.display_name);
    setLockedAddress(suggestion.display_name);
    setSuggestions([]);
    onAddressChange(suggestion.display_name);
    onCoordinateChange({
      lat: Number(suggestion.lat),
      lng: Number(suggestion.lon),
    });
  };

  return (
    <div className="mt-4 rounded-3xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lgred/10 text-lgred">
          <Search size={18} />
        </span>
        <div>
          <p className="text-sm font-black text-ink">수거 위치 직접 입력</p>
          <p className="text-xs font-semibold text-slate-400">
            주소와 상세 위치를 입력하면 수거 지점을 정확히 저장할 수 있습니다.
          </p>
        </div>
      </div>

      <input
        className="h-11 w-full rounded-2xl border border-lgred/20 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-lgred"
        value={selectedAddress}
        onChange={(event) => handleAddressInput(event.target.value)}
        placeholder="주소를 검색하거나 직접 입력해 주세요"
      />
      <input
        className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-lgred"
        value={detailAddress}
        onChange={(event) => onDetailAddressChange(event.target.value)}
        placeholder="상세 주소를 입력해 주세요"
      />

      <div className="mt-2 min-h-[18px]">
        {searchingAddress ? (
          <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-slate-400">
            <Loader2 className="animate-spin" size={13} />
            주소 검색 중...
          </div>
        ) : selectedAddress.trim().length >= 3 && suggestions.length === 0 && selectedAddress !== lockedAddress ? (
          <p className="px-1 text-[11px] font-semibold text-slate-400">
            검색 결과가 없으면 입력한 주소 그대로 진행할 수 있습니다.
          </p>
        ) : null}
      </div>

      {suggestions.length > 0 ? (
        <div className="mt-3 max-h-36 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${suggestion.display_name}`}
              className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0"
              onClick={() => handleSuggestionSelect(suggestion)}
              type="button"
            >
              <span className="line-clamp-2 text-[12px] font-bold leading-5 text-ink">
                {suggestion.display_name}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
