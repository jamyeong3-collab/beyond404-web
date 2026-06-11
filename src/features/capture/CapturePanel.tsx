"use client";

import {
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ApplianceId = "washing_machine" | "refrigerator" | "air_conditioner" | "microwave" | "tv";
type CapturePhase = "camera" | "recognizing" | "review" | "sticker-camera" | "sticker-recognizing";

type StickerLabelInfo = {
  brand: string | null;
  modelName: string | null;
  manufacturingDate: string | null;
};

type SpecLookupResult = {
  applianceType: string | null;
  brand: string | null;
  capacity: string | null;
  size: string | null;
  releaseYear: number | null;
  powerConsumption: string | null;
  weight_kg: number | null;
};

async function callLabelApi(imageDataUrl: string): Promise<StickerLabelInfo> {
  const resized = await resizeImageForApi(imageDataUrl, 1280);
  const res = await fetchWithTimeout("/api/analyze-label", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: resized }),
  });
  if (!res.ok) throw new Error("API 오류");
  return res.json() as Promise<StickerLabelInfo>;
}

async function callLookupSpecsApi(modelName: string): Promise<SpecLookupResult> {
  const res = await fetchWithTimeout("/api/lookup-specs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelName }),
  });
  if (!res.ok) throw new Error("API 오류");
  return res.json() as Promise<SpecLookupResult>;
}

function releaseYearToAge(year: number): string {
  const age = new Date().getFullYear() - year;
  if (age < 1) return "1년 미만";
  if (age <= 3) return "1~3년";
  if (age <= 5) return "3년 이상";
  if (age <= 10) return "5년 이상";
  return "10년 이상";
}

// 금속 시세 (원/kg) — 2025년 기준
const METAL_PRICES = { steel: 350, aluminum: 1800, copper: 9000 } as const;

// 가전별 금속 비율 (WEEE 논문 최고값)
const METAL_RATIOS: Record<string, { steel: number; aluminum: number; copper: number }> = {
  냉장고:    { steel: 0.45, aluminum: 0.07, copper: 0.05 },
  세탁기:    { steel: 0.65, aluminum: 0.04, copper: 0.03 },
  에어컨:    { steel: 0.42, aluminum: 0.25, copper: 0.18 },
  전자레인지: { steel: 0.55, aluminum: 0.06, copper: 0.04 },
  TV:        { steel: 0.22, aluminum: 0.09, copper: 0.06 },
};

// 가전별 크기 등급별 평균 무게 (kg)
const APPLIANCE_WEIGHTS: Record<string, { 소형: number; 중형: number; 대형: number }> = {
  냉장고: { 소형: 35, 중형: 65, 대형: 100 },
  세탁기: { 소형: 50, 중형: 70, 대형: 90 },
  에어컨: { 소형: 15, 중형: 30, 대형: 50 },
  전자레인지: { 소형: 10, 중형: 14, 대형: 20 },
  TV: { 소형: 8, 중형: 15, 대형: 30 },
};

// 모델명별 실제 무게 더미 DB (크롤링 완료 전 데모용)
const MOCK_MODEL_WEIGHT_DB: Record<string, number> = {
  // LG 냉장고
  "GN-B813SQCL": 102, "GN-Q608DLHL": 82, "GN-F702HLHU": 90,
  "GN-B482SQCL": 68,  "GN-Y702HLHU": 88,
  // LG 세탁기
  "FHP1411Z9P": 69, "FH1210DSW": 66, "FX25VSK": 75,
  // LG 에어컨
  "US-Q19BNZE3": 14, "SQ18BDAWWS": 12,
  // LG 전자레인지
  "MS2342DB": 12, "MS2043DB": 11,
  // 삼성 냉장고
  "RF85B9121AP": 130, "RH69B8941B1": 118, "RT56K6977BS": 74,
  // 삼성 세탁기
  "WW90TA046AX": 59, "WF18T8000GW": 88,
  // 삼성 에어컨
  "AR09BXHQASINS": 9, "AR18BXHQASINS": 11,
  // 삼성 TV
  "QN65QN90CAFXKR": 22, "QN55Q80CAFXKR": 17,
};

function getWeightForCalc(modelName: string, applianceType: string, size: string): { weight: number; fromMockDB: boolean } {
  const normalized = modelName.trim().toUpperCase();
  for (const [key, weight] of Object.entries(MOCK_MODEL_WEIGHT_DB)) {
    if (normalized.includes(key.toUpperCase()) || key.toUpperCase().includes(normalized)) {
      return { weight, fromMockDB: true };
    }
  }
  const fallback = APPLIANCE_WEIGHTS[applianceType]?.[size as keyof (typeof APPLIANCE_WEIGHTS)[string]] ?? null;
  return { weight: fallback ?? 0, fromMockDB: false };
}

