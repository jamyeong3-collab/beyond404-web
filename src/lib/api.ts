import type { SwapRequest } from "@/types/swap";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  (typeof window === "undefined"
    ? "http://127.0.0.1:8080"
    : `${window.location.protocol}//${window.location.hostname}:8080`);

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export type PickupLocationPayload = {
  address: string;
  detailAddress?: string;
  pickupLat: number;
  pickupLng: number;
};

export type BookingPayload = PickupLocationPayload & {
  bookingDate?: string;
  bookingTime?: string;
};

export function createSwapRequest(applianceType = "washing_machine") {
  return request<SwapRequest>("/api/swap-requests", {
    method: "POST",
    body: JSON.stringify({
      userName: "Demo User",
      phoneNumber: "+91-90000-00000",
      applianceType,
    }),
  });
}

export function analyzePhoto(id: number, fileName: string, applianceType = "washing_machine") {
  return request<SwapRequest>(`/api/swap-requests/${id}/photos`, {
    method: "POST",
    body: JSON.stringify({ fileName, applianceType }),
  });
}

export function confirmBooking(id: number, booking: BookingPayload) {
  return request<SwapRequest>(`/api/swap-requests/${id}/booking`, {
    method: "POST",
    body: JSON.stringify({
      bookingDate: booking.bookingDate ?? "2026-06-12",
      bookingTime: booking.bookingTime ?? "10:00",
      address: booking.address,
      detailAddress: booking.detailAddress ?? "",
      pickupLat: booking.pickupLat,
      pickupLng: booking.pickupLng,
    }),
  });
}

export function completeFinalValuation(id: number) {
  return request<SwapRequest>(`/api/swap-requests/${id}/final-valuation/mock`, {
    method: "POST",
  });
}

export function acceptPreValuation(id: number) {
  return request<SwapRequest>(`/api/swap-requests/${id}/pre-valuation/accept`, {
    method: "POST",
  });
}

export function requestInstantCall(id: number, pickup: PickupLocationPayload) {
  return request<SwapRequest>(`/api/swap-requests/${id}/instant-call`, {
    method: "POST",
    body: JSON.stringify({
      address: pickup.address,
      detailAddress: pickup.detailAddress ?? "",
      pickupLat: pickup.pickupLat,
      pickupLng: pickup.pickupLng,
    }),
  });
}

export function getTracking(id: number) {
  return request<SwapRequest>(`/api/swap-requests/${id}/tracking`);
}

export function requestReReview(id: number, reason: string) {
  return request<SwapRequest>(`/api/swap-requests/${id}/re-review`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export function completeReReview(id: number) {
  return request<SwapRequest>(`/api/swap-requests/${id}/re-review/mock-complete`, {
    method: "POST",
  });
}

export function issueCredit(id: number) {
  return request<SwapRequest>(`/api/swap-requests/${id}/credits`, {
    method: "POST",
  });
}
