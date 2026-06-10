export type SwapRequest = {
  id: number;
  customerId?: number;
  status: string;
  appliance: {
    applianceType: string;
    brand: string;
    modelName?: string;
    estimatedAge?: string;
    exteriorCondition?: string;
    conditionGrade: string;
    aiAnalysisStatus?: string;
    aiConfidence?: number;
    uploadedFileName: string | null;
  };
  userConsent?: {
    agreedToCreditPolicy: boolean;
    notice: string;
    agreedAt?: string | null;
  } | null;
  captureEvidence?: {
    exteriorPhotoFileName?: string | null;
    labelPhotoFileName?: string | null;
    pickupPhotoFileName?: string | null;
    hubPhotoFileName?: string | null;
    pickupInspectionMemo?: string | null;
    hubMemo?: string | null;
  } | null;
  preValuation: {
    minEstimatedValue: number;
    maxEstimatedValue: number;
    currency: string;
    basis: string[];
  };
  booking: {
    bookingDate: string;
    bookingTime: string;
    address: string;
    detailAddress?: string | null;
    pickupLat?: number | null;
    pickupLng?: number | null;
  } | null;
  pickupRequest?: {
    pickupRequestId: number;
    pickupType: string;
    status: string;
    crewId: number | null;
    crewName: string | null;
    address: string | null;
    scheduledAt: string;
    nearbyCrews?: {
      crewId: number | null;
      crewName: string;
      status: string;
      lat: number;
      lng: number;
      distanceMeters: number;
      assigned: boolean;
    }[];
  } | null;
  dispatchInfo?: {
    alertMessage: string;
    matchScore: number;
    priorityRank: number;
    rejectCount: number;
    cancelCount: number;
    penaltyCount: number;
    recommendedReason: string;
  } | null;
  tracking: {
    message: string;
    estimatedArrivalAt: string;
    driverLocation?: {
      lat: number;
      lng: number;
      heading: number;
      speed: number;
      updatedAt: string;
    } | null;
    processingCenter?: {
      label: string;
      lat: number;
      lng: number;
    } | null;
    phase?: string;
    metrics?: {
      crewToPickupMeters: number | null;
      crewToProcessingCenterMeters: number | null;
      locationLive: boolean;
    } | null;
    nearbyCrews?: {
      crewId: number | null;
      crewName: string;
      status: string;
      lat: number;
      lng: number;
      distanceMeters: number;
      assigned: boolean;
    }[];
    events?: {
      eventType: string;
      message: string;
      createdAt: string;
    }[];
  };
  finalValuation?: {
    amount: number | null;
    currency: string;
    status: string;
    reasons: string[];
  } | null;
  credit: {
    amount: number;
    currency: string;
    status: string;
  } | null;
  pickupResultReport?: {
    resultType: string;
    summary: string;
    details: string[];
  } | null;
  recyclingReport: {
    summary: string;
    steps: string[];
  };
  settlement?: {
    baseFee: number | null;
    distanceFee: number | null;
    incentive: number | null;
    penalty: number | null;
    totalAmount: number | null;
    status: string;
  } | null;
  notifications?: {
    notificationId: number;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
  }[];
};