function calculateScrapValue(applianceType: string, size: string, modelName?: string): number | null {
  const ratios = METAL_RATIOS[applianceType];
  if (!ratios) return null;

  const { weight } = modelName
    ? getWeightForCalc(modelName, applianceType, size)
    : { weight: APPLIANCE_WEIGHTS[applianceType]?.[size as keyof (typeof APPLIANCE_WEIGHTS)[string]] ?? 0 };

  if (!weight) return null;
  const value =
    weight * (
      ratios.steel * METAL_PRICES.steel +
      ratios.aluminum * METAL_PRICES.aluminum +
      ratios.copper * METAL_PRICES.copper
    );
  return Math.round(value / 100) * 100;
}

// 신제품 등급 기준 (가격 기준 자동 분류)
function getNewProductTier(price: number): "프리미엄" | "일반" | "보급형" {
  if (price >= 1_500_000) return "프리미엄";
  if (price >= 500_000) return "일반";
  return "보급형";
}

// 크레딧 비율 매트릭스 [신제품 등급][이용 횟수]
const CREDIT_RATIO_MATRIX: Record<string, [number, number, number]> = {
  프리미엄: [0.10, 0.12, 0.15],
  일반:     [0.07, 0.10, 0.12],
  보급형:   [0.04, 0.07, 0.09],
};

const CAP_RATIO = 0.15;

// 더미 신제품 데이터 (실제 연동 전 테스트용)
const DUMMY_NEW_PRODUCT = { price: 1_000_000, label: "일반 LG 가전 100만원" };
const DUMMY_SWAP_COUNT = 1; // 1회=최초, 2회=실버, 3+회=VIP

function calculateFinalCredit(
  applianceType: string,
  size: string,
  newProductPrice: number,
  swapCount: number,
  modelName?: string,
  weightKgOverride?: number | null,
): { scrap: number; bonus: number; total: number; tier: string; ratio: number; weightFromDB: boolean } | null {
  const ratios = METAL_RATIOS[applianceType];
  if (!ratios) return null;

  // 우선순위: 1) API 반환 무게 2) mock DB 3) 크기 등급 평균값
  let weight: number;
  let fromMockDB: boolean;
  if (weightKgOverride) {
    weight = weightKgOverride;
    fromMockDB = true;
  } else if (modelName) {
    const result = getWeightForCalc(modelName, applianceType, size);
    weight = result.weight;
    fromMockDB = result.fromMockDB;
  } else {
    weight = APPLIANCE_WEIGHTS[applianceType]?.[size as keyof (typeof APPLIANCE_WEIGHTS)[string]] ?? 0;
    fromMockDB = false;
  }

  if (!weight) return null;
  const scrapRaw = weight * (
    ratios.steel * METAL_PRICES.steel +
    ratios.aluminum * METAL_PRICES.aluminum +
    ratios.copper * METAL_PRICES.copper
  );
  const scrap = Math.round(scrapRaw / 100) * 100;

  const tier = getNewProductTier(newProductPrice);
  const tierRatios = CREDIT_RATIO_MATRIX[tier];
  const ratioIndex = swapCount >= 3 ? 2 : swapCount - 1;
  const ratio = tierRatios[Math.max(0, Math.min(2, ratioIndex))];

  const rawBonus = newProductPrice * ratio;
  const capBonus = newProductPrice * CAP_RATIO;
  const bonus = Math.round(Math.min(rawBonus, capBonus) / 100) * 100;

  return { scrap, bonus, total: scrap + bonus, tier, ratio, weightFromDB: fromMockDB };
}

function resizeImageForApi(dataUrl: string, maxWidth = 1024): Promise<string> {
  return new Promise((resolve) => {
    const fallback = window.setTimeout(() => resolve(dataUrl), 3000);
    const img = new Image();
    img.onload = () => {
      window.clearTimeout(fallback);
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => { window.clearTimeout(fallback); resolve(dataUrl); };
    img.src = dataUrl;
  });
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 25000): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    window.clearTimeout(id);
  }
}

async function callAnalyzeApi(imageDataUrl: string): Promise<RecognizedAppliance> {
  const resized = await resizeImageForApi(imageDataUrl);
  const res = await fetchWithTimeout("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: resized }),
  });
  if (!res.ok) throw new Error("API 오류");
  return res.json() as Promise<RecognizedAppliance>;
}

type CapturePanelProps = {
  fileName: string;
  loading: boolean;
  applianceId: ApplianceId;
  applianceLabel: string;
  onFileChange: (fileName: string) => void;
  onAnalyze: () => void;
  onCancel: () => void;
};

type RecognizedAppliance = {
  applianceType: string;
  brand: string;
  modelName: string;
  capacity: string;
  size: string; // 소형 | 중형 | 대형
  estimatedAge: string;
  conditionGrade: string;
  confidence: number;
  weightKg: number | null; // API 또는 DB에서 얻은 실제 무게
};

type CameraEffectConstraint = MediaTrackConstraintSet & {
  backgroundBlur?: boolean;
  backgroundSegmentationMask?: boolean;
};

