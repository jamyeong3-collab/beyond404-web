"use client";

import { useMutation } from "@tanstack/react-query";
import {
  createUserWithEmailAndPassword,
  reload,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from "firebase/auth";
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  Camera,
  ChevronRight,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CreditCard,
  Home,
  Microwave,
  Recycle,
  Refrigerator,
  ShoppingBag,
  Sparkles,
  Truck,
  Tv,
  WashingMachine,
  Wind,
} from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { BookingPanel } from "@/features/booking/BookingPanel";
import type { BookingSelection } from "@/features/booking/BookingPanel";
import { OngoingReservationPanel } from "@/features/booking/OngoingReservationPanel";
import { ReservationCompletePanel } from "@/features/booking/ReservationCompletePanel";
import { CapturePanel } from "@/features/capture/CapturePanel";
import type { CaptureSubmission } from "@/features/capture/CapturePanel";
import { CreditPanel } from "@/features/credit/CreditPanel";
import { AnalyzingPanel } from "@/features/inspection/AnalyzingPanel";
import { PreValuationPanel } from "@/features/pre-valuation/PreValuationPanel";
import { PurchasePanel } from "@/features/purchase/PurchasePanel";
import { TrackingPanel } from "@/features/tracking/TrackingPanel";
import {
  acceptPreValuation,
  analyzePhoto,
  completeFinalValuation,
  confirmBooking,
  createSwapRequestForUser,
  firebaseLogin,
  getLatestSwapRequest,
  requestInstantCall,
  updateAppliance,
  type DemoUser,
} from "@/lib/api";
import { getClientAuth, isFirebaseAuthConfigured } from "@/lib/firebase";
import type { SwapRequest } from "@/types/swap";

type SwapStep =
  | "intro"
  | "capture"
  | "analyzing"
  | "valuation"
  | "market"
  | "booking"
  | "reservationComplete"
  | "ongoing"
  | "tracking"
  | "credit";
type HomeSwapStatus =
  | "none"
  | "reserved"
  | "pickup"
  | "reviewPending"
  | "reviewCompleted"
  | "reReviewPending"
  | "reReviewCompleted";

const applianceOptions = [
  { id: "washing_machine", label: "세탁기", icon: WashingMachine },
  { id: "refrigerator", label: "냉장고", icon: Refrigerator },
  { id: "air_conditioner", label: "에어컨", icon: Wind },
  { id: "microwave", label: "전자레인지", icon: Microwave },
  { id: "tv", label: "TV", icon: Tv },
] as const;

type ApplianceId = (typeof applianceOptions)[number]["id"];

const marketProducts = [
  {
    id: "washer",
    name: "LG 11Kg Front Load Washing Machine, AI Direct Drive",
    category: "세탁기",
    price: 62900,
    benefit: "FHP1411Z9P 공식 LG India 제품",
    description: "AI Direct Drive 기반의 11kg 프론트 로드 세탁기입니다.",
    imageUrl: "https://www.lg.com/content/dam/channel/wcms/in/images/washing-machines/fhp1411z9p_apsqeil_eail_in_c/gallery/FHP1411Z9P-450x450-1.jpg",
    productUrl: "https://www.lg.com/in/laundry/front-loading-washing-machines/fhp1411z9p/",
    specs: ["11kg", "AI Direct Drive", "Steam+", "5 Star"],
    icon: WashingMachine,
  },
  {
    id: "fridge",
    name: "LG 398L Double Door Refrigerator, Convertible, Wi-Fi",
    category: "냉장고",
    price: 74900,
    benefit: "GL-T422VPZX 공식 LG India 제품",
    description: "398L 용량의 컨버터블 더블도어 냉장고입니다.",
    imageUrl: "https://www.lg.com/content/dam/channel/wcms/in/images/refrigerators/updated/new/GL-T422VPZX-450X450.jpg",
    productUrl: "https://www.lg.com/in/refrigerators/double-door-refrigerators/gl-t422vpzx/",
    specs: ["398L", "Double Door", "Convertible", "Wi-Fi 지원"],
    icon: Refrigerator,
  },
  {
    id: "aircon",
    name: "LG 5 Star 1.5 Ton Split AC, Dual Inverter",
    category: "에어컨",
    price: 45900,
    benefit: "US-Q19BNZE3 공식 LG India 제품",
    description: "1.5 Ton 5 Star 등급의 Dual Inverter Split AC입니다.",
    imageUrl: "https://www.lg.com/content/dam/channel/wcms/in/images/split-ac/updatedgallery/us-q19bnze3/new/US-Q19BNZE3-450X450.jpg",
    productUrl: "https://www.lg.com/in/air-conditioners/split-air-conditioners/us-q19bnze3/",
    specs: ["1.5 Ton", "5 Star", "Dual Inverter", "AI Convertible 6-in-1"],
    icon: Wind,
  },
] as const;

