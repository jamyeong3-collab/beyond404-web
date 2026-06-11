import type { SwapRequest } from "@/types/swap";

export type DemoUser = {
  userId: number;
  userName: string;
  phoneNumber: string;
  thinqUserKey: string;
};

function resolveApiBaseUrl() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8080";
  }

  return "";
}

const API_BASE_URL = resolveApiBaseUrl();

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

export type CapturePayload = {
  exteriorPhotoFileName: string;
  labelPhotoFileName: string;
  agreedToCreditPolicy: boolean;
  applianceType: string;
  brand: string;
  modelName: string;
  estimatedAge: string;
  exteriorCondition: string;
};

export type BookingPayload = PickupLocationPayload & {
  bookingDate?: string;
  bookingTime?: string;
};

export function createSwapRequest(applianceType = "washing_machine") {
  return createSwapRequestForUser(
    {
      userName: "Demo User",
      phoneNumber: "+91-90000-00000",
    },
    applianceType,
  );
}

export function demoLogin(userName: string, phoneNumber: string) {
  return request<DemoUser>("/api/auth/demo-login", {
    method: "POST",
    body: JSON.stringify({ userName, phoneNumber }),
  });
}

export function createSwapRequestForUser(
  user: Pick<DemoUser, "userId" | "userName" | "phoneNumber"> | { userName: string; phoneNumber: string },
  applianceType = "washing_machine",
) {
  return request<SwapRequest>("/api/swap-requests", {
    method: "POST",
    body: JSON.stringify({
      userId: "userId" in user ? user.userId : undefined,
      userName: user.userName,
      phoneNumber: user.phoneNumber,
      applianceType,
    }),
  });
}

export function analyzePhoto(id: number, payload: CapturePayload) {
  return request<SwapRequest>(`/api/swap-requests/${id}/photos`, {
    method: "POST",
    body: JSON.stringify({
      fileName: payload.exteriorPhotoFileName,
      exteriorPhotoFileName: payload.exteriorPhotoFileName,
      labelPhotoFileName: payload.labelPhotoFileName,
      applianceType: payload.applianceType,
      agreedToCreditPolicy: payload.agreedToCreditPolicy,
    }),
  });
}

export function updateAppliance(id: number, payload: CapturePayload) {
  return request<SwapRequest>(`/api/swap-requests/${id}/appliance`, {
    method: "PATCH",
    body: JSON.stringify({
      applianceType: payload.applianceType,
      brand: payload.brand,
      modelName: payload.modelName,
      estimatedAge: payload.estimatedAge,
      exteriorCondition: payload.exteriorCondition,
    }),
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

export function selectReplacementProduct(
  id: number,
  product: {
    productId: string;
    productName: string;
    productGrade: string;
    productPrice: number;
    sameDayEligible?: boolean;
  },
) {
  return request<SwapRequest>(`/api/swap-requests/${id}/replacement-product`, {
    method: "POST",
    body: JSON.stringify({
      productId: product.productId,
      productName: product.productName,
      productGrade: product.productGrade,
      productPrice: product.productPrice,
      sameDayEligible: product.sameDayEligible ?? false,
    }),
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

export function getSwapRequest(id: number) {
  return request<SwapRequest>(`/api/swap-requests/${id}`);
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

export function advanceDeliveryTracking(id: number) {
  return request<SwapRequest>(`/api/swap-requests/${id}/delivery/mock-progress`, {
    method: "POST",
  });
}