const frameByAppliance: Record<
  ApplianceId,
  {
    className: string;
    title: string;
    description: string;
  }
> = {
  washing_machine: {
    className: "h-[330px] w-[285px] rounded-[28px]",
    title: "세탁기 정면을 프레임에 맞춰주세요",
    description: "도어와 전체 외관이 보이면 좋아요.",
  },
  refrigerator: {
    className: "h-[470px] w-[245px] rounded-[26px]",
    title: "냉장고 전체를 세로로 맞춰주세요",
    description: "문과 모서리가 잘리지 않게 촬영해주세요.",
  },
  air_conditioner: {
    className: "h-[180px] w-[320px] rounded-[24px]",
    title: "에어컨을 가로로 맞춰주세요",
    description: "실내기 전체 길이가 보이면 좋아요.",
  },
  microwave: {
    className: "h-[220px] w-[315px] rounded-[24px]",
    title: "전자레인지를 정면으로 맞춰주세요",
    description: "문과 조작부가 보이게 촬영해주세요.",
  },
  tv: {
    className: "h-[205px] w-[330px] rounded-[22px]",
    title: "TV 화면 전체를 맞춰주세요",
    description: "화면과 베젤이 모두 보이면 좋아요.",
  },
};

const mockInfoByAppliance: Record<ApplianceId, RecognizedAppliance> = {
  washing_machine: {
    applianceType: "세탁기",
    brand: "LG",
    modelName: "FHP1411Z9P",
    capacity: "12kg",
    size: "대형",
    estimatedAge: "5년 이상",
    conditionGrade: "양호",
    confidence: 82,
    weightKg: 69,
  },
  refrigerator: {
    applianceType: "냉장고",
    brand: "LG",
    modelName: "GL-T422VPZX",
    capacity: "422L",
    size: "중형",
    estimatedAge: "4년 이상",
    conditionGrade: "보통",
    confidence: 79,
    weightKg: null,
  },
  air_conditioner: {
    applianceType: "에어컨",
    brand: "LG",
    modelName: "US-Q19BNZE3",
    capacity: "1.5톤",
    size: "중형",
    estimatedAge: "3년 이상",
    conditionGrade: "양호",
    confidence: 84,
    weightKg: 14,
  },
  microwave: {
    applianceType: "전자레인지",
    brand: "LG",
    modelName: "MW23GD",
    capacity: "23L",
    size: "중형",
    estimatedAge: "1년 미만",
    conditionGrade: "매우 좋음",
    confidence: 90,
    weightKg: 12,
  },
  tv: {
    applianceType: "TV",
    brand: "LG",
    modelName: "OLED55A3",
    capacity: "55인치",
    size: "중형",
    estimatedAge: "3년 이상",
    conditionGrade: "양호",
    confidence: 81,
    weightKg: null,
  },
};

