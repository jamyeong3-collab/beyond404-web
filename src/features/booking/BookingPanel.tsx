"use client";

import type { SwapRequest } from "@/types/swap";
import { CalendarCheck, Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BookingPanelProps = {
  swapRequest: SwapRequest | null;
  loading: boolean;
  onBooking: (booking: BookingSelection) => void;
};

type BookingMode = "schedule" | "call";
type PickupMethod = "gps" | "manual";

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

const defaultPickupCoords = { lat: 37.5665, lng: 126.978 };
const defaultAddress = "서울특별시 중구 세종대로 110";
const reservedTimeSlots = new Set(["11:30", "14:00", "16:30"]);

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
    return "날짜를 선택해 주세요";
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

function buildGoogleMapEmbedUrl(center: PickupCoordinates) {
  const params = new URLSearchParams({
    q: `${center.lat},${center.lng}`,
    z: "16",
    hl: "ko",
    output: "embed",
  });
  return `https://maps.google.com/maps?${params.toString()}`;
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

export function BookingPanel({ swapRequest, loading, onBooking }: BookingPanelProps) {
  const [mode, setMode] = useState<BookingMode>("schedule");
  const canBook = Boolean(swapRequest && swapRequest.preValuation.maxEstimatedValue > 0);

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <CalendarCheck size={18} />
        STEP 3. 수거 예약
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        시간 예약은 날짜와 시간을 직접 선택하고, 바로콜은 현재 위치 또는 직접 입력한 주소를 기준으로 가장 가까운
        수거 크루를 찾습니다.
      </p>

      <div className="mt-4 grid grid-cols-2 rounded-2xl bg-slate-100 p-1">
        <ModeButton active={mode === "schedule"} label="시간 예약" onClick={() => setMode("schedule")} />
        <ModeButton active={mode === "call"} label="바로콜" onClick={() => setMode("call")} />
      </div>

      <div className="mt-4">
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
  const firstAvailableTime = useMemo(
    () => timeSlots.find((time) => !reservedTimeSlots.has(time)) ?? "09:00",
    [],
  );
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [selectedTime, setSelectedTime] = useState(firstAvailableTime);
  const [pickupAddress, setPickupAddress] = useState(defaultAddress);
  const [detailAddress, setDetailAddress] = useState("");
  const [pickupCoords, setPickupCoords] = useState<PickupCoordinates>(defaultPickupCoords);

  return (
    <div>
      <div className="rounded-3xl bg-slate-50 p-4">
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

      <ManualAddressEditor
        address={pickupAddress}
        detailAddress={detailAddress}
        onAddressChange={setPickupAddress}
        onCoordinateChange={setPickupCoords}
        onDetailAddressChange={setDetailAddress}
      />

      <button
        className="mt-4 h-12 w-full rounded-2xl bg-[#202632] text-sm font-black text-white disabled:bg-slate-300"
        disabled={!canBook || loading || !selectedDate || reservedTimeSlots.has(selectedTime)}
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
        {loading ? "예약 접수 중..." : "시간 예약 요청"}
      </button>
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
      ? pickupAddress || "현재 위치를 확인해 주세요"
      : detailAddress || pickupAddress || "수거 위치를 검색해 주세요";

  const refreshCurrentLocation = async () => {
    if (!isSecureGpsAvailable()) {
      setGpsCoords(null);
      setLocationError(
        "현재 접속 환경에서는 GPS 사용이 제한되어 있습니다. HTTPS 환경에서 위치 권한을 허용하거나 직접 입력으로 진행해 주세요.",
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
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
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
      setLocationError("현재 위치를 가져오지 못했습니다. 위치 권한을 허용하거나 직접 입력으로 진행해 주세요.");
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
        setLocationError("수거 위치를 직접 입력해 주세요.");
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
        setLocationError("입력한 주소를 찾지 못했습니다. 주소를 다시 확인해 주세요.");
        setMatching(false);
        return;
      }
    }

    if (!finalCoords) {
      setLocationError("수거 위치 좌표를 확인하지 못했습니다. 다시 시도해 주세요.");
      setMatching(false);
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    onBooking({
      mode: "call",
      reservedAt: "바로콜 접수",
      pickupAddress: finalAddress,
      detailAddress: detailAddress || (pickupMethod === "gps" ? "현재 위치" : ""),
      pickupLat: finalCoords.lat,
      pickupLng: finalCoords.lng,
    });

    setMatching(false);
  };

  return (
    <div>
      <div className="overflow-hidden rounded-3xl bg-slate-50">
        <PickupPreviewMap
          addressLabel={mapLabel}
          coordinates={activeCoords}
          pinLabel={pickupMethod === "gps" ? "M" : "P"}
        />
      </div>

      <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-xs font-bold leading-5 text-slate-500">
        지도에는 현재 선택된 수거 위치가 표시됩니다.
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
              <p className="text-xs font-black text-slate-400">내 위치 확인</p>
              <p className="mt-1 text-lg font-black text-ink">{pickupAddress || "현재 위치를 확인해 주세요"}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">필요하면 상세 위치를 추가해 주세요.</p>
            </div>
          </div>
          <input
            className="mt-4 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-lgred"
            placeholder="예: 건물 앞, 지하주차장 입구"
            value={detailAddress}
            onChange={(event) => setDetailAddress(event.target.value)}
          />
          <button
            className="mt-3 h-11 w-full rounded-2xl border border-lgred/20 bg-white text-sm font-black text-lgred"
            onClick={() => void refreshCurrentLocation()}
            type="button"
          >
            현재 위치 다시 확인
          </button>
        </div>
      ) : (
        <ManualAddressEditor
          address={pickupAddress}
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
        className="mt-4 h-12 w-full rounded-2xl bg-[#202632] text-sm font-black text-white disabled:bg-slate-300"
        disabled={!canBook || loading || locating || matching}
        onClick={() => void startMatching()}
        type="button"
      >
        {matching ? "근처 수거 크루 찾는 중..." : loading ? "바로콜 접수 중..." : "근처 수거 크루 찾기"}
      </button>
    </div>
  );
}

function PickupPreviewMap({
  addressLabel,
  coordinates,
  pinLabel,
}: {
  addressLabel: string;
  coordinates: PickupCoordinates | null;
  pinLabel: string;
}) {
  if (!coordinates) {
    return <PickupMapFallback addressLabel={addressLabel} />;
  }

  const embedUrl = buildGoogleMapEmbedUrl(coordinates);

  return (
    <div className="relative h-[360px] w-full overflow-hidden bg-slate-100">
      <iframe
        className="h-full w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        src={embedUrl}
        title="pickup-preview-map"
      />
      <div className="pointer-events-none absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-ink shadow">
        {addressLabel}
      </div>
      <div className="pointer-events-none absolute bottom-4 right-4 rounded-full bg-[#1f6fff] px-3 py-2 text-xs font-black text-white shadow-lg">
        <span className="flex items-center gap-1">
          <MapPin size={14} />
          {pinLabel === "M" ? "내 위치" : "수거 위치"}
        </span>
      </div>
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
      <div className="absolute left-4 top-4 rounded-full bg-white/95 px-4 py-2 text-sm font-black text-ink shadow">
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
  const [searching, setSearching] = useState(false);
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
            주소 검색 결과를 선택하거나 직접 입력한 주소로 수거 위치를 지정할 수 있습니다.
          </p>
        </div>
      </div>

      <input
        className="h-11 w-full rounded-2xl border border-lgred/20 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-lgred"
        placeholder="서울특별시 중구 세종대로 110"
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          onAddressChange(event.target.value);
        }}
      />
      <input
        className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-ink outline-none focus:border-lgred"
        placeholder="상세 위치를 입력해 주세요"
        value={detailAddress}
        onChange={(event) => onDetailAddressChange(event.target.value)}
      />

      <div className="mt-2 min-h-[18px]">
        {searching ? (
          <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-slate-400">
            <Loader2 className="animate-spin" size={13} />
            주소 검색 중...
          </div>
        ) : null}
      </div>

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
