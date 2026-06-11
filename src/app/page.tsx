"use client";

import { useMutation } from "@tanstack/react-query";
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
  demoLogin,
  requestInstantCall,
  updateAppliance,
  type DemoUser,
} from "@/lib/api";
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
  const [thinQOpened, setThinQOpened] = useState(false);
  const [swapItOpened, setSwapItOpened] = useState(false);
  const [marketOpened, setMarketOpened] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
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

  useEffect(() => {
    const savedUser = window.localStorage.getItem("swapit-demo-user");
    if (!savedUser) return;

    try {
      setDemoUser(JSON.parse(savedUser) as DemoUser);
    } catch {
      window.localStorage.removeItem("swapit-demo-user");
    }
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

  const loginMutation = useMutation({
    mutationFn: ({ userName, phoneNumber }: { userName: string; phoneNumber: string }) =>
      demoLogin(userName, phoneNumber),
    onSuccess: (data) => {
      setDemoUser(data);
      window.localStorage.setItem("swapit-demo-user", JSON.stringify(data));
    },
  });

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
    onError: () => {
      setSwapStep("capture");
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
    analyzeMutation.error ??
    acceptValuationMutation.error ??
    bookingMutation.error ??
    creditMutation.error;

  const resetExchangeFlow = () => {
    setFileName("");
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
    window.localStorage.removeItem("swapit-demo-user");
    setDemoUser(null);
    setMarketOpened(false);
    setSwapItOpened(false);
    resetExchangeFlow();
    clearActiveReservation();
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#202124] px-3 py-8">
      <section className="relative w-[min(100%,424px)] rounded-[52px] border-[8px] border-[#090a0f] bg-[#090a0f] p-[3px] shadow-phone">
        <div className="pointer-events-none absolute left-1/2 top-[22px] z-20 flex h-9 w-[126px] -translate-x-1/2 items-center justify-end rounded-full bg-black pr-3">
          <Camera size={13} className="text-slate-700" />
        </div>
        <div className="aspect-[402/874] overflow-hidden rounded-[43px] bg-cloud">
          {thinQOpened ? (
            <div
              className={`relative flex h-full animate-[fadeIn_.18s_ease-out] flex-col ${
                swapItOpened && swapStep === "intro" ? "swapit-pattern-bg" : "bg-cloud"
              }`}
            >
              {swapItOpened && swapStep === "intro" ? (
                <IndianPatternOverlay className="z-0" />
              ) : null}
              <PhoneStatusBar isDark={swapItOpened && swapStep === "intro"} />
              {!demoUser ? (
                <DemoLoginScreen
                  loading={loginMutation.isPending}
                  error={
                    loginMutation.error instanceof Error ? loginMutation.error.message : null
                  }
                  onBack={() => {
                    setIsOpening(false);
                    setMarketOpened(false);
                    setThinQOpened(false);
                  }}
                  onLogin={(userName, phoneNumber) =>
                    loginMutation.mutate({ userName, phoneNumber })
                  }
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
                    setFileName(submission.exteriorPhotoFileName);
                    setSwapStep("analyzing");
                    analyzeMutation.mutate(submission);
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
                    setIsOpening(false);
                    setMarketOpened(false);
                    setThinQOpened(false);
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
            <PhoneHomeScreen
              isOpening={isOpening}
              onOpenApp={() => {
                setIsOpening(true);
                window.setTimeout(() => {
                  setThinQOpened(true);
                  setIsOpening(false);
                }, 230);
              }}
            />
          )}
        </div>
      </section>
    </main>
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

function PhoneStatusBar({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={`relative z-30 flex h-[62px] items-start justify-between px-8 pt-4 text-[12px] font-bold ${
        isDark ? "text-white" : "text-ink"
      }`}
    >
      <span>10:24</span>
      <div className="flex items-center gap-1.5">
        <CellularBars />
        <WifiGlyph />
        <BatteryGlyph />
      </div>
    </div>
  );
}

function PhoneHomeScreen({
  isOpening,
  onOpenApp,
}: {
  isOpening: boolean;
  onOpenApp: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col justify-between bg-[radial-gradient(circle_at_20%_10%,#8aa5ff_0%,transparent_28%),radial-gradient(circle_at_82%_18%,#ffb1d2_0%,transparent_24%),linear-gradient(160deg,#151a34_0%,#283a68_42%,#d8e7ef_100%)] px-6 pb-3">
      <PhoneStatusBar isDark />
      <div className="grid grid-cols-4 gap-x-5 gap-y-7 pt-6">
        <button
          aria-label="LG ThinQ 앱 열기"
          className="relative flex flex-col items-center gap-2"
          onClick={onOpenApp}
        >
          <span
            className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-lgred text-white shadow-lg shadow-black/20 transition-transform duration-200 ease-out ${
              isOpening ? "scale-110 opacity-0" : "scale-100 opacity-100"
            }`}
          >
            <span className="text-[17px] font-black tracking-tight">ThinQ</span>
          </span>
          <span className="text-center text-xs font-bold text-white">LG ThinQ</span>
        </button>
        <HomeIcon label="Clock">
          <Clock size={28} />
        </HomeIcon>
      </div>
      <div className="mx-auto h-1.5 w-32 rounded-full bg-white/80" />
      <div
        className={`pointer-events-none absolute left-[24px] top-[110px] h-16 w-16 rounded-2xl bg-cloud transition-all duration-[230ms] ease-[cubic-bezier(.18,.86,.28,1)] ${
          isOpening ? "left-0 top-0 h-full w-full rounded-[43px] opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}

function DemoLoginScreen({
  loading,
  error,
  onBack,
  onLogin,
}: {
  loading: boolean;
  error: string | null;
  onBack: () => void;
  onLogin: (userName: string, phoneNumber: string) => void;
}) {
  const [userName, setUserName] = useState("Demo User");
  const [phoneNumber, setPhoneNumber] = useState("010-4040-2404");

  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-6">
      <header className="mb-5 flex items-center justify-between">
        <button
          aria-label="이전 화면으로 돌아가기"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-sm"
          onClick={onBack}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-xs font-black text-lgred">LG ThinQ</p>
          <p className="text-[11px] font-semibold text-slate-400">Demo Login</p>
        </div>
        <div className="h-9 w-9" />
      </header>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-xs font-black text-lgred">SwapIt 데모 로그인</p>
        <h1 className="mt-2 text-2xl font-black leading-tight text-ink">
          신청 데이터를 DB에 저장할 사용자를 확인해 주세요
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          입력한 이름과 휴대폰 번호가 users 테이블에 저장되고, 이후 교환 신청과 예약 데이터가 이 사용자와 연결됩니다.
        </p>

        <label className="mt-6 block text-sm font-black text-ink">
          이름
          <input
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base font-bold outline-none focus:border-lgred"
            value={userName}
            onChange={(event) => setUserName(event.target.value)}
            placeholder="이름"
          />
        </label>

        <label className="mt-4 block text-sm font-black text-ink">
          휴대폰 번호
          <input
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 text-base font-bold outline-none focus:border-lgred"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            placeholder="010-0000-0000"
          />
        </label>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
            로그인이 원활하지 않습니다. 백엔드 서버를 확인해 주세요.
          </p>
        ) : null}

        <button
          className="mt-6 h-13 w-full rounded-xl bg-lgred text-base font-black text-white disabled:bg-slate-300"
          disabled={loading || !userName.trim() || !phoneNumber.trim()}
          onClick={() => onLogin(userName.trim(), phoneNumber.trim())}
        >
          {loading ? "로그인 중..." : "데모 로그인"}
        </button>
      </section>
    </div>
  );
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
    <div className="flex min-h-0 flex-1 flex-col px-4 pb-5">
      <header className="mb-4 flex items-center justify-between">
        <button
          aria-label="홈 화면으로 돌아가기"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-sm"
          onClick={onBackHome}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-xs font-black text-lgred">LG ThinQ</p>
          <p className="text-[11px] font-semibold text-slate-400">Smart Home</p>
        </div>
        <button
          className="h-9 rounded-full bg-white px-3 text-[11px] font-black text-lgred shadow-sm"
          onClick={onLogout}
        >
          로그아웃
        </button>
      </header>

      <div className="phone-scroll flex-1 overflow-y-auto">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-slate-500">안녕하세요</p>
          <h1 className="mt-1 text-2xl font-black leading-tight text-ink">오늘의 집 상태</h1>
          <div className="mt-3 rounded-xl bg-lgred/5 px-3 py-2 text-xs font-bold text-lgred">
            로그인 사용자 {demoUser.userName} / {demoUser.phoneNumber}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <DeviceCard icon={<WashingMachine size={25} />} label="세탁기" status="대기 중" />
            <DeviceCard icon={<Refrigerator size={25} />} label="냉장고" status="정상" />
          </div>
        </section>

        {homeSwapStatus !== "none" ? (
          <SwapItStatusCard
            status={homeSwapStatus}
            reservationLabel={reservationLabel}
            onOpenReservation={onOpenReservation}
          />
        ) : null}

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-black text-ink">추천 기능</h2>
            <span className="text-xs font-semibold text-slate-400">For you</span>
          </div>
          <button
            className="flex w-full items-center gap-4 rounded-2xl bg-lgdark p-4 text-left text-white shadow-sm"
            onClick={onOpenSwapIt}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
              <Recycle size={26} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">SwapIt 가전 교환</span>
              <span className="mt-1 block text-xs leading-5 text-white/70">
                중고 가전을 수거하고 보상 크레딧으로 전환합니다.
              </span>
            </span>
            <ChevronRight size={20} />
          </button>
          <button
            className="mt-3 flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left text-ink shadow-sm"
            onClick={onOpenMarket}
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-lgred/10 text-lgred">
              <ShoppingBag size={25} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black">LG 가전 마켓</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                SwapIt 크레딧으로 공식 LG 상품 구매
              </span>
            </span>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </section>
      </div>
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
    <section className="mt-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-black text-ink">吏꾪뻾 以묒씤 ?덉빟</h2>
        <span className="text-xs font-semibold text-slate-400">Status</span>
      </div>
      <button
        className={
          "flex w-full items-center gap-4 rounded-2xl p-4 text-left shadow-sm " +
          (isCompleted ? "bg-lgred text-white" : "bg-white text-ink")
        }
        onClick={onOpenReservation}
      >
        <span
          className={
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl " +
            (isCompleted ? "bg-white/15 text-white" : "bg-lgred/10 text-lgred")
          }
        >
          <Icon size={25} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black">{card.title}</span>
          <span className={"mt-1 block text-xs leading-5 " + (isCompleted ? "text-white/75" : "text-slate-500")}>
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
        {props.step === "analyzing" ? <AnalyzingPanel applianceLabel={selectedLabel} /> : null}
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

  return (
    <section className="relative min-h-full overflow-hidden bg-transparent px-6 pb-6 pt-0 text-white">
      <div className="relative z-10 pt-3">
        <p className="text-xs font-black text-white/80">LG ThinQ</p>
        <h1 className="mt-5 text-5xl font-black leading-[1.02]">SwapIt</h1>
        <p className="mt-4 max-w-[285px] text-sm font-semibold leading-6 text-white/85">
          교환할 가전을 선택하고 사진을 등록하면 AI가 제품 상태를 분석해 예상 보상가를 계산합니다.
          이후 LG 가전 구매와 수거 예약까지 한 번에 이어서 진행할 수 있습니다.
        </p>
      </div>

      <p className="relative z-10 mb-3 mt-10 text-sm font-black text-white">교환할 가전을 선택해 주세요</p>
      <div className="relative z-10 rounded-[28px] bg-white/95 p-4 text-ink shadow-xl shadow-black/10 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-3">
          {applianceOptions.map((option) => {
            const Icon = option.icon;
            const active = selectedAppliance === option.id;

            return (
              <button
                key={option.id}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-lgred bg-lgred text-white"
                    : "border-slate-200 bg-slate-50 text-ink"
                }`}
                onClick={() => onApplianceChange(option.id)}
              >
                <Icon size={24} />
                <span className="mt-3 block text-sm font-black">{applianceLabels[option.id]}</span>
              </button>
            );
          })}
        </div>
        <button
          className="mt-4 h-12 w-full rounded-xl bg-lgred text-sm font-black text-white"
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
    <div className="rounded-xl bg-cloud p-3">
      <div className="text-lgred">{icon}</div>
      <p className="mt-2 text-sm font-bold text-ink">{label}</p>
      <p className="mt-1 text-xs text-slate-500">{status}</p>
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
      viewBox="0 0 15 11"
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