export default function HomePage() {
  const thinQOpened = true;
  const [swapItOpened, setSwapItOpened] = useState(false);
  const [marketOpened, setMarketOpened] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [swapStep, setSwapStep] = useState<SwapStep>("intro");
  const [selectedAppliance, setSelectedAppliance] = useState<ApplianceId>(applianceOptions[0].id);
  const [fileName, setFileName] = useState("");
  const [selectedPurchaseProductId, setSelectedPurchaseProductId] = useState<"washer" | "fridge" | "aircon" | null>(null);
  const [swapRequest, setSwapRequest] = useState<SwapRequest | null>(null);
  const [activeReservationRequest, setActiveReservationRequest] = useState<SwapRequest | null>(null);
  const [homeSwapStatus, setHomeSwapStatus] = useState<HomeSwapStatus>("none");
  const [reservationLabel, setReservationLabel] = useState("");
  const [reservationAddress, setReservationAddress] = useState("");
  const [demoUser, setDemoUser] = useState<DemoUser | null>(null);
  const [lastCaptureSubmission, setLastCaptureSubmission] = useState<CaptureSubmission | null>(null);

  function applyRestoredSwapRequest(restored: SwapRequest) {
    setSwapRequest(restored);
    setSelectedAppliance(
      applianceOptions.some((option) => option.id === restored.appliance.applianceType)
        ? (restored.appliance.applianceType as ApplianceId)
        : applianceOptions[0].id,
    );

    if (!restored.pickupRequest && !restored.booking) {
      return;
    }

    const pickupStatus = restored.pickupRequest?.status;
    const pickupType = restored.pickupRequest?.pickupType;
    const restoredReservationLabel =
      restored.booking?.bookingDate && restored.booking?.bookingTime
        ? `${restored.booking.bookingDate} ${restored.booking.bookingTime}`
        : restored.pickupRequest?.scheduledAt ?? "";

    setActiveReservationRequest(restored);
    setReservationLabel(restoredReservationLabel);
    setReservationAddress(restored.booking?.address ?? restored.pickupRequest?.address ?? "");

    if (pickupStatus === "COMPLETED" || restored.status === "REWARD_READY") {
      setHomeSwapStatus("reviewCompleted");
      return;
    }

    if (pickupType === "BOOKING" && pickupStatus === "CONFIRMED") {
      setHomeSwapStatus("reserved");
      return;
    }

    setHomeSwapStatus("pickup");
  }

  async function restoreLatestSwapRequest(user: DemoUser) {
    try {
      const restored = await getLatestSwapRequest(user.userId);
      applyRestoredSwapRequest(restored);
    } catch {
      setSwapRequest(null);
      setActiveReservationRequest(null);
      setHomeSwapStatus("none");
      setReservationLabel("");
      setReservationAddress("");
    }
  }

  useEffect(() => {
    const splashTimer = window.setTimeout(() => setShowSplash(false), 1800);
    const savedUser = window.localStorage.getItem("swapit-demo-user");
    if (!savedUser) return () => window.clearTimeout(splashTimer);

    try {
      const parsedUser = JSON.parse(savedUser) as DemoUser;
      setDemoUser(parsedUser);
      void restoreLatestSwapRequest(parsedUser);
    } catch {
      window.localStorage.removeItem("swapit-demo-user");
    }

    return () => window.clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (homeSwapStatus !== "reviewPending" && homeSwapStatus !== "reReviewPending") {
      return;
    }

    const timer = window.setTimeout(() => {
      if (homeSwapStatus === "reviewPending") {
        setHomeSwapStatus("reviewCompleted");
        setSwapStep("credit");
        setSwapItOpened(false);
        return;
      }

      setHomeSwapStatus("reReviewCompleted");
      setSwapStep("credit");
      setSwapItOpened(false);
    }, homeSwapStatus === "reReviewPending" ? 5000 : 10000);

    return () => window.clearTimeout(timer);
  }, [homeSwapStatus]);

  function handleAuthenticatedUser(data: DemoUser) {
    setDemoUser(data);
    window.localStorage.setItem("swapit-demo-user", JSON.stringify(data));
    void restoreLatestSwapRequest(data);
  }

  const createMutation = useMutation({
    mutationFn: () => {
      if (!demoUser) throw new Error("Demo login is required");
      return createSwapRequestForUser(demoUser, selectedAppliance);
    },
    onSuccess: (data) => setSwapRequest(data),
  });

  const analyzeMutation = useMutation({
    mutationFn: async (submission: CaptureSubmission) => {
      if (!demoUser) throw new Error("Demo login is required");

      const current = swapRequest ?? (await createSwapRequestForUser(demoUser, selectedAppliance));
      const analyzed = await analyzePhoto(current.id, submission);

      return updateAppliance(analyzed.id, submission);
    },
    onSuccess: (data) => {
      setSwapRequest(data);
      window.setTimeout(() => setSwapStep("valuation"), 1100);
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (booking: BookingSelection) => {
      if (!swapRequest) throw new Error("Swap request is required");
      const data =
        booking.mode === "schedule"
          ? await confirmBooking(swapRequest.id, {
              address: booking.pickupAddress ?? "A-12, New Delhi demo street",
              detailAddress: booking.detailAddress ?? "Demo street",
              pickupLat: booking.pickupLat ?? 28.6197,
              pickupLng: booking.pickupLng ?? 77.2196,
              bookingDate: booking.bookingDate,
              bookingTime: booking.bookingTime,
            })
          : await requestInstantCall(swapRequest.id, {
              address: booking.pickupAddress ?? "A-12, New Delhi demo street",
              detailAddress: booking.detailAddress ?? "Near LG demo pickup point",
              pickupLat: booking.pickupLat ?? 28.6197,
              pickupLng: booking.pickupLng ?? 77.2196,
            });
      return { data, booking };
    },
    onSuccess: ({ data, booking }) => {
      setSwapRequest(data);
      setActiveReservationRequest(data);
      setReservationLabel(booking.reservedAt);
      setReservationAddress(booking.pickupAddress ?? "");

      if (booking.mode === "schedule") {
        setHomeSwapStatus("reserved");
        setSwapStep("reservationComplete");
        return;
      }

      setHomeSwapStatus("pickup");
      setSwapStep("tracking");
    },
  });

  const creditMutation = useMutation({
    mutationFn: async () => {
      const currentRequest = activeReservationRequest ?? swapRequest;
      if (!currentRequest) throw new Error("Swap request is required");
      return completeFinalValuation(currentRequest.id);
    },
    onSuccess: (data) => {
      setSwapRequest(data);
      setActiveReservationRequest(data);
      setHomeSwapStatus("reviewCompleted");
      setSwapStep("credit");
    },
  });

  const acceptValuationMutation = useMutation({
    mutationFn: async (nextStep: "market" | "booking") => {
      if (!swapRequest) {
        throw new Error("Swap request is required");
      }

      const accepted =
        swapRequest.status === "PRE_VALUATION_ACCEPTED"
          ? swapRequest
          : await acceptPreValuation(swapRequest.id);

      return { accepted, nextStep };
    },
    onSuccess: ({ accepted, nextStep }) => {
      setSwapRequest(accepted);
      setSwapStep(nextStep);
    },
  });

  const isBusy =
    createMutation.isPending ||
    analyzeMutation.isPending ||
    acceptValuationMutation.isPending ||
    bookingMutation.isPending ||
    creditMutation.isPending;

  const error =
    createMutation.error ??
    acceptValuationMutation.error ??
    bookingMutation.error ??
    creditMutation.error;

  const resetExchangeFlow = () => {
    setFileName("");
    setLastCaptureSubmission(null);
    setSelectedPurchaseProductId(null);
    setSwapRequest(null);
    setSelectedAppliance(applianceOptions[0].id);
    setSwapStep("intro");
  };

  const clearActiveReservation = () => {
    setActiveReservationRequest(null);
    setHomeSwapStatus("none");
    setReservationLabel("");
    setReservationAddress("");
  };

  const openOngoingReservation = () => {
    setSwapStep("ongoing");
    setSwapItOpened(true);
  };

  const screenSwapRequest =
    swapStep === "reservationComplete" ||
    swapStep === "ongoing" ||
    swapStep === "tracking" ||
    swapStep === "credit"
      ? activeReservationRequest
      : swapRequest;


  const resetDemoLogin = () => {
    try {
      void signOut(getClientAuth()).catch(() => undefined);
    } catch {
      // Firebase 설정이 없는 개발 환경에서도 앱 로그아웃은 계속 진행합니다.
    }

    window.localStorage.removeItem("swapit-demo-user");
    setDemoUser(null);
    setMarketOpened(false);
    setSwapItOpened(false);
    resetExchangeFlow();
    clearActiveReservation();
  };

  const isSwapIntroScreen = swapItOpened && swapStep === "intro";
  const isSwapCaptureScreen = Boolean(demoUser) && swapItOpened && swapStep === "capture" && !marketOpened;

  return (
    <main className="min-h-screen bg-cloud md:flex md:items-center md:justify-center md:bg-[#202124] md:px-3 md:py-8">
      <section className="relative min-h-[100dvh] w-full bg-cloud md:min-h-0 md:w-[min(100%,424px)] md:rounded-[52px] md:border-[8px] md:border-[#090a0f] md:bg-[#090a0f] md:p-[3px] md:shadow-phone">
        <div className="pointer-events-none absolute left-1/2 top-[22px] z-20 hidden h-9 w-[126px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-3 md:flex">
          <Camera size={13} className="text-slate-700" />
        </div>
        <div className="h-[100dvh] overflow-hidden rounded-none bg-cloud md:aspect-[402/874] md:h-auto md:rounded-[43px]">
          {showSplash ? (
            <ThinQSplashScreen />
          ) : thinQOpened ? (
            <div
              className={`relative flex h-full animate-[fadeIn_.18s_ease-out] flex-col ${
                isSwapIntroScreen
                  ? "bg-[radial-gradient(circle_at_18%_8%,rgba(255,255,255,.38),transparent_28%),linear-gradient(180deg,#f47783_0%,#e95d6a_48%,#d94a59_100%)]"
                  : isSwapCaptureScreen
                    ? "bg-[#111318]"
                    : "bg-white"
              }`}
            >
              {isSwapIntroScreen ? (
                <IndianPatternOverlay className="z-0" />
              ) : null}
              {!isSwapCaptureScreen ? (
                <PhoneStatusBar
                  isDark={isSwapIntroScreen}
                  className={isSwapIntroScreen ? "bg-transparent" : demoUser && !marketOpened ? "bg-cloud" : "bg-white"}
                />
              ) : null}
              {!demoUser ? (
                <DemoLoginScreen
                  onBack={() => {
                    setMarketOpened(false);
                    setShowSplash(true);
                    window.setTimeout(() => setShowSplash(false), 900);
                  }}
                  onAuthenticated={handleAuthenticatedUser}
                />
              ) : marketOpened ? (
                <LgMarketScreen
                  amount={swapRequest?.credit?.amount ?? 0}
                  onBack={() => setMarketOpened(false)}
                  onReturnHome={() => setMarketOpened(false)}
                />
              ) : swapItOpened ? (
                <SwapItFeatureScreen
                  error={error}
                  analyzeError={analyzeMutation.error}
                  fileName={fileName}
                  isBusy={isBusy}
                  homeSwapStatus={homeSwapStatus}
                  reservationLabel={reservationLabel}
                  reservationAddress={reservationAddress}
                  selectedAppliance={selectedAppliance}
                  step={swapStep}
                  swapRequest={screenSwapRequest}
                  analyzeLoading={analyzeMutation.isPending}
                  bookingLoading={bookingMutation.isPending}
                  creditLoading={creditMutation.isPending}
                  onBack={() => {
                    if (swapStep === "intro") {
                      setSwapItOpened(false);
                      return;
                    }
                    if (
                      swapStep === "reservationComplete" ||
                      swapStep === "ongoing" ||
                      swapStep === "tracking" ||
                      swapStep === "credit"
                    ) {
                      setSwapItOpened(false);
                      return;
                    }
                    setSwapStep(previousStep(swapStep));
                  }}
                  onClose={() => {
                    resetExchangeFlow();
                    setSwapItOpened(false);
                  }}
                  onNewRequest={resetExchangeFlow}
                  onApplianceChange={setSelectedAppliance}
                  onStart={() => setSwapStep("capture")}
                  onFileChange={setFileName}
                  onAnalyze={(submission) => {
                    setLastCaptureSubmission(submission);
                    setFileName(submission.exteriorPhotoFileName);
                    analyzeMutation.reset();
                    setSwapStep("analyzing");
                    analyzeMutation.mutate(submission);
                  }}
                  onRetryAnalysis={() => {
                    if (!lastCaptureSubmission) {
                      setSwapStep("capture");
                      return;
                    }
                    analyzeMutation.reset();
                    setSwapStep("analyzing");
                    analyzeMutation.mutate(lastCaptureSubmission);
                  }}
                  onValuationNext={() => acceptValuationMutation.mutate("booking")}
                  onOpenPurchaseFlow={() => acceptValuationMutation.mutate("market")}
                  selectedPurchaseProductId={selectedPurchaseProductId}
                  onSelectPurchaseProduct={setSelectedPurchaseProductId}
                  onBooking={(booking) => bookingMutation.mutate(booking)}
                  onComplete={() => {
                    setHomeSwapStatus("reviewPending");
                    setSwapStep("credit");
                  }}
                  onFinalize={() => creditMutation.mutate()}
                  onRequestReReview={() => {
                    setHomeSwapStatus("reReviewPending");
                    setSwapStep("credit");
                    setSwapItOpened(false);
                  }}
                  onOpenMarket={() => {
                    setSwapItOpened(false);
                    setMarketOpened(true);
                  }}
                  onReturnHome={() => setSwapItOpened(false)}
                  onChangeReservation={() => setSwapStep("booking")}
                  onCancelReservation={() => {
                    clearActiveReservation();
                    setSwapItOpened(false);
                  }}
                  onCloseReservationComplete={() => setSwapItOpened(false)}
                  onViewReservation={() => setSwapStep("ongoing")}
                  onOpenTracking={() => {
                    setHomeSwapStatus("pickup");
                    setSwapStep("tracking");
                  }}
                  onOpenCredit={() => setSwapStep("credit")}
                />
              ) : (
                <ThinQHomeScreen
                  demoUser={demoUser}
                  homeSwapStatus={homeSwapStatus}
                  reservationLabel={reservationLabel}
                  onBackHome={() => {
                    setMarketOpened(false);
                    setShowSplash(true);
                    window.setTimeout(() => setShowSplash(false), 900);
                  }}
                  onOpenSwapIt={() => {
                    resetExchangeFlow();
                    setMarketOpened(false);
                    setSwapItOpened(true);
                  }}
                  onOpenMarket={() => {
                    setSwapItOpened(false);
                    setMarketOpened(true);
                  }}
                  onOpenReview={() => {
                    setSwapStep("credit");
                    setSwapItOpened(true);
                  }}
                  onOpenReservation={openOngoingReservation}
                  onLogout={resetDemoLogin}
                />
              )}
            </div>
          ) : (
            <ThinQSplashScreen />
          )}
        </div>
      </section>
    </main>
  );
}

function ThinQSplashScreen() {
  return (
    <div className="relative flex h-full overflow-hidden bg-[#dfeec1]">
      <PhoneStatusBar isDark={false} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,.45),transparent_28%),linear-gradient(180deg,rgba(230,244,203,.72),rgba(214,232,184,.96))]" />
      <div className="absolute left-[11%] top-[26%] h-[22%] w-[24%] rounded-[32px] bg-white/18 blur-2xl" />
      <div className="absolute bottom-[12%] left-[6%] h-28 w-12 rounded-t-full bg-[#458f63]" />
      <div className="absolute bottom-[16%] left-[12%] h-24 w-10 rotate-[-18deg] rounded-t-full bg-[#5ca86f]" />
      <div className="absolute bottom-[15%] left-[18%] h-20 w-9 rotate-[18deg] rounded-t-full bg-[#6fb97a]" />
      <div className="absolute bottom-[15%] left-[9%] h-24 w-20 rounded-sm border-[10px] border-white/70 bg-[#b9dbb2]" />
      <div className="absolute bottom-[20%] left-[9%] h-3 w-16 rounded-full bg-[#70bd83]" />
      <div className="absolute bottom-[16%] right-[8%] h-[2px] w-[76%] bg-white/80" />
      <div className="absolute bottom-[17%] right-[18%] h-28 w-[46%] rounded-t-[16px] bg-white/70 shadow-[0_20px_60px_rgba(68,92,58,.18)]" />
      <div className="absolute bottom-[23%] right-[35%] h-32 w-20 rounded-t-full bg-[#c7473d]" />
      <div className="absolute bottom-[36%] right-[39%] h-9 w-9 rounded-full bg-[#f0c45d]" />
      <div className="absolute bottom-[25%] right-[27%] h-28 w-16 rotate-[8deg] rounded-full bg-[#e9f6e4]" />
      <div className="absolute bottom-[32%] right-[19%] h-24 w-2 rotate-[35deg] rounded-full bg-[#2f3338]" />
      <div className="absolute bottom-[42%] right-[16%] h-10 w-10 rounded-full border-[5px] border-[#2f3338]" />
      <div className="absolute bottom-[31%] right-[43%] h-10 w-7 rounded-[8px] bg-[#27313b]" />
      <div className="absolute left-1/2 top-[42%] z-10 -translate-x-1/2 text-center">
        <p className="text-[44px] font-black tracking-tight text-white drop-shadow-[0_14px_26px_rgba(126,151,96,.28)]">
          LG ThinQ
        </p>
      </div>
      <div className="absolute bottom-2 left-1/2 h-1.5 w-32 -translate-x-1/2 rounded-full bg-black/30 md:hidden" />
    </div>
  );
}

