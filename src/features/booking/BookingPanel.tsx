"use client";

import { getBookingAvailability } from "@/lib/api";
import type { BookingAvailabilitySlot } from "@/lib/api";
import type { SwapRequest } from "@/types/swap";
import { CalendarCheck, Crosshair, Loader2, MapPin, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";

type BookingPanelProps = {
  swapRequest: SwapRequest | null;
  loading: boolean;
  bookingPurpose?: BookingPurpose;
  errorMessage?: string;
  onBooking: (booking: BookingSelection) => void;
};

type BookingMode = "schedule" | "call";
type PickupMethod = "gps" | "manual";
export type BookingPurpose = "pickup" | "installation";

type BookingCopy = {
  title: string;
  description: string;
  notice?: string;
  scheduleModeLabel: string;
  callModeLabel: string;
  dateTitle: string;
  datePickerLabel: string;
  timeTitle: string;
  timeDescription: string;
  unavailableTimeLabel: string;
  scheduleLoadingLabel: string;
  scheduleSubmitLabel: string;
  addressMapFallback: string;
  locationPermissionError: string;
  locationFetchError: string;
  manualRequiredError: string;
  addressNotFoundError: string;
  coordinateError: string;
  callReservedAt: string;
  currentDetailLabel: string;
  mapDescription: string;
  currentLocationEyebrow: string;
  currentAddressFallback: string;
  detailHint: string;
  detailPlaceholder: string;
  refreshLocationLabel: string;
  matchingLabel: string;
  callLoadingLabel: string;
  callSubmitLabel: string;
  mapAdjustHint: string;
  mapPinLabel: string;
  manualTitle: string;
  manualDescription: string;
  manualButtonLabel: string;
  manualAddressPlaceholder: string;
  manualDetailPlaceholder: string;
  manualSecureError: string;
  manualFetchError: string;
};

type PickupCoordinates = {
  lat: number;
  lng: number;
};

type AddressSuggestion = {
  display_name: string;
  lat: string;
  lon: string;
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

const LeafletTrackingMap = dynamic(
  () => import("@/components/maps/LeafletTrackingMap").then((module) => module.LeafletTrackingMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[linear-gradient(180deg,#f5f6f8,#e8edf3)]" />,
  },
);

const GoogleCanvasMap = dynamic(
  () => import("@/components/maps/GoogleCanvasMap").then((module) => module.GoogleCanvasMap),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-[linear-gradient(180deg,#f5f6f8,#e8edf3)]" />,
  },
);

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const defaultPickupCoords = { lat: 37.5665, lng: 126.978 };
const defaultAddress = "서울특별시 중구 세종대로 110";

const bookingCopies: Record<BookingPurpose, BookingCopy> = {
  pickup: {
    title: "수거 예약을 진행해요",
    description:
      "시간 예약은 날짜와 시간을 직접 선택하고, 바로콜은 현재 위치 또는 직접 입력한 주소를 기준으로 가장 가까운 수거 크루를 찾아요.",
    scheduleModeLabel: "시간 예약",
    callModeLabel: "바로콜",
    dateTitle: "수거 날짜를 선택해요",
    datePickerLabel: "달력에서 수거 날짜를 선택해요",
    timeTitle: "수거 시간을 선택해요",
    timeDescription: "09:00부터 18:00까지, 30분 단위로 예약 가능한 시간만 표시돼요.",
    unavailableTimeLabel: "예약 마감",
    scheduleLoadingLabel: "예약 접수 중...",
    scheduleSubmitLabel: "수거 요청을 예약했어요",
    addressMapFallback: "수거 위치를 검색해 주세요",
    locationPermissionError:
      "현재 접속 환경에서는 GPS 사용이 제한되어 있어요. HTTPS 환경에서 위치 권한을 허용하거나 직접 입력으로 진행해 주세요.",
    locationFetchError: "현재 위치를 가져오지 못했어요. 위치 권한을 허용하거나 직접 입력으로 진행해 주세요.",
    manualRequiredError: "수거 위치를 직접 입력해 주세요.",
    addressNotFoundError: "입력한 주소를 찾지 못했어요. 주소를 다시 확인해 주세요.",
    coordinateError: "수거 위치 좌표를 확인하지 못했어요. 다시 시도해 주세요.",
    callReservedAt: "바로콜 접수",
    currentDetailLabel: "현재 위치",
    mapDescription: "지도에는 현재 선택된 수거 위치가 표시돼요.",
    currentLocationEyebrow: "내 위치 확인",
    currentAddressFallback: "현재 위치를 확인해 주세요",
    detailHint: "필요하면 상세 위치를 추가해 주세요.",
    detailPlaceholder: "예: 건물 앞, 지하주차장 입구",
    refreshLocationLabel: "현재 위치를 다시 확인할게요",
    matchingLabel: "근처 수거 크루 찾는 중...",
    callLoadingLabel: "바로콜 접수 중...",
    callSubmitLabel: "근처 수거 크루를 찾을게요",
    mapAdjustHint: "GPS가 어긋나면 지도에서 실제 수거 위치를 눌러 보정하세요.",
    mapPinLabel: "수거 위치",
    manualTitle: "수거 위치를 직접 입력해요",
    manualDescription: "현재 위치를 불러오거나 주소 검색 결과를 선택해 수거 위치를 지정할 수 있어요.",
    manualButtonLabel: "현재 위치로 지정할게요",
    manualAddressPlaceholder: "서울특별시 중구 세종대로 110",
    manualDetailPlaceholder: "상세 위치를 입력해 주세요",
    manualSecureError: "현재 위치는 HTTPS 또는 localhost 환경에서만 사용할 수 있어요.",
    manualFetchError: "현재 위치를 가져오지 못했어요. 위치 권한을 허용하거나 주소를 직접 입력해 주세요.",
  },
  installation: {
    title: "설치 예약을 진행해요",
    description:
      "새 LG 제품 설치 일정을 선택하면 기존 제품 수거도 같은 방문으로 함께 진행돼요.",
    notice: "설치 기사 방문 시 새 제품 설치와 기존 제품 수거를 동시에 진행해요.",
    scheduleModeLabel: "설치 시간 예약",
    callModeLabel: "빠른 설치 요청",
    dateTitle: "설치 날짜를 선택해요",
    datePickerLabel: "달력에서 설치 날짜를 선택해요",
    timeTitle: "설치 시간을 선택해요",
    timeDescription: "설치 가능 시간만 표시돼요. 선택한 시간에 기존 제품 수거도 함께 진행돼요.",
    unavailableTimeLabel: "예약 마감",
    scheduleLoadingLabel: "설치 예약 접수 중...",
    scheduleSubmitLabel: "설치 예약을 요청할게요",
    addressMapFallback: "설치 위치를 검색해 주세요",
    locationPermissionError:
      "현재 접속 환경에서는 GPS 사용이 제한되어 있어요. HTTPS 환경에서 위치 권한을 허용하거나 설치 위치를 직접 입력해 주세요.",
    locationFetchError: "현재 위치를 가져오지 못했어요. 위치 권한을 허용하거나 설치 위치를 직접 입력해 주세요.",
    manualRequiredError: "설치 위치를 직접 입력해 주세요.",
    addressNotFoundError: "입력한 주소를 찾지 못했어요. 주소를 다시 확인해 주세요.",
    coordinateError: "설치 위치 좌표를 확인하지 못했어요. 다시 시도해 주세요.",
    callReservedAt: "빠른 설치 요청 접수",
    currentDetailLabel: "현재 위치",
    mapDescription: "지도에는 현재 선택된 설치 위치가 표시돼요. 이 위치에서 설치와 기존 제품 수거가 함께 진행돼요.",
    currentLocationEyebrow: "설치 위치 확인",
    currentAddressFallback: "설치 위치를 확인해 주세요",
    detailHint: "엘리베이터, 주차, 기존 제품 위치처럼 설치에 필요한 정보를 추가해 주세요.",
    detailPlaceholder: "예: 엘리베이터 있음, 기존 세탁기 다용도실",
    refreshLocationLabel: "현재 위치를 다시 확인할게요",
    matchingLabel: "근처 설치 크루 찾는 중...",
    callLoadingLabel: "설치 요청 접수 중...",
    callSubmitLabel: "근처 설치 크루를 찾을게요",
    mapAdjustHint: "GPS가 어긋나면 지도에서 실제 설치 위치를 눌러 보정하세요.",
    mapPinLabel: "설치 위치",
    manualTitle: "설치 위치를 직접 입력해요",
    manualDescription: "현재 위치를 불러오거나 주소 검색 결과를 선택해 설치 위치를 지정할 수 있어요.",
    manualButtonLabel: "현재 위치로 지정할게요",
    manualAddressPlaceholder: "서울특별시 중구 세종대로 110",
    manualDetailPlaceholder: "설치 공간과 기존 제품 위치를 입력해 주세요",
    manualSecureError: "현재 위치는 HTTPS 또는 localhost 환경에서만 사용할 수 있어요.",
    manualFetchError: "현재 위치를 가져오지 못했어요. 위치 권한을 허용하거나 설치 주소를 직접 입력해 주세요.",
  },
};

const timeSlots = Array.from({ length: 19 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

function todayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  if (!value) {
    return "날짜를 선택해 주세요.";
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

function formatReservedAt(date: string, time: string) {
  return `${date} ${time}`;
}

function isSecureGpsAvailable() {
  if (typeof window === "undefined") return false;
  return window.isSecureContext && "geolocation" in navigator;
}

async function reverseGeocode(latitude: number, longitude: number) {
  const params = new URLSearchParams({
    format: "json",
    lat: String(latitude),
    lon: String(longitude),
  });
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);

  if (!response.ok) {
    throw new Error("reverse geocoding failed");
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
    throw new Error("address geocoding failed");
  }

  const data = (await response.json()) as AddressSuggestion[];
  const first = data[0];
  if (!first) {
    throw new Error("address not found");
  }

  return {
    address: first.display_name,
    coordinates: {
      lat: Number(first.lat),
      lng: Number(first.lon),
    },
  };
}

export function BookingPanel({ swapRequest, loading, bookingPurpose = "pickup", errorMessage, onBooking }: BookingPanelProps) {
  const [mode, setMode] = useState<BookingMode>("schedule");
  const canBook = Boolean(swapRequest && swapRequest.preValuation.maxEstimatedValue > 0);
  const copy = bookingCopies[bookingPurpose];

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
        <CalendarCheck size={18} />
        {copy.title}
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
<<<<<<< HEAD
        시간 예약은 예약한 날짜와 시간에 맞춰 CS 엔지니어가 방문하도록 접수하고, 바로콜은 현재 위치 또는 직접 입력한 주소로
        즉시 수거 예약을 진행합니다.
=======
        {copy.description}
>>>>>>> origin/main
      </p>
      {copy.notice ? (
        <p className="mt-3 rounded-2xl bg-lgred/5 px-4 py-3 text-xs font-bold leading-5 text-lgred">
          {copy.notice}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <ModeButton active={mode === "schedule"} label={copy.scheduleModeLabel} onClick={() => setMode("schedule")} />
        <ModeButton active={mode === "call"} label={copy.callModeLabel} onClick={() => setMode("call")} />
      </div>

      <div className="mt-4">
        {mode === "schedule" ? (
          <ScheduleBooking canBook={canBook} copy={copy} loading={loading} onBooking={onBooking} />
        ) : (
          <InstantCallBooking canBook={canBook} copy={copy} loading={loading} onBooking={onBooking} />
        )}
      </div>

      {errorMessage ? (
        <p className="mt-3 rounded-2xl bg-red-50 px-4 py-3 text-xs font-semibold leading-5 text-red-600">
          {errorMessage}
        </p>
      ) : null}
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
      className={`h-10 rounded-xl text-[13px] transition ${
        active ? "bg-white font-bold text-lgred shadow-sm" : "font-semibold text-slate-500"
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
  copy,
  loading,
  onBooking,
}: {
  canBook: boolean;
  copy: BookingCopy;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
}) {
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [pickupAddress, setPickupAddress] = useState(defaultAddress);
  const [detailAddress, setDetailAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<PickupCoordinates>(defaultPickupCoords);
  const [availability, setAvailability] = useState<BookingAvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [pinLocating, setPinLocating] = useState(false);

  const handleUseCurrentLocation = async () => {
    if (!isSecureGpsAvailable()) {
      return;
    }
    setPinLocating(true);
    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position.coords),
          (error) => reject(error),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        );
      });
      const nextCoords = { lat: coords.latitude, lng: coords.longitude };
      let nextAddress = `현재 위치 (${nextCoords.lat.toFixed(5)}, ${nextCoords.lng.toFixed(5)})`;
      try {
        nextAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
      } catch {
        // 좌표만으로도 충분히 유효해요.
      }
      setPickupCoords(nextCoords);
      setPickupAddress(nextAddress);
    } catch {
      // 위치 권한 거부/실패 시 조용히 무시해요.
    } finally {
      setPinLocating(false);
    }
  };

  useEffect(() => {
    let active = true;

    async function loadAvailability() {
      setAvailabilityLoading(true);
      setAvailabilityError("");
      try {
        const result = await getBookingAvailability(selectedDate);
        if (!active) return;
        setAvailability(result.slots);
        const nextAvailable = result.slots.find((slot) => slot.available)?.time ?? "";
        setSelectedTime((currentSelectedTime) => {
          const selectedSlot = result.slots.find((slot) => slot.time === currentSelectedTime);
          return !selectedSlot?.available && nextAvailable ? nextAvailable : currentSelectedTime;
        });
      } catch {
        if (!active) return;
        setAvailability([]);
        setAvailabilityError("예약 현황을 불러오지 못했어요. 잠시 후 다시 확인해 주세요.");
      } finally {
        if (active) {
          setAvailabilityLoading(false);
        }
      }
    }

    void loadAvailability();

    return () => {
      active = false;
    };
  }, [selectedDate]);

  const availabilityByTime = useMemo(
    () => new Map(availability.map((slot) => [slot.time, slot])),
    [availability],
  );
  const selectedSlot = availabilityByTime.get(selectedTime);
  const selectedTimeUnavailable = selectedSlot ? !selectedSlot.available : false;

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-slate-50">
        <PickupPreviewMap
          addressLabel={pickupAddress || "수거 위치를 확인해 주세요."}
          coordinates={pickupCoords}
          onLocate={() => void handleUseCurrentLocation()}
          locating={pinLocating}
          pinLabel="P"
        />
      </div>

<<<<<<< HEAD
      <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
        예약 시간에 맞춰 방문할 수 있도록 수거 위치와 예약 일정을 함께 확인합니다.
      </p>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        <p className="text-sm font-black text-ink">예약 날짜 선택</p>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
          <label className="block text-xs font-black text-slate-400" htmlFor="pickup-date">
            달력에서 날짜 선택
          </label>
          <input
            id="pickup-date"
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-black text-ink outline-none focus:border-lgred"
            min={todayString()}
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
          />
          <p className="mt-3 text-sm font-black text-ink">{formatDateLabel(selectedDate)}</p>
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        <p className="text-sm font-black text-ink">예약 시간 선택</p>
        <p className="mt-1 text-xs font-semibold text-slate-400">
          09:00부터 18:00까지, 30분 단위로 예약 가능한 시간만 표시됩니다.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {timeSlots.map((time) => {
            const active = time === selectedTime;
            const disabled = reservedTimeSlots.has(time);

            return (
              <button
                key={time}
                className={`h-11 rounded-xl border text-sm font-black transition ${
                  disabled
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                    : active
                      ? "border-lgred bg-lgred text-white"
                      : "border-slate-200 bg-white text-ink"
                }`}
                disabled={disabled}
                onClick={() => setSelectedTime(time)}
                type="button"
              >
                {time}
              </button>
            );
          })}
        </div>
      </div>

=======
>>>>>>> origin/main
      <ManualAddressEditor
        address={pickupAddress}
        copy={copy}
        detailAddress={detailAddress}
        onAddressChange={setPickupAddress}
        onCoordinateChange={setPickupCoords}
        onDetailAddressChange={setDetailAddress}
      />

      <button
        className="mt-4 h-12 w-full rounded-2xl bg-[#202632] text-[13px] font-bold text-white disabled:bg-slate-300"
        disabled={!canBook || loading || !selectedDate || availabilityLoading || selectedTimeUnavailable}
        onClick={() =>
          onBooking({
            mode: "schedule",
            reservedAt: formatReservedAt(selectedDate, selectedTime),
            pickupAddress,
            detailAddress,
            pickupLat: pickupCoords.lat,
            pickupLng: pickupCoords.lng,
            bookingDate: selectedDate,
            bookingTime: selectedTime,
          })
        }
        type="button"
      >
<<<<<<< HEAD
        {loading ? "예약 접수 중..." : "시간 예약하기"}
=======
        {loading ? copy.scheduleLoadingLabel : copy.scheduleSubmitLabel}
>>>>>>> origin/main
      </button>
    </div>
  );
}

function InstantCallBooking({
  canBook,
  copy,
  loading,
  onBooking,
}: {
  canBook: boolean;
  copy: BookingCopy;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
}) {
  const [pickupMethod, setPickupMethod] = useState<PickupMethod>("gps");
  const [pickupAddress, setPickupAddress] = useState(defaultAddress);
  const [detailAddress, setDetailAddress] = useState("");
  const [gpsCoords, setGpsCoords] = useState<PickupCoordinates | null>(null);
  const [manualCoords, setManualCoords] = useState<PickupCoordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [matching, setMatching] = useState(false);

  const activeCoords = pickupMethod === "gps" ? gpsCoords : manualCoords;
  const mapLabel = locating
    ? "현재 위치 확인 중..."
    : pickupMethod === "gps"
<<<<<<< HEAD
      ? pickupAddress || "현재 위치를 확인해 주세요."
      : detailAddress || pickupAddress || "수거 위치를 검색해 주세요.";
=======
      ? pickupAddress || copy.currentAddressFallback
      : detailAddress || pickupAddress || copy.addressMapFallback;
>>>>>>> origin/main

  const refreshCurrentLocation = async () => {
    if (!isSecureGpsAvailable()) {
      setGpsCoords(null);
      setLocationError(
        copy.locationPermissionError,
      );
      return null;
    }

    setLocating(true);
    setLocationError("");

    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position.coords),
          (error) => reject(error),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        );
      });

      const nextCoords = {
        lat: coords.latitude,
        lng: coords.longitude,
      };

      let nextAddress = `현재 위치 (${nextCoords.lat.toFixed(5)}, ${nextCoords.lng.toFixed(5)})`;
      try {
        nextAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
      } catch {
        // Reverse geocoding failure should not block GPS usage.
      }

      setGpsCoords(nextCoords);
      setPickupAddress(nextAddress);
      return { coords: nextCoords, address: nextAddress };
    } catch {
      setGpsCoords(null);
      setLocationError(copy.locationFetchError);
      return null;
    } finally {
      setLocating(false);
    }
  };

  useEffect(() => {
    if (pickupMethod === "gps") {
      void refreshCurrentLocation();
    }
  }, [pickupMethod]);

  const selectMapLocation = async (nextCoords: PickupCoordinates) => {
    setLocationError("");

    if (pickupMethod === "gps") {
      setGpsCoords(nextCoords);
    } else {
      setManualCoords(nextCoords);
    }

    let nextAddress = `선택 위치 (${nextCoords.lat.toFixed(5)}, ${nextCoords.lng.toFixed(5)})`;
    try {
      nextAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
    } catch {
      // Map tapping should still update coordinates even if address lookup fails.
    }

    setPickupAddress(nextAddress);
  };

  const startMatching = async () => {
    setMatching(true);
    setLocationError("");

    let finalAddress = pickupAddress;
    let finalCoords = activeCoords;

    if (pickupMethod === "gps") {
      if (!finalCoords) {
        const refreshed = await refreshCurrentLocation();
        if (!refreshed) {
          setMatching(false);
          return;
        }
        finalAddress = refreshed.address;
        finalCoords = refreshed.coords;
      }
    } else {
      const trimmedAddress = pickupAddress.trim();
      if (!trimmedAddress) {
        setLocationError(copy.manualRequiredError);
        setMatching(false);
        return;
      }

      try {
        const result = await geocodeAddress(trimmedAddress);
        finalAddress = result.address;
        finalCoords = result.coordinates;
        setPickupAddress(result.address);
        setManualCoords(result.coordinates);
      } catch {
        setLocationError(copy.addressNotFoundError);
        setMatching(false);
        return;
      }
    }

    if (!finalCoords) {
      setLocationError(copy.coordinateError);
      setMatching(false);
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    onBooking({
      mode: "call",
      reservedAt: copy.callReservedAt,
      pickupAddress: finalAddress,
      detailAddress: detailAddress || (pickupMethod === "gps" ? copy.currentDetailLabel : ""),
      pickupLat: finalCoords.lat,
      pickupLng: finalCoords.lng,
    });

    setMatching(false);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-slate-50">
        <PickupPreviewMap
          adjustHint={copy.mapAdjustHint}
          addressLabel={mapLabel}
          coordinates={activeCoords}
          onCoordinateSelect={(coordinates) => void selectMapLocation(coordinates)}
          onLocate={() => void refreshCurrentLocation()}
          locating={locating}
          pinLabel={pickupMethod === "gps" ? "M" : "P"}
        />
      </div>

      <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
<<<<<<< HEAD
        현재 선택한 수거 위치를 지도에서 바로 확인할 수 있습니다.
=======
        {copy.mapDescription}
>>>>>>> origin/main
      </p>

      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <ModeButton active={pickupMethod === "gps"} label="현재 위치" onClick={() => setPickupMethod("gps")} />
        <ModeButton active={pickupMethod === "manual"} label="직접 입력" onClick={() => setPickupMethod("manual")} />
      </div>

      {pickupMethod === "gps" ? (
        <div className="mt-4 rounded-3xl bg-slate-50 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lgred/10 text-lgred">
              <Crosshair size={18} />
            </span>
            <div>
<<<<<<< HEAD
              <p className="text-xs font-black text-slate-400">내 위치 확인</p>
              <p className="mt-1 text-lg font-black text-ink">{pickupAddress || "현재 위치를 확인해 주세요."}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">필요하면 상세 위치를 추가해 주세요.</p>
=======
              <p className="text-xs font-semibold text-slate-500">{copy.currentLocationEyebrow}</p>
              <p className="mt-1 text-[15px] font-bold leading-5 text-ink">{pickupAddress || copy.currentAddressFallback}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{copy.detailHint}</p>
>>>>>>> origin/main
            </div>
          </div>
          <input
            className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-ink outline-none focus:border-lgred"
            placeholder={copy.detailPlaceholder}
            value={detailAddress}
            onChange={(event) => setDetailAddress(event.target.value)}
          />
          <button
            className="mt-3 h-11 w-full rounded-2xl border border-lgred/20 bg-white text-[13px] font-bold text-lgred"
            onClick={() => void refreshCurrentLocation()}
            type="button"
          >
            {copy.refreshLocationLabel}
          </button>
        </div>
      ) : (
        <ManualAddressEditor
          address={pickupAddress}
          copy={copy}
          detailAddress={detailAddress}
          onAddressChange={setPickupAddress}
          onCoordinateChange={setManualCoords}
          onDetailAddressChange={setDetailAddress}
        />
      )}

      {locationError ? (
        <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
          {locationError}
        </p>
      ) : null}

      <button
        className="mt-4 h-12 w-full rounded-2xl bg-[#202632] text-[13px] font-bold text-white disabled:bg-slate-300"
        disabled={!canBook || loading || locating || matching}
        onClick={() => void startMatching()}
        type="button"
      >
<<<<<<< HEAD
        {matching ? "바로콜 예약 접수 중..." : loading ? "바로콜 접수 중..." : "바로콜 예약하기"}
=======
        {matching ? copy.matchingLabel : loading ? copy.callLoadingLabel : copy.callSubmitLabel}
>>>>>>> origin/main
      </button>
    </div>
  );
}

function PickupPreviewMap({
  adjustHint,
  addressLabel,
  coordinates,
  onCoordinateSelect,
  onLocate,
  locating = false,
  pinLabel,
}: {
  adjustHint?: string;
  addressLabel: string;
  coordinates: PickupCoordinates | null;
  onCoordinateSelect?: (coordinates: PickupCoordinates) => void;
  onLocate?: () => void;
  locating?: boolean;
  pinLabel: string;
}) {
  if (!coordinates) {
    return <PickupMapFallback addressLabel={addressLabel} />;
  }

  return (
    <div className="relative h-[360px] w-full overflow-hidden bg-slate-100">
      <LeafletTrackingMap
        center={coordinates}
        className="h-full w-full"
        maxZoom={20}
        markers={[
          {
            key: "pickup-preview",
            label: pinLabel,
            position: coordinates,
            variant: "pickup",
          },
        ]}
        onMapClick={onCoordinateSelect}
        path={[]}
        zoom={19}
      />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-bold text-ink shadow">
        {addressLabel}
      </div>
<<<<<<< HEAD
      <div className="pointer-events-none absolute left-4 right-4 top-16 rounded-2xl bg-white/90 px-4 py-3 text-center text-xs font-black text-slate-700 shadow">
        GPS가 어긋나면 지도에서 실제 수거 위치를 눌러 보정하세요.
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-[#1f6fff] px-3 py-2 text-xs font-black text-white shadow-lg">
        <span className="flex items-center gap-1">
          <MapPin size={14} />
          {pinLabel === "M" ? "현재 위치" : "수거 위치"}
        </span>
      </div>
=======
      {adjustHint ? (
        <div className="pointer-events-none absolute left-4 right-4 top-16 rounded-2xl bg-white/90 px-4 py-3 text-center text-xs font-semibold text-slate-700 shadow">
          {adjustHint}
        </div>
      ) : null}
      <button
        type="button"
        aria-label="현재 위치로 이동"
        className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink shadow-lg transition active:scale-95 disabled:opacity-60"
        disabled={!onLocate || locating}
        onClick={onLocate}
      >
        {locating ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={22} />}
      </button>
>>>>>>> origin/main
    </div>
  );
}

function PickupMapFallback({
  addressLabel,
  showMarker = false,
}: {
  addressLabel: string;
  showMarker?: boolean;
}) {
  return (
    <div className="relative h-[360px] bg-[radial-gradient(circle_at_72%_24%,rgba(255,184,0,.25),transparent_18%),linear-gradient(180deg,#f5f6f8,#e8edf3)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(148,163,184,.16)_1px,transparent_1px),linear-gradient(0deg,rgba(148,163,184,.16)_1px,transparent_1px)] bg-[length:28px_28px]" />
      <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-[13px] font-bold text-ink shadow">
        {addressLabel}
      </div>
      {showMarker ? (
        <div className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-[#1f6fff] text-white shadow-xl">
          <MapPin size={20} />
        </div>
      ) : null}
    </div>
  );
}

function ManualAddressEditor({
  address,
  copy,
  detailAddress,
  onAddressChange,
  onCoordinateChange,
  onDetailAddressChange,
}: {
  address: string;
  copy: BookingCopy;
  detailAddress: string;
  onAddressChange: (address: string) => void;
  onCoordinateChange: (coordinates: PickupCoordinates) => void;
  onDetailAddressChange: (address: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [inputValue, setInputValue] = useState(address);

  useEffect(() => {
    setInputValue(address);
  }, [address]);

  useEffect(() => {
    const query = inputValue.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
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
          throw new Error("address search failed");
        }
        const data = (await response.json()) as AddressSuggestion[];
        setSuggestions(data);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setSearching(false);
        }
      }
    }, 350);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [inputValue]);

  const handleSelect = (suggestion: AddressSuggestion) => {
    setInputValue(suggestion.display_name);
    setSuggestions([]);
    setLocationError("");
    onAddressChange(suggestion.display_name);
    onCoordinateChange({
      lat: Number(suggestion.lat),
      lng: Number(suggestion.lon),
    });
  };

  const useCurrentLocation = async () => {
    if (!isSecureGpsAvailable()) {
      setLocationError(copy.manualSecureError);
      return;
    }

    setLocating(true);
    setLocationError("");

    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => resolve(position.coords),
          (error) => reject(error),
          { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
        );
      });
      const nextCoords = {
        lat: coords.latitude,
        lng: coords.longitude,
      };

      let nextAddress = `현재 위치 (${nextCoords.lat.toFixed(5)}, ${nextCoords.lng.toFixed(5)})`;
      try {
        nextAddress = await reverseGeocode(nextCoords.lat, nextCoords.lng);
      } catch {
        // Coordinates are still useful even if reverse geocoding fails.
      }

      setInputValue(nextAddress);
      setSuggestions([]);
      onAddressChange(nextAddress);
      onCoordinateChange(nextCoords);
    } catch {
      setLocationError(copy.manualFetchError);
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="mt-4 rounded-3xl bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-lgred/10 text-lgred">
          <Search size={18} />
        </span>
        <div>
          <p className="text-[13px] font-bold text-ink">{copy.manualTitle}</p>
          <p className="text-xs font-semibold text-slate-500">
            {copy.manualDescription}
          </p>
        </div>
      </div>

      <input
        className="h-11 w-full rounded-2xl border border-lgred/20 bg-white px-4 text-[13px] font-semibold text-ink outline-none focus:border-lgred"
        placeholder={copy.manualAddressPlaceholder}
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          onAddressChange(event.target.value);
        }}
      />
      <input
<<<<<<< HEAD
        className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-lgred"
        placeholder="상세 위치를 입력해 주세요."
=======
        className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-[13px] font-semibold text-ink outline-none focus:border-lgred"
        placeholder={copy.manualDetailPlaceholder}
>>>>>>> origin/main
        value={detailAddress}
        onChange={(event) => onDetailAddressChange(event.target.value)}
      />

      <div className="mt-2 min-h-4">
        {searching ? (
          <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-slate-500">
            <Loader2 className="animate-spin" size={13} />
            주소 검색 중...
          </div>
        ) : null}
      </div>

      {locationError ? (
        <p className="mt-2 rounded-2xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-700">
          {locationError}
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="mt-3 max-h-36 overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          {suggestions.map((suggestion) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}-${suggestion.display_name}`}
              className="block w-full border-b border-slate-100 px-4 py-3 text-left last:border-b-0"
              onClick={() => handleSelect(suggestion)}
              type="button"
            >
              <span className="line-clamp-2 text-[12px] font-bold leading-5 text-ink">{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