export function CapturePanel({
  fileName,
  loading,
  applianceId,
  applianceLabel,
  onFileChange,
  onAnalyze,
  onCancel,
}: CapturePanelProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<CapturePhase>(fileName ? "review" : "camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [capturedImageData, setCapturedImageData] = useState("");
  const [stickerImageData, setStickerImageData] = useState("");
  const [recognizedInfo, setRecognizedInfo] = useState<RecognizedAppliance>(
    mockInfoByAppliance[applianceId],
  );

  const frame = frameByAppliance[applianceId];
  const canUseCamera = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(navigator.mediaDevices?.getUserMedia);
  }, []);

  useEffect(() => {
    setRecognizedInfo(mockInfoByAppliance[applianceId]);
  }, [applianceId]);

  // 전면 VLM 분석: phase 전환은 고정 타이머로 보장, API는 백그라운드에서 실행
  useEffect(() => {
    if (phase !== "recognizing") return;

    if (!capturedImageData) {
      const timer = window.setTimeout(() => setPhase("review"), 900);
      return () => window.clearTimeout(timer);
    }

    let live = true;

    // phase 전환은 API와 무관하게 2.5초 후 반드시 실행
    const transitionTimer = window.setTimeout(() => {
      if (live) setPhase("sticker-camera");
    }, 2500);

    // API는 백그라운드에서 실행 — 완료되면 데이터 업데이트
    callAnalyzeApi(capturedImageData)
      .then((result) => { if (live) setRecognizedInfo(result); })
      .catch(() => {});

    return () => { live = false; window.clearTimeout(transitionTimer); };
  }, [phase, capturedImageData, applianceId]);

  useEffect(() => {
    if (loading || (phase !== "camera" && phase !== "sticker-camera")) {
      stopCamera();
      return undefined;
    }

    startCamera();

    return () => stopCamera();
  }, [loading, phase]);

  useEffect(() => {
    if (phase !== "sticker-recognizing") return;
    if (!stickerImageData) { setPhase("review"); return; }

    // effect 시작 시점의 인식 정보 스냅샷 (stale closure 방지)
    const prevModelName = recognizedInfo.modelName;
    const prevBrand = recognizedInfo.brand;
    const prevEstimatedAge = recognizedInfo.estimatedAge;

    let cancelled = false;

    const fallbackTimer = window.setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      setPhase("review");
    }, 30000);

    (async () => {
      try {
        // 1단계: 스티커 OCR → 브랜드 + 모델명 텍스트 추출
        const labelResult = await callLabelApi(stickerImageData);
        if (cancelled) return;

        const mergedModelName = labelResult.modelName || prevModelName || "";
        const mergedBrand = labelResult.brand || prevBrand || "";

        if (mergedModelName) {
          // 2단계: 모델명으로 스펙 조회
          try {
            const specs = await callLookupSpecsApi(mergedModelName);
            if (cancelled) return;

            setRecognizedInfo((prev) => ({
              ...prev,
              brand: mergedBrand || specs.brand || prev.brand,
              modelName: mergedModelName,
              capacity: specs.capacity || prev.capacity,
              size: specs.size || prev.size,
              estimatedAge: specs.releaseYear
                ? releaseYearToAge(specs.releaseYear)
                : prevEstimatedAge,
              // API가 무게를 알고 있으면 저장 (스크랩 계산 정확도 향상)
              weightKg: specs.weight_kg ?? prev.weightKg,
            }));
          } catch {
            // 스펙 조회 실패 → OCR 결과만 반영
            setRecognizedInfo((prev) => ({
              ...prev,
              brand: mergedBrand || prev.brand,
              modelName: mergedModelName,
            }));
          }
        } else {
          // 모델명 없음 → 브랜드만 보완
          setRecognizedInfo((prev) => ({
            ...prev,
            brand: mergedBrand || prev.brand,
          }));
        }
      } catch {
        // OCR 완전 실패 → 기존 정보 유지
      } finally {
        window.clearTimeout(fallbackTimer);
        if (!cancelled) setPhase("review");
      }
    })();

    return () => { cancelled = true; window.clearTimeout(fallbackTimer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, stickerImageData]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (loading) {
    return <AnalyzingView applianceLabel={applianceLabel} />;
  }

  async function startCamera() {
    if (!canUseCamera) {
      setCameraReady(false);
      setCameraMessage("이 브라우저에서는 카메라 미리보기를 사용할 수 없어 데모 화면으로 표시됩니다.");
      return;
    }

    try {
      stopCamera();
      setCameraMessage("");
      const stream = await createCameraStream();

      streamRef.current = stream;
      await disableCameraBackgroundEffects(stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
    } catch {
      setCameraReady(false);
      setCameraMessage("모바일에서 실제 카메라를 쓰려면 카메라 권한 허용 또는 HTTPS 환경이 필요합니다.");
    }
  }

  async function createCameraStream() {
    const baseVideoConstraints = {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    };

    const cameraRequests: MediaStreamConstraints[] = [
      {
        audio: false,
        video: {
          ...baseVideoConstraints,
          facingMode: { exact: "environment" },
        },
      },
      {
        audio: false,
        video: {
          ...baseVideoConstraints,
          facingMode: { ideal: "environment" },
        },
      },
      {
        audio: false,
        video: baseVideoConstraints,
      },
    ];

    let lastError: unknown;

    for (const constraints of cameraRequests) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError;
  }

  async function disableCameraBackgroundEffects(stream: MediaStream) {
    const [videoTrack] = stream.getVideoTracks();
    if (!videoTrack?.applyConstraints) return;

    try {
      const cameraEffectConstraints: MediaTrackConstraints = {
        advanced: [
          {
            backgroundBlur: false,
            backgroundSegmentationMask: false,
          } as CameraEffectConstraint,
        ],
      };

      // Browser/device support differs, so unsupported camera effect controls are ignored.
      await videoTrack.applyConstraints(cameraEffectConstraints);
    } catch {
      // Some browsers do not expose background effect controls. The app still shows the raw stream it receives.
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function handleCapture() {
    const video = videoRef.current;
    const frameEl = frameRef.current;
    const generatedFileName = `swapit-${applianceId}-${Date.now()}.jpg`;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraMessage("카메라 화면이 준비되면 촬영해주세요.");
      return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraMessage("촬영 이미지를 만들 수 없습니다. 다시 시도해주세요.");
      return;
    }

    // iOS WebKit에서 absolute 요소의 clientWidth는 0을 반환하는 버그 있음
    // getBoundingClientRect()가 실제 렌더링 크기를 반환하므로 우선 사용
    const videoRect = video.getBoundingClientRect();
    const vw = videoRect.width > 0 ? videoRect.width : window.innerWidth;
    const vh = videoRect.height > 0 ? videoRect.height : window.innerHeight;

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;

    if (frameEl && vw > 0 && vh > 0) {
      try {
        const scale = Math.max(vw / video.videoWidth, vh / video.videoHeight);
        if (scale > 0 && isFinite(scale)) {
          const hiddenX = (video.videoWidth * scale - vw) / 2;
          const hiddenY = (video.videoHeight * scale - vh) / 2;

          const frameRect = frameEl.getBoundingClientRect();
          const relX = frameRect.left - videoRect.left;
          const relY = frameRect.top - videoRect.top;

          const cropX = (relX + hiddenX) / scale;
          const cropY = (relY + hiddenY) / scale;
          const cropW = frameRect.width / scale;
          const cropH = frameRect.height / scale;

          if (cropW > 0 && cropH > 0 && isFinite(cropX) && isFinite(cropY) && isFinite(cropW) && isFinite(cropH)) {
            sx = Math.max(0, cropX);
            sy = Math.max(0, cropY);
            sw = Math.min(cropW, video.videoWidth - sx);
            sh = Math.min(cropH, video.videoHeight - sy);
          }
        }
      } catch {
        // 계산 실패 시 전체 프레임으로 fallback
      }
    } else if (vw > 0 && vh > 0) {
      const videoAspect = video.videoWidth / video.videoHeight;
      const containerAspect = vw / vh;
      if (videoAspect > containerAspect) {
        sw = video.videoHeight * containerAspect;
        sx = (video.videoWidth - sw) / 2;
      } else {
        sh = video.videoWidth / containerAspect;
        sy = (video.videoHeight - sh) / 2;
      }
    }

    // sw/sh가 0이거나 NaN이면 전체 프레임으로 대체
    sw = (sw > 0 && isFinite(sw)) ? Math.round(sw) : video.videoWidth;
    sh = (sh > 0 && isFinite(sh)) ? Math.round(sh) : video.videoHeight;
    sx = isFinite(sx) ? Math.round(sx) : 0;
    sy = isFinite(sy) ? Math.round(sy) : 0;

    canvas.width = sw;
    canvas.height = sh;
    context.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    const capturedImageUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreviewUrl(capturedImageUrl);
    setCapturedImageData(capturedImageUrl);
    onFileChange(generatedFileName);
    stopCamera();
    setPhase("recognizing");
  }

  function createDemoCapture(generatedFileName: string) {
    setPreviewUrl("");
    setCapturedImageData(""); // 이미지 없음 → mock 데이터 사용
    onFileChange(generatedFileName);
    stopCamera();
    setPhase("recognizing");
  }

  function handleStickerCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraMessage("카메라 화면이 준비되면 촬영해주세요.");
      return;
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    const videoRect = video.getBoundingClientRect();
    const vw = videoRect.width > 0 ? videoRect.width : window.innerWidth;
    const vh = videoRect.height > 0 ? videoRect.height : window.innerHeight;

    let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
    if (vw > 0 && vh > 0) {
      const scale = Math.max(vw / video.videoWidth, vh / video.videoHeight);
      if (scale > 0 && isFinite(scale)) {
        sw = Math.round(vw / scale);
        sh = Math.round(vh / scale);
        sx = Math.max(0, Math.round((video.videoWidth - sw) / 2));
        sy = Math.max(0, Math.round((video.videoHeight - sh) / 2));
      }
    }
    canvas.width = Math.max(1, sw);
    canvas.height = Math.max(1, sh);
    context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

    const capturedUrl = canvas.toDataURL("image/jpeg", 0.95);
    setStickerImageData(capturedUrl);
    stopCamera();
    setPhase("sticker-recognizing");
  }

  function handleRetake() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
    setCapturedImageData("");
    setStickerImageData("");
    onFileChange("");
    setRecognizedInfo(mockInfoByAppliance[applianceId]);
    setPhase("camera");
  }

  if (phase === "recognizing") {
    return <MockVlmRecognizingView applianceLabel={applianceLabel} />;
  }

  if (phase === "review") {
    return (
      <ReviewCaptureView
        applianceLabel={applianceLabel}
        fileName={fileName}
        previewUrl={previewUrl}
        recognizedInfo={recognizedInfo}
        onChange={setRecognizedInfo}
        onAnalyze={onAnalyze}
        onRetake={handleRetake}
      />
    );
  }

  if (phase === "sticker-camera") {
    return (
      <section className="relative h-full overflow-hidden bg-[#111318] text-white">
        <div className="absolute inset-0">
          <video
            ref={videoRef}
            className={`h-full w-full object-cover [backdrop-filter:none] [filter:none] ${cameraReady ? "opacity-100" : "opacity-0"}`}
            muted
            playsInline
            style={{ filter: "none", backdropFilter: "none" }}
          />
          {!cameraReady && <DemoCameraFallback />}
          <div className="pointer-events-none absolute inset-0 bg-black/15" />
        </div>

        <div className="relative z-20 flex items-center justify-between px-6 pt-5">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white/85">
            2 / 2
          </span>
          <button
            className="text-sm font-semibold text-white/70"
            onClick={() => setPhase("review")}
            type="button"
          >
            건너뛰기
          </button>
        </div>

        <div className="relative z-10 flex h-[calc(100%-150px)] flex-col items-center justify-center gap-4 px-6">
          <p className="text-center text-base font-black text-white">모델 라벨 스티커를 찍어주세요</p>
          <p className="rounded-full bg-black/55 px-4 py-2 text-[11px] font-black text-white/90">
            글씨가 잘 보이도록 가까이 대주세요
          </p>
          <div className="h-[150px] w-[310px] rounded-2xl border-2 border-dashed border-white/65" />
          <p className="text-center text-[11px] font-semibold leading-5 text-white/55">
            후면·측면·제품 내부 어디든 라벨이 있는 곳을 찍어주세요
          </p>
        </div>

        {cameraMessage ? (
          <div className="absolute left-6 right-6 top-[92px] z-30 rounded-2xl bg-black/55 px-4 py-3 text-center text-xs font-bold leading-5 text-white/85">
            {cameraMessage}
          </div>
        ) : null}

        <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-9">
          <button
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white"
            onClick={startCamera}
            type="button"
          >
            <RotateCcw size={21} />
          </button>
          <button
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white bg-white/15 p-1 shadow-xl shadow-black/35"
            onClick={handleStickerCapture}
            type="button"
          >
            <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-lgred">
              <Camera size={31} />
            </span>
          </button>
          <div className="h-11 w-11" />
        </div>
      </section>
    );
  }

  if (phase === "sticker-recognizing") {
    return (
      <section className="flex min-h-full flex-col items-center justify-center overflow-hidden bg-[#111318] text-white gap-6 px-8">
        <div className="relative flex h-28 w-28 items-center justify-center">
          <span className="absolute h-14 w-14 rounded-full bg-lgred/35 animate-scanPulse" />
          <span className="absolute h-14 w-14 rounded-full bg-lgred/35 animate-scanPulse [animation-delay:0.67s]" />
          <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-lgred">
            <ScanLine size={24} />
          </span>
        </div>
        <div className="text-center">
          <p className="text-xl font-black">라벨 분석 중</p>
          <p className="mt-2 text-sm font-semibold text-white/60">모델명과 스펙 정보를 읽어오고 있어요</p>
        </div>
      </section>
    );
  }

  return (
    <section className="relative h-full overflow-hidden bg-[#111318] text-white">
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className={`h-full w-full object-cover [backdrop-filter:none] [filter:none] ${cameraReady ? "opacity-100" : "opacity-0"}`}
          muted
          playsInline
          style={{ filter: "none", backdropFilter: "none" }}
        />
        {!cameraReady ? (
          <DemoCameraFallback />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-black/10" />
      </div>

      <div className="relative z-20 flex items-center justify-between px-6 pt-5">
        <button className="text-lg font-semibold text-white" onClick={onCancel} type="button">
          Cancel
        </button>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white/85">
            1 / 2
          </span>
          <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-black text-white/85">
            {applianceLabel}
          </span>
        </div>
      </div>

      <div className="relative z-10 flex h-[calc(100%-150px)] items-center justify-center px-3">
        <div ref={frameRef} className={`relative border-2 border-[#22ff36] ${frame.className}`}>
          <div className="absolute left-1/2 top-5 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-center text-[11px] font-black leading-4 text-white/90">
            가전이 프레임 안에 꽉 차도록 촬영해주세요
          </div>
          <div className="absolute inset-x-5 bottom-8 rounded-2xl bg-black/45 px-4 py-3 text-center">
            <ScanLine className="mx-auto text-white" size={26} />
            <p className="mt-2 text-sm font-black">{frame.title}</p>
            <p className="mt-1 text-xs font-semibold text-white/70">{frame.description}</p>
          </div>
        </div>
      </div>

      {cameraMessage ? (
        <div className="absolute left-6 right-6 top-[92px] z-30 rounded-2xl bg-black/55 px-4 py-3 text-center text-xs font-bold leading-5 text-white/85">
          {cameraMessage}
        </div>
      ) : null}

      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-9">
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white"
          onClick={startCamera}
          type="button"
        >
          <RotateCcw size={21} />
        </button>

        <button
          className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white bg-white/15 p-1 shadow-xl shadow-black/35"
          onClick={handleCapture}
          type="button"
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-lgred">
            <Camera size={31} />
          </span>
        </button>

        <button
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-[10px] font-black text-white"
          onClick={() => createDemoCapture(`swapit-demo-${Date.now()}.jpg`)}
          type="button"
        >
          DEMO
        </button>
      </div>
    </section>
  );
}

function DemoCameraFallback() {
  const applianceLabel = "";

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#252a31] [backdrop-filter:none] [filter:none]">
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/25 to-transparent" />
      <div className="hidden">
        {applianceLabel} 촬영 대기 화면
      </div>
    </div>
  );
}

function MockVlmRecognizingView({ applianceLabel }: { applianceLabel: string }) {
  const steps = ["제품군 확인", "브랜드와 모델명 추정", "외관 상태 분석"];

  return (
    <section className="flex min-h-full flex-col overflow-hidden bg-[#111318] text-white">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-xs font-black text-white/55">STEP 1</p>
          <h2 className="mt-1 text-xl font-black">AI 인식 중</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
          {applianceLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-5 pb-8">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute h-16 w-16 rounded-full bg-lgred/35 animate-scanPulse" />
          <span className="absolute h-16 w-16 rounded-full bg-lgred/35 animate-scanPulse [animation-delay:0.67s]" />
          <span className="absolute h-16 w-16 rounded-full bg-lgred/35 animate-scanPulse [animation-delay:1.33s]" />
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-lgred">
            <ScanLine size={28} />
          </span>
        </div>

        <div className="text-center">
          <p className="text-xl font-black">가전 정보를 확인하고 있어요</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/60">
            GPT-4o Vision이 모델명·연식·외관 상태를 분석 중이에요
          </p>
        </div>

        <ul className="w-full space-y-3">
          {steps.map((label, index) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 opacity-0 animate-fadeSlideIn"
              style={{ animationDelay: `${0.15 + index * 0.28}s` }}
            >
              <CheckCircle2 size={18} className="shrink-0 text-lgred" />
              <span className="text-sm font-semibold">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ReviewCaptureView({
  applianceLabel,
  fileName,
  previewUrl,
  recognizedInfo,
  onChange,
  onAnalyze,
  onRetake,
}: {
  applianceLabel: string;
  fileName: string;
  previewUrl: string;
  recognizedInfo: RecognizedAppliance;
  onChange: (value: RecognizedAppliance) => void;
  onAnalyze: () => void;
  onRetake: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const credit = calculateFinalCredit(
    recognizedInfo.applianceType,
    recognizedInfo.size,
    DUMMY_NEW_PRODUCT.price,
    DUMMY_SWAP_COUNT,
    recognizedInfo.modelName || undefined,
    recognizedInfo.weightKg,
  );

  return (
    <section className="phone-scroll flex h-full min-h-0 flex-col overflow-y-auto bg-white p-5 pb-0 shadow-sm">
      {showModal && previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setShowModal(false)}
        >
          <button
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
            onClick={() => setShowModal(false)}
            type="button"
          >
            <X size={20} />
          </button>
          <img
            src={previewUrl}
            alt="촬영한 가전 원본"
            className="max-h-screen max-w-full object-contain p-4"
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-lgred">STEP 1</p>
          <h2 className="mt-1 text-xl font-black text-ink">촬영 결과 확인</h2>
        </div>
        <span className="rounded-full bg-lgred/10 px-3 py-1 text-xs font-bold text-lgred">
          {applianceLabel}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-black text-ink">방금 촬영한 사진</p>
        <span className="text-[11px] font-bold text-slate-400">탭하면 전체보기</span>
      </div>

      <div
        className="mt-2 w-full cursor-pointer overflow-hidden rounded-3xl bg-[#111318] shadow-sm"
        style={{ minHeight: 180 }}
        onClick={() => previewUrl && setShowModal(true)}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="촬영한 가전"
            style={{ display: "block", width: "100%", height: "auto" }}
          />
        ) : (
          <div className="flex h-56 flex-col items-center justify-center text-white/70">
            <Camera size={34} />
            <p className="mt-3 max-w-[230px] truncate text-xs font-bold">{fileName}</p>
          </div>
        )}
      </div>

      <div className="mt-4 rounded-3xl bg-lgred/5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lgred text-white">
            <ShieldCheck size={20} />
          </span>
          <div>
            <p className="text-sm font-black text-ink">AI가 인식한 정보를 확인해주세요</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              AI가 분석한 결과예요. 틀린 내용은 직접 수정할 수 있어요.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <InfoInput
          label="가전 종류"
          value={recognizedInfo.applianceType}
          onChange={(value) => onChange({ ...recognizedInfo, applianceType: value })}
        />
        <InfoInput
          label="브랜드"
          value={recognizedInfo.brand}
          onChange={(value) => onChange({ ...recognizedInfo, brand: value })}
        />
        <InfoInput
          label="모델명"
          value={recognizedInfo.modelName}
          onChange={(value) => onChange({ ...recognizedInfo, modelName: value })}
        />
        <InfoInput
          label="용량 / 스펙"
          value={recognizedInfo.capacity}
          onChange={(value) => onChange({ ...recognizedInfo, capacity: value })}
        />
        <InfoSelect
          label="크기 등급"
          value={recognizedInfo.size}
          options={["소형", "중형", "대형"]}
          onChange={(value) => onChange({ ...recognizedInfo, size: value })}
        />
        <InfoSelect
          label="예상 연식"
          value={recognizedInfo.estimatedAge}
          options={["1년 미만", "1~3년", "3년 이상", "5년 이상", "10년 이상"]}
          onChange={(value) => onChange({ ...recognizedInfo, estimatedAge: value })}
        />
        <InfoSelect
          label="외관 상태"
          value={recognizedInfo.conditionGrade}
          options={["매우 좋음", "양호", "보통", "파손 있음"]}
          onChange={(value) => onChange({ ...recognizedInfo, conditionGrade: value })}
        />
      </div>

      <div className="mt-4 rounded-2xl bg-cloud p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-500">인식 신뢰도</span>
          <strong className="text-sm font-black text-lgred">{recognizedInfo.confidence}%</strong>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <span
            className="block h-full rounded-full bg-lgred"
            style={{ width: `${recognizedInfo.confidence}%` }}
          />
        </div>
      </div>

      {credit !== null && (
        <div className="mt-4 overflow-hidden rounded-3xl bg-lgred">
          {/* 최종 크레딧 */}
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-[11px] font-black text-white/65">예상 최종 크레딧</p>
              <p className="mt-0.5 text-3xl font-black text-white">
                {credit.total.toLocaleString("ko-KR")}
                <span className="ml-1 text-lg font-black text-white/80">원</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white/60">{recognizedInfo.size} {recognizedInfo.applianceType}</p>
              <p className="mt-1 text-[10px] font-semibold text-white/45">{DUMMY_SWAP_COUNT}회 이용 · {credit.tier} 신제품</p>
            </div>
          </div>
          {/* 계산 내역 */}
          <div className="space-y-1.5 bg-black/15 px-5 py-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/60">스크랩 가치</span>
              <span className="text-[11px] font-black text-white/80">+{credit.scrap.toLocaleString("ko-KR")}원</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-white/60">
                신제품 연계 ({(credit.ratio * 100).toFixed(0)}%)
              </span>
              <span className="text-[11px] font-black text-white/80">+{credit.bonus.toLocaleString("ko-KR")}원</span>
            </div>
            <div className="mt-1 border-t border-white/15 pt-1.5 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-white/40">
                신제품가 {DUMMY_NEW_PRODUCT.price.toLocaleString("ko-KR")}원 기준 (더미)
              </span>
              <span className="text-[10px] font-semibold text-white/40">상한 {(CAP_RATIO * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1 flex items-center gap-1">
              <span className={`text-[10px] font-black ${credit.weightFromDB ? "text-green-300" : "text-white/35"}`}>
                {credit.weightFromDB ? "✓ 모델 무게 적용" : "크기 등급 평균값 적용"}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 -mx-5 mt-5 grid grid-cols-2 gap-2 bg-white/95 px-5 pb-5 pt-3 shadow-[0_-14px_28px_rgba(255,255,255,.92)]">
        <button
          className="h-12 rounded-xl border border-lgred/20 bg-white text-sm font-black text-lgred"
          onClick={onRetake}
          type="button"
        >
          다시 촬영
        </button>
        <button
          className="h-12 rounded-xl bg-lgred px-2 text-[13px] font-black text-white"
          onClick={onAnalyze}
          type="button"
        >
          정보 확인 후 감정하기
        </button>
      </div>
    </section>
  );
}

function InfoInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <input
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-ink outline-none focus:border-lgred"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function InfoSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-slate-500">{label}</span>
      <select
        className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-black text-ink outline-none focus:border-lgred"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function AnalyzingView({ applianceLabel }: { applianceLabel: string }) {
  const completedSteps = ["사진 품질 확인", "가전 정보 반영", "예상 가치 계산"];

  return (
    <section className="flex min-h-full flex-col overflow-hidden bg-[#111318] text-white shadow-sm">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-xs font-black text-white/55">STEP 2</p>
          <h2 className="mt-1 text-xl font-black">감정 중</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
          {applianceLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-6">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute h-16 w-16 rounded-full bg-lgred/35 animate-scanPulse" />
          <span className="absolute h-16 w-16 rounded-full bg-lgred/35 animate-scanPulse [animation-delay:0.67s]" />
          <span className="absolute h-16 w-16 rounded-full bg-lgred/35 animate-scanPulse [animation-delay:1.33s]" />
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-lgred">
            <ScanLine size={28} />
          </span>
        </div>

        <div className="text-center">
          <p className="text-lg font-black">사진과 입력 정보를 분석하고 있어요</p>
          <p className="mt-1 text-sm text-white/55">잠시만 기다려주세요</p>
        </div>

        <ul className="w-full space-y-3 px-5">
          {completedSteps.map((label, index) => (
            <li
              key={label}
              className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 opacity-0 animate-fadeSlideIn"
              style={{ animationDelay: `${0.2 + index * 0.5}s` }}
            >
              <CheckCircle2 size={18} className="shrink-0 text-lgred" />
              <span className="text-sm font-semibold">{label}</span>
            </li>
          ))}
          <li
            className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 opacity-0 animate-fadeSlideIn"
            style={{ animationDelay: `${0.2 + completedSteps.length * 0.5}s` }}
          >
            <Loader2 size={18} className="shrink-0 animate-spin text-lgred" />
            <span className="text-sm font-semibold text-white/75">예상 보상가 산정 중</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