function previousStep(step: SwapStep): SwapStep {
  switch (step) {
    case "capture":
      return "intro";
    case "analyzing":
      return "capture";
    case "valuation":
      return "capture";
    case "market":
      return "valuation";
    case "booking":
      return "market";
    case "reservationComplete":
    case "ongoing":
      return "booking";
    case "tracking":
      return "booking";
    case "credit":
      return "tracking";
    default:
      return "intro";
  }
}

function PhoneStatusBar({ isDark, className = "" }: { isDark: boolean; className?: string }) {
  const [currentTime, setCurrentTime] = useState(() =>
    new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date()),
  );

  useEffect(() => {
    const update = () =>
      setCurrentTime(
        new Intl.DateTimeFormat("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).format(new Date()),
      );

    update();
    const timer = window.setInterval(update, 30000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className={`relative z-30 hidden h-[62px] items-start justify-between px-8 pt-4 text-[12px] font-bold md:flex ${className} ${
        isDark ? "text-white" : "text-ink"
      }`}
    >
      <span>{currentTime}</span>
      <div className="flex items-center gap-1.5">
        <CellularBars />
        <WifiGlyph />
        <BatteryGlyph />
      </div>
    </div>
  );
}

function DemoLoginScreen({
  onBack,
  onAuthenticated,
}: {
  onBack: () => void;
  onAuthenticated: (user: DemoUser) => void;
}) {
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  const [userName, setUserName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authNotice, setAuthNotice] = useState("");
  const firebaseReady = isFirebaseAuthConfigured();
  const trimmedEmail = email.trim().toLowerCase();
  const canLogin = trimmedEmail.length > 0 && password.trim().length > 0;
  const canSignup =
    trimmedEmail.length > 0 &&
    password.trim().length >= 6 &&
    userName.trim().length > 0 &&
    phoneNumber.trim().length > 0;
  const canRequestVerification = trimmedEmail.length > 0;

  function getAuthErrorMessage(error: unknown, mode: "login" | "signup" = authMode) {
    if (!(error instanceof Error)) {
      return null;
    }

    if (error.message.includes("auth/email-already-in-use")) {
      return mode === "login"
        ? "이미 가입된 이메일입니다. 비밀번호를 입력해 로그인해주세요."
        : "이미 가입된 이메일입니다. 로그인 화면에서 로그인해주세요.";
    }
    if (
      error.message.includes("이미 가입된 전화번호") ||
      error.message.includes("users_phone_number_unique") ||
      error.message.includes("phone_number")
    ) {
      return "이미 가입된 전화번호입니다. 로그인 화면에서 로그인해주세요.";
    }
    if (error.message.includes("auth/invalid-email")) {
      return "이메일 형식이 올바르지 않습니다.";
    }
    if (error.message.includes("auth/weak-password")) {
      return "비밀번호는 6자리 이상으로 입력해주세요.";
    }
    if (error.message.includes("auth/invalid-credential") || error.message.includes("auth/user-not-found")) {
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    }
    if (error.message.includes("auth/wrong-password")) {
      return "비밀번호가 올바르지 않습니다.";
    }
    if (error.message.includes("auth/user-disabled")) {
      return "사용할 수 없는 계정입니다. 다른 계정으로 로그인해주세요.";
    }
    if (error.message.includes("auth/too-many-requests")) {
      return "로그인 시도가 많습니다. 잠시 후 다시 시도해주세요.";
    }
    if (error.message.includes("Email verification is required")) {
      return "이메일 인증을 먼저 완료해주세요.";
    }
    if (error.message.includes("요청 값이 올바르지 않습니다")) {
      return mode === "signup"
        ? "입력한 이메일, 비밀번호, 이름, 전화번호를 다시 확인해주세요."
        : "로그인 정보를 다시 확인해주세요.";
    }

    return error.message;
  }

  async function connectVerifiedFirebaseUser(firebaseUser: FirebaseUser, fallbackName = userName, fallbackPhone = phoneNumber) {
    await reload(firebaseUser);
    if (!firebaseUser.email) {
      throw new Error("이메일 정보를 확인할 수 없습니다.");
    }
    if (!firebaseUser.emailVerified) {
      throw new Error("이메일 인증이 아직 완료되지 않았습니다.");
    }

    return firebaseLogin({
      firebaseUid: firebaseUser.uid,
      email: firebaseUser.email,
      emailVerified: firebaseUser.emailVerified,
      userName: firebaseUser.displayName || fallbackName.trim() || firebaseUser.email.split("@")[0],
      phoneNumber: fallbackPhone.trim(),
    });
  }

  function resetAuthFeedback() {
    setAuthNotice("");
    emailLoginMutation.reset();
    signupMutation.reset();
    confirmEmailMutation.reset();
  }

  function showLoginMode() {
    resetAuthFeedback();
    setAuthMode("login");
  }

  function showSignupMode() {
    resetAuthFeedback();
    setPendingFirebaseUser(null);
    setAuthMode("signup");
  }

  const emailLoginMutation = useMutation({
    mutationFn: async () => {
      const auth = getClientAuth();
      const credential = await signInWithEmailAndPassword(auth, trimmedEmail, password);
      return connectVerifiedFirebaseUser(credential.user);
    },
    onSuccess: onAuthenticated,
  });

  const signupMutation = useMutation({
    mutationFn: async () => {
      const auth = getClientAuth();
      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      await updateProfile(credential.user, { displayName: userName.trim() });
      await sendEmailVerification(credential.user);
      return credential.user;
    },
    onSuccess: (firebaseUser) => {
      setPendingFirebaseUser(firebaseUser);
      setAuthNotice("인증 메일을 보냈어요. 메일함에서 링크를 누른 뒤 이메일 칸 오른쪽의 인증 확인을 눌러주세요.");
    },
  });

  const confirmEmailMutation = useMutation({
    mutationFn: async () => {
      const user = getClientAuth().currentUser ?? pendingFirebaseUser;
      if (!user) {
        throw new Error("인증 확인할 사용자가 없습니다. 다시 회원가입을 진행해주세요.");
      }
      return connectVerifiedFirebaseUser(user);
    },
    onSuccess: onAuthenticated,
  });

  const currentError =
    authMode === "login"
      ? getAuthErrorMessage(emailLoginMutation.error, "login")
      : getAuthErrorMessage(signupMutation.error, "signup") ??
        getAuthErrorMessage(confirmEmailMutation.error, "signup");
  const verificationButtonLabel = pendingFirebaseUser
    ? confirmEmailMutation.isPending
      ? "확인 중"
      : "인증 확인"
    : signupMutation.isPending
      ? "발송 중"
      : "인증메일 보내기";
  const verificationButtonDisabled =
    !firebaseReady ||
    signupMutation.isPending ||
    confirmEmailMutation.isPending ||
    (!pendingFirebaseUser && !canRequestVerification);

  const firebaseConfigMessage = !firebaseReady
    ? "Firebase 이메일 인증 설정이 필요합니다. .env.local에 Firebase 웹앱 설정값을 넣어주세요."
    : null;

  if (authMode === "signup") {
    return (
      <div className="phone-scroll flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-6 pb-7 pt-8">
        <section>
          <LgElectronicsLogo className="mb-12" />

          <p className="mb-2 text-[30px] font-black tracking-tight text-black">ThinQ 계정 만들기</p>
          <p className="mb-8 text-[15px] font-semibold leading-6 text-slate-500">
            이메일 인증이 완료된 계정만 SwapIt 신청 데이터와 연결됩니다.
          </p>

          <label className="block border-b-2 border-black pb-4">
            <span className="sr-only">이메일 아이디</span>
            <div className="flex items-center gap-3">
              <input
                className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[21px] font-semibold text-black outline-none placeholder:text-[#8a8a8a]"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  resetAuthFeedback();
                  setPendingFirebaseUser(null);
                }}
                placeholder="이메일 아이디"
                type="email"
              />
              <button
                className="shrink-0 rounded-full bg-lgred px-4 py-2 text-[12px] font-black text-white disabled:bg-[#e8e8e8] disabled:text-[#aaa]"
                disabled={verificationButtonDisabled}
                onClick={() => {
                  resetAuthFeedback();
                  if (pendingFirebaseUser) {
                    confirmEmailMutation.mutate();
                    return;
                  }
                  if (!canSignup) {
                    setAuthNotice("인증 메일을 보내려면 이메일, 비밀번호, 이름, 전화번호를 먼저 입력해주세요.");
                    return;
                  }
                  signupMutation.mutate();
                }}
                type="button"
              >
                {verificationButtonLabel}
              </button>
            </div>
          </label>
          <p className="mt-3 text-[13px] font-bold leading-5 text-slate-500">
            이름, 전화번호, 비밀번호를 입력한 뒤 이메일 인증을 진행해주세요.
          </p>

          <label className="mt-8 block border-b border-[#777] pb-3">
            <span className="sr-only">비밀번호</span>
            <div className="flex items-center gap-3">
              <input
                className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[21px] font-semibold text-black outline-none placeholder:text-[#8a8a8a]"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  resetAuthFeedback();
                }}
                placeholder="비밀번호 6자리 이상"
                type={showPassword ? "text" : "password"}
              />
              <button
                className="shrink-0 text-sm font-black text-[#555]"
                onClick={() => setShowPassword((visible) => !visible)}
                type="button"
              >
                {showPassword ? "숨김" : "표시"}
              </button>
            </div>
          </label>

          <label className="mt-8 block border-b border-[#777] pb-3">
            <span className="sr-only">이름</span>
            <input
              className="h-12 w-full border-0 bg-transparent text-[21px] font-semibold text-black outline-none placeholder:text-[#8a8a8a]"
              value={userName}
              onChange={(event) => {
                setUserName(event.target.value);
                resetAuthFeedback();
              }}
              placeholder="이름"
            />
          </label>

          <label className="mt-8 block border-b border-[#777] pb-3">
            <span className="sr-only">전화번호</span>
            <input
              className="h-12 w-full border-0 bg-transparent text-[21px] font-semibold text-black outline-none placeholder:text-[#8a8a8a]"
              value={phoneNumber}
              onChange={(event) => {
                setPhoneNumber(formatPhoneNumber(event.target.value));
                resetAuthFeedback();
              }}
              inputMode="numeric"
              maxLength={13}
              placeholder="010-0000-0000"
            />
          </label>

          {authNotice ? (
            <p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold leading-6 text-emerald-700">
              {authNotice}
            </p>
          ) : null}

          {firebaseConfigMessage || currentError ? (
            <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
              {firebaseConfigMessage ?? currentError}
            </p>
          ) : null}

          <button
            className="mt-8 w-full text-center text-[18px] font-black text-[#555]"
            onClick={showLoginMode}
            type="button"
          >
            로그인 화면으로 돌아가기
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="phone-scroll flex min-h-0 flex-1 flex-col overflow-y-auto bg-white px-6 pb-7 pt-8">
      <section className="mx-auto w-full max-w-[336px]">
        <LgElectronicsLogo className="mb-12" />

        <label className="block border-b-2 border-black pb-4">
          <span className="sr-only">이메일</span>
          <input
            className="h-12 w-full border-0 bg-transparent text-[21px] font-semibold text-black outline-none placeholder:text-[#8a8a8a]"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              resetAuthFeedback();
            }}
            placeholder="이메일 아이디"
            type="email"
          />
        </label>

        <label className="mt-9 block border-b border-[#777] pb-3">
          <span className="sr-only">비밀번호</span>
          <div className="flex items-center gap-3">
            <input
              className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[21px] font-semibold text-black outline-none placeholder:text-[#8a8a8a]"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                resetAuthFeedback();
              }}
              placeholder="비밀번호"
              type={showPassword ? "text" : "password"}
            />
            <button
              className="shrink-0 text-sm font-black text-[#555]"
              onClick={() => setShowPassword((visible) => !visible)}
              type="button"
            >
              {showPassword ? "숨김" : "표시"}
            </button>
          </div>
        </label>

        <button
          className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-[#6f6f6f]"
          onClick={() => setRememberLogin((value) => !value)}
          type="button"
        >
          <span
            className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${
              rememberLogin ? "border-lgred bg-lgred" : "border-[#cfcfcf] bg-white"
            }`}
          >
            {rememberLogin ? <span className="h-[7px] w-[7px] rounded-full bg-white" /> : null}
          </span>
          <span>로그인 정보 저장</span>
        </button>

        {firebaseConfigMessage || currentError ? (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            {firebaseConfigMessage ?? currentError}
          </p>
        ) : null}

        <button
          className="mt-7 h-16 w-full rounded-2xl bg-lgred text-[22px] font-black text-white disabled:bg-[#e8e8e8] disabled:text-[#b8b8b8]"
          disabled={!firebaseReady || emailLoginMutation.isPending || !canLogin}
          onClick={() => {
            setAuthNotice("");
            signupMutation.reset();
            confirmEmailMutation.reset();
            emailLoginMutation.mutate();
          }}
          type="button"
        >
          {emailLoginMutation.isPending ? "ThinQ 사용자 확인 중..." : "로그인"}
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-[12px] font-semibold text-[#4e4e4e]">
          <span>아이디 찾기</span>
          <span className="text-[#bdbdbd]">|</span>
          <span>비밀번호 재설정</span>
        </div>

        <div className="mt-3 flex justify-center">
          <button
            className="font-black text-[#555]"
            onClick={showSignupMode}
            type="button"
          >
            회원가입
          </button>
        </div>
      </section>
    </div>
  );
}

function LgElectronicsLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="text-[34px] font-black tracking-[-0.03em] text-[#777]">LG</span>
      <span className="text-[34px] font-black tracking-[-0.03em] text-lgred">ThinQ</span>
    </div>
  );
}

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function ThinQHomeScreen({
  demoUser,
  homeSwapStatus,
  reservationLabel,
  onBackHome,
  onOpenSwapIt,
  onOpenMarket,
  onOpenReview,
  onOpenReservation,
  onLogout,
}: {
  demoUser: DemoUser;
  homeSwapStatus: HomeSwapStatus;
  reservationLabel: string;
  onBackHome: () => void;
  onOpenSwapIt: () => void;
  onOpenMarket: () => void;
  onOpenReview: () => void;
  onOpenReservation: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-cloud px-4 pb-3">
      <header className="mb-3 flex items-center justify-between">
        <button
          aria-label="홈 화면으로 돌아가기"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink"
          onClick={onBackHome}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-xs font-black text-lgred">LG ThinQ</p>
          <p className="text-[11px] font-semibold text-slate-400">Home</p>
        </div>
        <button
          className="h-9 rounded-full px-3 text-[11px] font-black text-slate-500"
          onClick={onLogout}
        >
          로그아웃
        </button>
      </header>

      <div className="phone-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
        <section className="px-1 pb-1 pt-2">
          <p className="text-[15px] font-bold text-slate-500">{demoUser.userName}님, 안녕하세요</p>
          <h1 className="mt-1 whitespace-nowrap text-[17px] font-black leading-tight text-ink sm:text-[18px]">
            오늘도 우리 집은 안심 맑음 상태입니다.
          </h1>
        </section>

        <section className="rounded-[20px] bg-white p-4 shadow-sm">
          <button className="flex w-full items-center justify-between text-left" onClick={onOpenReservation}>
            <span>
              <span className="block text-[13px] font-bold text-slate-500">우리 집 상태</span>
              <span className="mt-1 block text-[24px] font-black leading-none text-ink">안심</span>
            </span>
            <span className="rounded-full bg-lgred/10 px-3 py-1.5 text-[12px] font-black text-lgred">
              방금 전 업데이트
            </span>
          </button>
          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-4">
            <div>
              <p className="text-[20px] font-black leading-none text-lgred">2대</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">연결 가전</p>
            </div>
            <div className="pl-4">
              <p className="text-[20px] font-black leading-none text-ink">0건</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">점검 필요</p>
            </div>
            <div className="pl-4">
              <p className="text-[20px] font-black leading-none text-ink">1건</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">추천 케어</p>
            </div>
          </div>
        </section>

        {homeSwapStatus !== "none" ? (
          <SwapItStatusCard
            status={homeSwapStatus}
            reservationLabel={reservationLabel}
            onOpenReservation={onOpenReservation}
          />
        ) : null}

        <section className="rounded-[20px] bg-white p-2 shadow-sm">
          <div className="flex items-center justify-between px-3 py-2.5">
            <h2 className="text-sm font-black text-ink">내 디바이스</h2>
            <button className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
              전체 2
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            <DeviceCard icon={<WashingMachine size={24} />} label="세탁기" status="대기 중" />
            <DeviceCard icon={<Refrigerator size={24} />} label="냉장고" status="정상" />
          </div>
        </section>

        <section className="rounded-[20px] bg-white p-2 shadow-sm">
          <button
            className="flex w-full items-center gap-3 rounded-[16px] p-3 text-left text-ink"
            onClick={onOpenSwapIt}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-lgred/10 text-lgred">
              <Recycle size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">SwapIt 가전 교환</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                사진 등록부터 보상, 수거 예약까지
              </span>
            </span>
            <ChevronRight size={20} className="text-slate-300" />
          </button>
          <button
            className="flex w-full items-center gap-3 rounded-[16px] p-3 text-left text-ink"
            onClick={onOpenMarket}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-slate-100 text-slate-600">
              <ShoppingBag size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">LG 가전 마켓</span>
              <span className="mt-0.5 block truncate text-xs text-slate-500">
                SwapIt 크레딧으로 공식 LG 상품 구매
              </span>
            </span>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </section>
      </div>

      <nav className="grid h-[70px] shrink-0 grid-cols-4 rounded-[22px] bg-white px-2 py-2 shadow-sm">
        <button className="flex flex-col items-center justify-center gap-1 text-lgred">
          <Home size={20} />
          <span className="text-[10px] font-black">홈</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-1 text-slate-400">
          <Refrigerator size={20} />
          <span className="text-[10px] font-black">디바이스</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-1 text-slate-400" onClick={onOpenReview}>
          <Sparkles size={20} />
          <span className="text-[10px] font-black">케어</span>
        </button>
        <button className="flex flex-col items-center justify-center gap-1 text-slate-400" onClick={onOpenMarket}>
          <ShoppingBag size={20} />
          <span className="text-[10px] font-black">메뉴</span>
        </button>
      </nav>
    </div>
  );
}

function LgMarketScreen({
  amount,
  onBack,
  onReturnHome,
}: {
  amount: number;
  onBack: () => void;
  onReturnHome: () => void;
}) {
  const [selectedProductId, setSelectedProductId] = useState<(typeof marketProducts)[number]["id"] | null>(null);
  const selectedProduct = marketProducts.find((product) => product.id === selectedProductId);

  return (
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-5">
      <header className="mb-4 flex items-center justify-between">
        <button
          aria-label="이전 화면으로 돌아가기"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-sm"
          onClick={selectedProduct ? () => setSelectedProductId(null) : onBack}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-xs font-black text-lgred">LG 가전 마켓</p>
          <p className="text-[11px] font-semibold text-slate-400">Credit applied</p>
        </div>
        <button className="h-9 rounded-full bg-white px-3 text-[11px] font-black text-lgred shadow-sm" onClick={onReturnHome}>
          홈
        </button>
      </header>

      <div className="phone-scroll flex-1 overflow-y-auto">
        <section className="rounded-3xl bg-lgred p-5 text-white shadow-sm">
          <p className="text-xs font-black text-white/75">보유 SwapIt 크레딧</p>
          <h1 className="mt-1 text-3xl font-black">₩{amount.toLocaleString()}</h1>
          <p className="mt-3 text-sm leading-6 text-white/80">선택한 LG 가전에 예상 보상 크레딧을 적용한 가격을 확인할 수 있습니다.</p>
        </section>

        {selectedProduct ? (
          <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex gap-4">
              <ProductImage product={selectedProduct} size="large" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-lgred">{selectedProduct.category}</p>
                <h2 className="mt-1 text-lg font-black leading-snug text-ink">{selectedProduct.name}</h2>
                <p className="mt-2 text-sm text-slate-500">{selectedProduct.description}</p>
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-cloud p-3">
              <p className="text-xs font-bold text-slate-500">제품 가격</p>
              <p className="text-xl font-black text-ink">₩{selectedProduct.price.toLocaleString()}</p>
              <p className="mt-1 text-xs font-bold text-lgred">크레딧 적용가 ₩{Math.max(selectedProduct.price - amount, 0).toLocaleString()}</p>
            </div>
            <button className="mt-4 h-12 w-full rounded-xl bg-lgred text-sm font-black text-white">
              구매 진행
            </button>
          </section>
        ) : (
          <section className="mt-4 space-y-3">
            <h2 className="text-sm font-black text-ink">추천 LG 가전</h2>
            {marketProducts.map((product) => (
              <button
                key={product.id}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm"
                onClick={() => setSelectedProductId(product.id)}
              >
                <ProductImage product={product} size="small" />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black text-lgred">{product.category}</span>
                  <span className="block truncate text-sm font-black text-ink">{product.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">크레딧 적용가 ₩{Math.max(product.price - amount, 0).toLocaleString()}</span>
                </span>
                <span className="rounded-full bg-lgred/10 px-3 py-1 text-xs font-black text-lgred">선택</span>
              </button>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

function ProductImage({
  product,
  size = "small",
}: {
  product: (typeof marketProducts)[number];
  size?: "small" | "large";
}) {
  const Icon = product.icon;
  return (
    <div className={size === "large" ? "flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-lgred/10 text-lgred" : "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-lgred/10 text-lgred"}>
      <Icon size={size === "large" ? 42 : 26} />
    </div>
  );
}

function SwapItStatusCard({
  status,
  reservationLabel,
  onOpenReservation,
}: {
  status: HomeSwapStatus;
  reservationLabel: string;
  onOpenReservation: () => void;
}) {
  const isCompleted = status === "reviewCompleted" || status === "reReviewCompleted";
  const card = getHomeStatusCard(status, reservationLabel);
  const Icon = card.icon;

  return (
    <section>
      <button
        className={
          "flex w-full items-center gap-3 rounded-[20px] p-4 text-left shadow-sm " +
          (isCompleted ? "bg-lgred text-white" : "bg-white text-ink")
        }
        onClick={onOpenReservation}
      >
        <span
          className={
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] " +
            (isCompleted ? "bg-white/15 text-white" : "bg-lgred/10 text-lgred")
          }
        >
          <Icon size={22} />
        </span>
        <span className="min-w-0 flex-1">
          <span className={"mb-0.5 block text-[11px] font-black " + (isCompleted ? "text-white/70" : "text-lgred")}>
            진행 중인 예약
          </span>
          <span className="block text-sm font-black">{card.title}</span>
          <span className={"mt-0.5 block truncate text-xs " + (isCompleted ? "text-white/75" : "text-slate-500")}>
            {card.description}
          </span>
        </span>
        <ChevronRight size={20} />
      </button>
    </section>
  );
}

function getHomeStatusCard(status: HomeSwapStatus, reservationLabel: string) {
  switch (status) {
    case "reserved":
      return {
        icon: CalendarCheck,
        title: "수거 예약이 완료됐어요",
        description: (reservationLabel || "예약 시간") + "에 맞춰 수거가 진행됩니다.",
      };
    case "pickup":
      return {
        icon: Truck,
        title: "수거가 진행 중이에요",
        description: "배정된 수거 크루가 방문을 준비하고 있습니다.",
      };
    case "reviewPending":
      return {
        icon: ClipboardCheck,
        title: "최종 확인 중",
        description: "수거물 확인과 허브 인수 절차가 완료되면 ThinQ 알림으로 안내해 드립니다.",
      };
    case "reviewCompleted":
      return {
        icon: Bell,
        title: "확인이 완료됐어요",
        description: "최종 감정 결과와 보상 정보를 확인해 보세요.",
      };
    case "reReviewPending":
      return {
        icon: Clock,
        title: "재검토 중",
        description: "요청하신 내용을 기준으로 다시 확인하고 있습니다.",
      };
    case "reReviewCompleted":
      return {
        icon: CheckCircle2,
        title: "재검토가 완료됐어요",
        description: "재검토 결과와 최종 보상 정보를 확인해 보세요.",
      };
    default:
      return {
        icon: Recycle,
        title: "SwapIt 신청 가능",
        description: "오래된 가전을 보상 크레딧으로 바꿔보세요.",
      };
  }
}

function SwapItFeatureScreen(props: {
  error: unknown;
  analyzeError: unknown;
  fileName: string;
  isBusy: boolean;
  homeSwapStatus: HomeSwapStatus;
  reservationLabel: string;
  reservationAddress: string;
  selectedAppliance: ApplianceId;
  step: SwapStep;
  swapRequest: SwapRequest | null;
  analyzeLoading: boolean;
  bookingLoading: boolean;
  creditLoading: boolean;
  onBack: () => void;
  onClose: () => void;
  onNewRequest: () => void;
  onApplianceChange: (appliance: ApplianceId) => void;
  onStart: () => void;
  onFileChange: (fileName: string) => void;
  onAnalyze: (submission: CaptureSubmission) => void;
  onRetryAnalysis: () => void;
  onValuationNext: () => void;
  onOpenPurchaseFlow: () => void;
  selectedPurchaseProductId: "washer" | "fridge" | "aircon" | null;
  onSelectPurchaseProduct: (productId: "washer" | "fridge" | "aircon" | null) => void;
  onBooking: (booking: BookingSelection) => void;
  onComplete: () => void;
  onFinalize: () => void;
  onRequestReReview: () => void;
  onOpenMarket: () => void;
  onReturnHome: () => void;
  onChangeReservation: () => void;
  onCancelReservation: () => void;
  onCloseReservationComplete: () => void;
  onViewReservation: () => void;
  onOpenTracking: () => void;
  onOpenCredit: () => void;
}) {
  const selectedLabel =
    applianceOptions.find((option) => option.id === props.selectedAppliance)?.label ?? "가전";
  const showFeatureHeader = props.step !== "capture";

  return (
    <div
      className={`relative flex min-h-0 flex-1 flex-col ${
        props.step === "intro" ? "overflow-hidden" : ""
      }`}
    >
      {showFeatureHeader ? (
        <header className="relative z-20 px-4 pb-3">
          <div className="mb-3 flex items-center justify-between">
            <button
              aria-label="이전 화면으로 돌아가기"
              className={`flex h-9 w-9 items-center justify-center rounded-full shadow-sm ${
                props.step === "intro" ? "bg-white/95 text-lgred" : "bg-white text-ink"
              }`}
              onClick={props.onBack}
            >
              <ArrowLeft size={18} />
            </button>
            <button
              className={`h-9 rounded-full bg-white/95 px-3 text-xs font-bold text-lgred shadow-sm disabled:text-slate-400 ${
                props.step === "tracking" ? "invisible w-9 px-0" : ""
              }`}
              disabled={props.isBusy}
              onClick={props.step === "intro" ? props.onClose : props.onReturnHome}
            >
              {props.step === "intro" ? "닫기" : <Home size={16} />}
            </button>
          </div>
          {props.step !== "intro" &&
          props.step !== "ongoing" &&
          props.step !== "tracking" &&
          props.step !== "credit" ? (
            <ThreeStepProgress step={props.step} />
          ) : null}
          {(props.step === "ongoing" || props.step === "tracking" || props.step === "credit") ? (
            <OngoingReservationHeader step={props.step} />
          ) : null}
        </header>
      ) : null}

      <div
        className={getContentClassName(props.step)}
      >
        {props.error ? (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            일시적인 오류가 발생했습니다. 잠시 후 다시 시도하거나 새로고침해 주세요.
          </div>
        ) : null}
        {props.step === "intro" ? (
          <SwapItIntro
            selectedAppliance={props.selectedAppliance}
            onApplianceChange={props.onApplianceChange}
            onStart={props.onStart}
          />
        ) : null}
        {props.step === "capture" ? (
          <CapturePanel
            applianceId={props.selectedAppliance}
            applianceLabel={selectedLabel}
            fileName={props.fileName}
            loading={props.analyzeLoading}
            onFileChange={props.onFileChange}
            onAnalyze={props.onAnalyze}
            onCancel={props.onBack}
          />
        ) : null}
        {props.step === "analyzing" ? (
          <AnalyzingPanel
            applianceLabel={selectedLabel}
            error={props.analyzeError instanceof Error ? props.analyzeError.message : null}
            onRetake={() => props.onBack()}
            onRetry={props.onRetryAnalysis}
          />
        ) : null}
        {props.step === "valuation" ? (
          <PreValuationPanel
            loading={props.isBusy}
            onNext={props.onValuationNext}
            onOpenPurchase={props.onOpenPurchaseFlow}
            swapRequest={props.swapRequest}
          />
        ) : null}
        {props.step === "market" ? (
          <PurchasePanel
            estimatedCredit={Math.round(((props.swapRequest?.preValuation.minEstimatedValue ?? 0) + (props.swapRequest?.preValuation.maxEstimatedValue ?? 0)) / 2)}
            selectedProductId={props.selectedPurchaseProductId}
            onSelectProduct={(productId) => props.onSelectPurchaseProduct(productId)}
            onContinueToBooking={props.onValuationNext}
          />
        ) : null}
        {props.step === "booking" ? (
          <BookingPanel
            swapRequest={props.swapRequest}
            loading={props.bookingLoading}
            onBooking={props.onBooking}
          />
        ) : null}
        {props.step === "reservationComplete" ? (
          <ReservationCompletePanel
            reservationAddress={props.reservationAddress}
            reservationLabel={props.reservationLabel}
            onClose={props.onCloseReservationComplete}
            onViewReservation={props.onViewReservation}
          />
        ) : null}
        {props.step === "ongoing" ? (
          <OngoingReservationPanel
            reservationLabel={props.reservationLabel}
            reservationAddress={props.reservationAddress}
            status={props.homeSwapStatus}
            onChange={props.onChangeReservation}
            onCancel={props.onCancelReservation}
            onOpenTracking={props.onOpenTracking}
            onOpenCredit={props.onOpenCredit}
          />
        ) : null}
        {props.step === "tracking" ? (
          <TrackingPanel
            swapRequest={props.swapRequest}
            onNext={props.onComplete}
          />
        ) : null}
        {props.step === "credit" ? (
          <CreditPanel
            fileName={props.fileName}
            reviewStatus={props.homeSwapStatus}
            swapRequest={props.swapRequest}
            loading={props.creditLoading}
            onFinalize={props.onFinalize}
            onRequestReReview={props.onRequestReReview}
            onOpenMarket={props.onOpenMarket}
            onReturnHome={props.onReturnHome}
          />
        ) : null}
      </div>
    </div>
  );
}

function StepProgress({ step }: { step: SwapStep }) {
  const currentStep = getProgressStep(step);
  const steps = [
    { id: 1, label: "촬영" },
    { id: 2, label: "감정" },
    { id: 3, label: "예약" },
    { id: 4, label: "이동" },
    { id: 5, label: "보상" },
  ];

  return (
    <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center">
        {steps.map((item, index) => {
          const active = item.id === currentStep;
          const done = item.id < currentStep;

          return (
            <div key={item.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex shrink-0 flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-colors ${
                    active || done ? "bg-lgred text-white" : "bg-[#e8e8f1] text-slate-400"
                  }`}
                >
                  {item.id}
                </div>
                <span
                  className={`text-[10px] font-black leading-none ${
                    active || done ? "text-lgred" : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={`mx-1.5 mb-4 h-[3px] flex-1 rounded-full ${
                    done ? "bg-lgred/70" : "bg-[#e1e1eb]"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ThreeStepProgress({ step }: { step: SwapStep }) {
  const currentStep = getProgressStep(step);
  const steps = [
    { id: 1, label: "촬영" },
    { id: 2, label: "감정" },
    { id: 3, label: "예약" },
  ];

  return (
    <div className="rounded-2xl bg-white px-3 py-2 shadow-sm">
      <div className="flex items-center">
        {steps.map((item, index) => {
          const active = item.id === currentStep;
          const done = item.id < currentStep;

          return (
            <div key={item.id} className="flex flex-1 items-center last:flex-none">
              <div className="flex shrink-0 flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition-colors ${
                    active || done ? "bg-lgred text-white" : "bg-[#e8e8f1] text-slate-400"
                  }`}
                >
                  {item.id}
                </div>
                <span
                  className={`text-[10px] font-black leading-none ${
                    active || done ? "text-lgred" : "text-slate-400"
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {index < steps.length - 1 ? (
                <div
                  className={`mx-1.5 mb-4 h-[3px] flex-1 rounded-full ${
                    done ? "bg-lgred/70" : "bg-[#e1e1eb]"
                  }`}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OngoingReservationHeader({ step }: { step: "ongoing" | "tracking" | "credit" }) {
  const title =
    step === "ongoing" ? "진행 중인 예약" : step === "tracking" ? "진행 중인 예약 · 수거 진행" : "진행 중인 예약 · 보상 단계";
  const description =
    step === "ongoing"
      ? "예약 정보 확인, STEP 4 크루 이동 확인, STEP 5 전체 보상 확인으로 이어지는 전용 화면입니다."
      : step === "tracking"
        ? "크루 이동, 수거 진행, GPS 추적을 한 화면에서 확인합니다."
        : "수거 완료 이후 검수, 최종 보상가, 크레딧 발급 단계를 이어서 확인합니다.";

  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-black text-lgred">ONGOING RESERVATION</p>
      <p className="mt-1 text-sm font-black text-ink">{title}</p>
      <p className="mt-1 text-[11px] font-semibold leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function getContentClassName(step: SwapStep) {
  if (step === "intro") {
    return "phone-scroll relative z-10 flex-1 overflow-y-auto px-0 pb-0";
  }

  if (step === "capture") {
    return "relative z-10 flex-1 overflow-hidden";
  }

  if (step === "analyzing") {
    return "relative z-10 flex-1 overflow-hidden px-4 pb-4";
  }

  return "phone-scroll relative z-10 flex-1 overflow-y-auto px-4 pb-5";
}

function getProgressStep(step: SwapStep) {
  switch (step) {
    case "capture":
      return 1;
    case "analyzing":
    case "valuation":
    case "market":
      return 2;
    case "booking":
    case "reservationComplete":
    case "ongoing":
      return 3;
    case "tracking":
      return 4;
    case "credit":
      return 5;
    default:
      return 1;
  }
}

function SwapItIntro({
  selectedAppliance,
  onApplianceChange,
  onStart,
}: {
  selectedAppliance: ApplianceId;
  onApplianceChange: (appliance: ApplianceId) => void;
  onStart: () => void;
}) {
  const applianceLabels: Record<ApplianceId, string> = {
    washing_machine: "세탁기",
    refrigerator: "냉장고",
    air_conditioner: "에어컨",
    microwave: "전자레인지",
    tv: "TV",
  };
  const selectedLabel = applianceLabels[selectedAppliance];

  return (
    <section className="relative flex min-h-full flex-col overflow-hidden bg-transparent px-4 pb-4 pt-1 text-ink">
      <div className="pointer-events-none absolute left-[-60px] top-[170px] h-52 w-52 rounded-full bg-white/12 blur-3xl" />
      <div className="pointer-events-none absolute right-[-70px] top-[22px] h-44 w-44 rounded-full bg-white/16 blur-3xl" />

      <div className="phone-scroll relative z-10 min-h-0 flex-1 overflow-y-auto pb-3">
        <section className="px-1 pb-4 pt-4 text-white">
          <p className="text-[13px] font-black text-white/75">LG ThinQ</p>
          <h1 className="mt-2 text-[34px] font-black leading-none tracking-tight">SwapIt</h1>
          <p className="mt-3 max-w-[310px] text-sm font-semibold leading-6 text-white/85">
            교체할 가전을 선택하면 사진 촬영부터 보상가 확인, 수거 예약까지 한 번에 진행할 수 있어요.
          </p>
        </section>

        <section className="rounded-[20px] bg-white p-4 shadow-sm">
          <button className="flex w-full items-center justify-between text-left" onClick={onStart}>
            <span>
              <span className="block text-[13px] font-bold text-slate-500">선택한 가전</span>
              <span className="mt-1 block text-[24px] font-black leading-none text-ink">{selectedLabel}</span>
            </span>
            <span className="rounded-full bg-lgred/10 px-3 py-1.5 text-[12px] font-black text-lgred">
              STEP 1
            </span>
          </button>
          <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 pt-4">
            <div className="min-w-0 px-2 first:pl-0">
              <p className="text-[18px] font-black leading-none text-lgred">사진</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">상태 분석</p>
            </div>
            <div className="min-w-0 px-2">
              <p className="text-[18px] font-black leading-none text-ink">보상</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">크레딧 확인</p>
            </div>
            <div className="min-w-0 px-2 last:pr-0">
              <p className="text-[18px] font-black leading-none text-ink">수거</p>
              <p className="mt-1 text-[11px] font-bold text-slate-400">예약 진행</p>
            </div>
          </div>
        </section>

        <section className="mt-3 rounded-[20px] bg-white p-2 shadow-sm">
          <div className="flex items-center justify-between px-3 py-2.5">
            <h2 className="text-sm font-black text-ink">교환할 가전 선택</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">
              {applianceOptions.length}개
            </span>
          </div>
          <div className="divide-y divide-slate-100">
            {applianceOptions.map((option) => {
              const Icon = option.icon;
              const active = selectedAppliance === option.id;

              return (
                <button
                  key={option.id}
                  className="flex w-full items-center gap-3 rounded-[16px] px-3 py-3 text-left"
                  onClick={() => onApplianceChange(option.id)}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${
                      active ? "bg-lgred text-white" : "bg-lgred/10 text-lgred"
                    }`}
                  >
                    <Icon size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-ink">{applianceLabels[option.id]}</span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                      active ? "bg-lgred/10 text-lgred" : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {active ? "선택됨" : "선택"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <div className="relative z-10 shrink-0 rounded-[22px] bg-white p-2 shadow-sm">
        <button
          className="h-14 w-full rounded-[16px] bg-lgred text-sm font-black text-white"
          onClick={onStart}
        >
          사진 등록하러 가기
        </button>
      </div>
    </section>
  );
}

function IndianPatternOverlay({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${className}`} />;
}

function DeviceCard({
  icon,
  label,
  status,
}: {
  icon: React.ReactNode;
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[16px] px-3 py-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-lgred/10 text-lgred">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black text-ink">{label}</p>
        <p className="mt-0.5 text-xs font-semibold text-slate-500">{status}</p>
      </div>
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-500">
        보기
      </span>
      <ChevronRight size={18} className="text-slate-300" />
    </div>
  );
}

function HomeIcon({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 opacity-80">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/85 text-slate-700 shadow-lg">
        {children}
      </span>
      <span className="text-center text-xs font-bold text-white">{label}</span>
    </div>
  );
}

function CellularBars() {
  return (
    <span className="flex h-3 items-end gap-[1px]" aria-hidden="true">
      <span className="h-[3px] w-[2px] rounded-full bg-current opacity-60" />
      <span className="h-[5px] w-[2px] rounded-full bg-current opacity-70" />
      <span className="h-[7px] w-[2px] rounded-full bg-current opacity-85" />
      <span className="h-[9px] w-[2px] rounded-full bg-current" />
    </span>
  );
}

function WifiGlyph() {
  return (
    <svg
      aria-hidden="true"
      className="h-[11px] w-[15px]"
      fill="none"
      height="11"
      viewBox="0 0 15 11"
      width="15"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M7.5 2.5C5.45 2.5 3.57 3.23 2.1 4.45C1.91 4.61 1.62 4.59 1.45 4.41L.82 3.75C.62 3.54.65 3.2.89 3.02C2.94 1.37 5.55.5 7.5.5C9.45.5 12.06 1.37 14.11 3.02C14.35 3.2 14.38 3.54 14.18 3.75L13.55 4.41C13.38 4.59 13.09 4.61 12.9 4.45C11.43 3.23 9.55 2.5 7.5 2.5Z"
        fill="currentColor"
        opacity="0.45"
      />
      <path
        d="M7.5 5.35C6.36 5.35 5.31 5.76 4.49 6.44C4.3 6.6 4.02 6.58 3.85 6.4L3.22 5.74C3.02 5.53 3.05 5.2 3.29 5.02C4.45 4.1 5.91 3.6 7.5 3.6C9.09 3.6 10.55 4.1 11.71 5.02C11.95 5.2 11.98 5.53 11.78 5.74L11.15 6.4C10.98 6.58 10.7 6.6 10.51 6.44C9.69 5.76 8.64 5.35 7.5 5.35Z"
        fill="currentColor"
        opacity="0.72"
      />
      <path
        d="M7.5 8.45C6.9 8.45 6.36 8.67 5.94 9.04C5.75 9.2 5.47 9.18 5.3 9L4.67 8.34C4.47 8.13 4.5 7.79 4.74 7.61C5.44 7.07 6.31 6.78 7.5 6.78C8.69 6.78 9.56 7.07 10.26 7.61C10.5 7.79 10.53 8.13 10.33 8.34L9.7 9C9.53 9.18 9.25 9.2 9.06 9.04C8.64 8.67 8.1 8.45 7.5 8.45Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BatteryGlyph() {
  return (
    <span className="flex items-center gap-[1px]" aria-hidden="true">
      <span className="h-[8px] w-[17px] rounded-[3px] border border-current p-[1px]">
        <span className="block h-full w-[12px] rounded-[2px] bg-current" />
      </span>
      <span className="h-[4px] w-[1.5px] rounded-r-full bg-current" />
    </span>
  );
}
