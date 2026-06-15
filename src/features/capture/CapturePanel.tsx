"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  X,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";

type ApplianceId = "washing_machine" | "refrigerator" | "air_conditioner" | "microwave" | "tv";
type CapturePhase = "consent" | "camera" | "recognizing" | "sticker-camera" | "sticker-recognizing" | "review";
type CaptureTarget = "exterior" | "label";

export type CaptureSubmission = {
  exteriorPhotoFileName: string;
  labelPhotoFileName: string;
  agreedToCreditPolicy: boolean;
  applianceType: ApplianceId;
  brand: string;
  modelName: string;
  estimatedAge: string;
  exteriorCondition: string;
};

type CapturePanelProps = {
  fileName: string;
  loading: boolean;
  applianceId: ApplianceId;
  applianceLabel: string;
  onFileChange: (fileName: string) => void;
  onAnalyze: (submission: CaptureSubmission) => void;
  onCancel: () => void;
};

type RecognizedAppliance = {
  applianceType: string;
  brand: string;
  modelName: string;
  capacity?: string;
  size?: string; // 소형 | 중형 | 대형
  estimatedAge: string;
  exteriorCondition: string;
  confidence: number;
  weightKg?: number | null; // API 또는 DB에서 얻은 실제 무게
};

const targetDescriptions: Record<
  CaptureTarget,
  { title: string; description: string; demoLabel: string }
> = {
  exterior: {
    title: "가전 외관 전체가 보이도록 촬영해 주세요",
    description: "정면 또는 사선에서 주요 파손 여부가 보이는 각도로 맞춰주세요.",
    demoLabel: "외관 촬영",
  },
  label: {
    title: "뒷 라벨의 모델명과 제조 정보가 보이도록 촬영해 주세요",
    description: "시리얼/모델명이 흐리지 않도록 가까이 맞춰 촬영해 주세요.",
    demoLabel: "뒷 라벨 촬영",
  },
};

const recognitionByAppliance: Record<ApplianceId, RecognizedAppliance> = {
  washing_machine: {
    applianceType: "세탁기",
    brand: "LG",
    modelName: "FHP1411Z9P",
    estimatedAge: "3-5년",
    exteriorCondition: "생활 스크래치 경미",
    confidence: 88,
  },
  refrigerator: {
    applianceType: "냉장고",
    brand: "LG",
    modelName: "GL-T422VPZX",
    estimatedAge: "4-6년",
    exteriorCondition: "도어 모서리 사용감",
    confidence: 84,
  },
  air_conditioner: {
    applianceType: "에어컨",
    brand: "LG",
    modelName: "US-Q19BNZE3",
    estimatedAge: "2-4년",
    exteriorCondition: "실내기 전면 양호",
    confidence: 86,
  },
  microwave: {
    applianceType: "전자레인지",
    brand: "LG",
    modelName: "MH8265DIS",
    estimatedAge: "5년 이상",
    exteriorCondition: "생활 오염 있음",
    confidence: 79,
  },
  tv: {
    applianceType: "TV",
    brand: "LG",
    modelName: "OLED55C4",
    estimatedAge: "2-3년",
    exteriorCondition: "패널 외관 양호",
    confidence: 90,
  },
};

const METAL_PRICES = {
  steel: 280,
  aluminum: 1800,
  copper: 9800,
};

const METAL_RATIOS: Record<ApplianceId, { steel: number; aluminum: number; copper: number }> = {
  washing_machine: { steel: 0.62, aluminum: 0.05, copper: 0.025 },
  refrigerator: { steel: 0.58, aluminum: 0.04, copper: 0.018 },
  air_conditioner: { steel: 0.42, aluminum: 0.16, copper: 0.055 },
  microwave: { steel: 0.54, aluminum: 0.03, copper: 0.012 },
  tv: { steel: 0.18, aluminum: 0.07, copper: 0.01 },
};

const APPLIANCE_WEIGHTS: Record<ApplianceId, Record<string, number>> = {
  washing_machine: { "소형": 45, "중형": 62, "대형": 78 },
  refrigerator: { "소형": 55, "중형": 82, "대형": 115 },
  air_conditioner: { "소형": 18, "중형": 32, "대형": 48 },
  microwave: { "소형": 10, "중형": 13, "대형": 17 },
  tv: { "소형": 9, "중형": 16, "대형": 25 },
};

const MOCK_MODEL_WEIGHT_DB: Record<string, number> = {
  FHP1411Z9P: 74,
  "GL-T422VPZX": 86,
  "US-Q19BNZE3": 34,
  MH8265DIS: 12,
  OLED55C4: 17,
};

const CREDIT_RATIO_MATRIX: Record<string, number[]> = {
  premium: [0.08, 0.1, 0.12],
  standard: [0.05, 0.07, 0.09],
  basic: [0.03, 0.04, 0.05],
};

const DUMMY_NEW_PRODUCT = { price: 1000000 };
const DUMMY_SWAP_COUNT = 1;
const CAP_RATIO = 0.15;

function getWeightForCalc(
  applianceType: string,
  size?: string,
  modelName?: string,
  weightKg?: number | null,
) {
  if (weightKg) return { weight: weightKg, fromDB: true };
  if (modelName && MOCK_MODEL_WEIGHT_DB[modelName]) {
    return { weight: MOCK_MODEL_WEIGHT_DB[modelName], fromDB: true };
  }

  const key = normalizeApplianceId(applianceType);
  const grade = size && APPLIANCE_WEIGHTS[key]?.[size] ? size : "중형";
  return { weight: APPLIANCE_WEIGHTS[key]?.[grade] ?? 40, fromDB: false };
}

function normalizeApplianceId(applianceType: string): ApplianceId {
  if (applianceType === "냉장고") return "refrigerator";
  if (applianceType === "에어컨") return "air_conditioner";
  if (applianceType === "전자레인지") return "microwave";
  if (applianceType === "TV") return "tv";
  return "washing_machine";
}

function calculateScrapValue(applianceType: string, weight: number) {
  const ratios = METAL_RATIOS[normalizeApplianceId(applianceType)];
  return Math.round(
    weight * ratios.steel * METAL_PRICES.steel +
      weight * ratios.aluminum * METAL_PRICES.aluminum +
      weight * ratios.copper * METAL_PRICES.copper,
  );
}

function getNewProductTier(price: number) {
  if (price >= 1500000) return "premium";
  if (price >= 700000) return "standard";
  return "basic";
}

function calculateFinalCredit(
  applianceType: string,
  size: string | undefined,
  newProductPrice: number,
  swapCount: number,
  modelName?: string,
  weightKg?: number | null,
) {
  const { weight, fromDB } = getWeightForCalc(applianceType, size, modelName, weightKg);
  const scrap = calculateScrapValue(applianceType, weight);
  const tier = getNewProductTier(newProductPrice);
  const ratio = CREDIT_RATIO_MATRIX[tier][Math.min(Math.max(swapCount, 1), 3) - 1];
  const bonus = Math.min(Math.round(newProductPrice * ratio), Math.round(newProductPrice * CAP_RATIO));

  return {
    total: scrap + bonus,
    scrap,
    bonus,
    ratio,
    tier,
    weightFromDB: fromDB,
  };
}

function releaseYearToAge(releaseYear: number) {
  const currentYear = new Date().getFullYear();
  const age = Math.max(currentYear - releaseYear, 0);
  if (age <= 1) return "1년 이하";
  if (age <= 3) return "1-3년";
  if (age <= 5) return "3-5년";
  return "5년 이상";
}

async function postVisionApi<T>(path: string, imageData: string): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageData }),
  });

  if (!response.ok) {
    throw new Error(`Vision API failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function callAnalyzeApi(imageData: string): Promise<RecognizedAppliance> {
  return postVisionApi<RecognizedAppliance>("/api/analyze", imageData);
}

async function callLabelApi(imageData: string): Promise<{ brand?: string; modelName?: string }> {
  return postVisionApi<{ brand?: string; modelName?: string }>("/api/analyze-label", imageData);
}

async function callLookupSpecsApi(modelName: string): Promise<{
  brand?: string;
  capacity?: string;
  size?: string;
  releaseYear?: number;
  weight_kg?: number;
}> {
  const response = await fetch("/api/lookup-specs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ modelName }),
  });

  if (!response.ok) {
    throw new Error(`Lookup specs failed: ${response.status}`);
  }

  return response.json();
}

const GUIDE_FRAME_PROFILES: Record<ApplianceId, { width: string; aspectRatio: string; maxHeight: string }> = {
  refrigerator: { width: "min(68vw, 260px)", aspectRatio: "9 / 16", maxHeight: "52dvh" },
  washing_machine: { width: "min(72vw, 285px)", aspectRatio: "4 / 5", maxHeight: "48dvh" },
  air_conditioner: { width: "min(68vw, 260px)", aspectRatio: "9 / 16", maxHeight: "52dvh" },
  microwave: { width: "min(82vw, 320px)", aspectRatio: "16 / 10", maxHeight: "34dvh" },
  tv: { width: "min(84vw, 330px)", aspectRatio: "16 / 9", maxHeight: "34dvh" },
};

const LABEL_GUIDE_FRAME_STYLE: CSSProperties = {
  width: "min(82vw, 320px)",
  aspectRatio: "16 / 9",
  maxHeight: "32dvh",
};

function getGuideFrameStyle(applianceId: ApplianceId, target: CaptureTarget): CSSProperties {
  if (target === "label") {
    return LABEL_GUIDE_FRAME_STYLE;
  }

  const profile = GUIDE_FRAME_PROFILES[applianceId];
  return {
    width: profile.width,
    aspectRatio: profile.aspectRatio,
    maxHeight: profile.maxHeight,
  };
}

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
  const [phase, setPhase] = useState<CapturePhase>("consent");
  const [target, setTarget] = useState<CaptureTarget>("exterior");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [creditPolicyAgreed, setCreditPolicyAgreed] = useState(false);
  const [truthfulnessAgreed, setTruthfulnessAgreed] = useState(false);
  const [exteriorPhotoFileName, setExteriorPhotoFileName] = useState(fileName);
  const [labelPhotoFileName, setLabelPhotoFileName] = useState("");
  const [exteriorPreviewUrl, setExteriorPreviewUrl] = useState("");
  const [labelPreviewUrl, setLabelPreviewUrl] = useState("");
  const [capturedImageData, setCapturedImageData] = useState("");
  const [stickerImageData, setStickerImageData] = useState("");
  const [recognizedInfo, setRecognizedInfo] = useState<RecognizedAppliance>(
    recognitionByAppliance[applianceId],
  );

  useEffect(() => {
    setRecognizedInfo(recognitionByAppliance[applianceId]);
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

    if (streamRef.current) {
      void attachCameraStream(streamRef.current);
      return () => {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      };
    }

    void startCamera();
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [loading, phase, target]);

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
      stopCamera();
      if (exteriorPreviewUrl) URL.revokeObjectURL(exteriorPreviewUrl);
      if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
    };
  }, [exteriorPreviewUrl, labelPreviewUrl]);

  function getCameraConstraints(): MediaStreamConstraints {
    return {
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920, max: 4096 },
        height: { ideal: 1080, max: 4096 },
        frameRate: { ideal: 30 },
      },
    };
  }

  function hasCameraApi() {
    return typeof window !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia);
  }

  function getCameraUnavailableMessage() {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      return "현재 주소가 보안 주소가 아니라 카메라가 차단됐어요. PC에서는 localhost, 휴대폰에서는 HTTPS 주소로 접속해주세요.";
    }

    return "이 브라우저에서는 실시간 카메라를 사용할 수 없어요. Chrome 또는 Safari에서 다시 열어주세요.";
  }

  async function attachCameraStream(stream: MediaStream) {
    if (!videoRef.current) return;

    videoRef.current.srcObject = stream;
    videoRef.current.muted = true;
    videoRef.current.playsInline = true;
    await videoRef.current.play();
    setCameraReady(true);
  }

  async function openCamera(nextTarget: CaptureTarget, nextPhase: Extract<CapturePhase, "camera" | "sticker-camera">) {
    setTarget(nextTarget);
    setCameraReady(false);
    setCameraMessage("");

    if (!hasCameraApi()) {
      setPhase(nextPhase);
      setCameraMessage(getCameraUnavailableMessage());
      return;
    }

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints());
      streamRef.current = stream;
      setPhase(nextPhase);
    } catch {
      setPhase(nextPhase);
      setCameraReady(false);
      setCameraMessage("카메라 권한을 허용해야 실시간 촬영을 진행할 수 있습니다.");
    }
  }

  async function startCamera() {
    if (!hasCameraApi()) {
      setCameraReady(false);
      setCameraMessage(getCameraUnavailableMessage());
      return;
    }

    try {
      stopCamera();
      setCameraMessage("");
      const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints());

      streamRef.current = stream;
      await attachCameraStream(stream);
    } catch {
      setCameraReady(false);
      setCameraMessage("카메라 권한을 허용해야 실시간 촬영을 진행할 수 있습니다.");
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

  function saveCapture(dataUrl: string, generatedFileName: string) {
    if (target === "exterior") {
      if (exteriorPreviewUrl) URL.revokeObjectURL(exteriorPreviewUrl);
      setExteriorPreviewUrl(dataUrl);
      setCapturedImageData(dataUrl);
      setExteriorPhotoFileName(generatedFileName);
      onFileChange(generatedFileName);
      setTarget("label");
      setPhase("recognizing");
      stopCamera();
      return;
    }

    if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
    setLabelPreviewUrl(dataUrl);
    setStickerImageData(dataUrl);
    setLabelPhotoFileName(generatedFileName);
    setPhase("sticker-recognizing");
    stopCamera();
  }

  function handleCapture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraMessage("카메라 화면이 준비되면 다시 촬영해 주세요.");
      return;
    }

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) {
      setCameraMessage("촬영 이미지를 생성하지 못했습니다.");
      return;
    }

    const frame = frameRef.current;
    if (frame) {
      // 녹색 가이드 박스 영역만 크롭
      const videoRect = video.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();

      // CSS 픽셀 → 실제 비디오 픽셀 변환 비율
      const scaleX = video.videoWidth / videoRect.width;
      const scaleY = video.videoHeight / videoRect.height;

      const sx = Math.max(0, (frameRect.left - videoRect.left) * scaleX);
      const sy = Math.max(0, (frameRect.top - videoRect.top) * scaleY);
      const sw = Math.min(frameRect.width * scaleX, video.videoWidth - sx);
      const sh = Math.min(frameRect.height * scaleY, video.videoHeight - sy);

      canvas.width = Math.round(sw);
      canvas.height = Math.round(sh);
      context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    } else {
      // 가이드 박스 없는 경우(스티커 촬영 등) 전체 프레임
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    saveCapture(
      canvas.toDataURL("image/jpeg", 0.92),
      `swapit-${target}-${applianceId}-${Date.now()}.jpg`,
    );
  }

  function handleStickerCapture() {
    handleCapture();
  }

  function createDemoCapture() {
    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 960;
    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.fillStyle = "#191d26";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#a50034";
    context.fillRect(48, 48, canvas.width - 96, canvas.height - 96);
    context.fillStyle = "#ffffff";
    context.font = "bold 44px sans-serif";
    context.fillText(applianceLabel, 68, 150);
    context.font = "bold 34px sans-serif";
    context.fillText(targetDescriptions[target].demoLabel, 68, 210);
    context.font = "28px sans-serif";
    context.fillText(new Date().toLocaleString("ko-KR"), 68, 280);

    saveCapture(
      canvas.toDataURL("image/jpeg", 0.9),
      `swapit-${target}-demo-${Date.now()}.jpg`,
    );
  }

  function resetAllCaptures() {
    if (exteriorPreviewUrl) URL.revokeObjectURL(exteriorPreviewUrl);
    if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
    setExteriorPreviewUrl("");
    setLabelPreviewUrl("");
    setCapturedImageData("");
    setStickerImageData("");
    setExteriorPhotoFileName("");
    setLabelPhotoFileName("");
    onFileChange("");
    void openCamera("exterior", "camera");
  }

  if (loading) {
    return <AnalyzingView applianceLabel={applianceLabel} />;
  }

  if (phase === "consent") {
    return (
      <ConsentView
        creditPolicyAgreed={creditPolicyAgreed}
        truthfulnessAgreed={truthfulnessAgreed}
        onCancel={onCancel}
        onContinue={() => void openCamera("exterior", "camera")}
        setCreditPolicyAgreed={setCreditPolicyAgreed}
        setTruthfulnessAgreed={setTruthfulnessAgreed}
      />
    );
  }

  if (phase === "recognizing") {
    return <RecognizingView applianceLabel={applianceLabel} />;
  }

  if (phase === "review") {
    return (
      <ReviewView
        applianceLabel={applianceLabel}
        exteriorPhotoFileName={exteriorPhotoFileName}
        labelPhotoFileName={labelPhotoFileName}
        exteriorPreviewUrl={exteriorPreviewUrl}
        labelPreviewUrl={labelPreviewUrl}
        recognizedInfo={recognizedInfo}
        onChange={setRecognizedInfo}
        onRetake={resetAllCaptures}
        onAnalyze={() =>
          onAnalyze({
            exteriorPhotoFileName,
            labelPhotoFileName,
            agreedToCreditPolicy: creditPolicyAgreed && truthfulnessAgreed,
            applianceType: applianceId,
            brand: recognizedInfo.brand,
            modelName: recognizedInfo.modelName,
            estimatedAge: recognizedInfo.estimatedAge,
            exteriorCondition: recognizedInfo.exteriorCondition,
          })
        }
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
          {!cameraReady && <CameraFallback target="label" />}
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
          <div
            ref={frameRef}
            className="rounded-2xl border-2 border-dashed border-white/65"
            style={getGuideFrameStyle(applianceId, "label")}
          />
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
        <video ref={videoRef} className={`h-full w-full object-cover ${cameraReady ? "opacity-100" : "opacity-0"}`} muted playsInline />
        {!cameraReady ? <CameraFallback target={target} /> : null}
        <div className="pointer-events-none absolute inset-0 bg-black/12" />
      </div>

      <div className="relative z-20 flex items-center justify-between px-6 pt-5">
        <button className="text-sm font-semibold text-white" onClick={onCancel} type="button">
          취소
        </button>
        <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-black text-white/90">
          {target === "exterior" ? "1/2 외관 사진" : "2/2 뒷 라벨"}
        </span>
      </div>

      <div className="absolute inset-x-0 z-10 flex flex-col items-center justify-center gap-3" style={{ top: 60, bottom: 120 }}>
        <div
          ref={frameRef}
          className="rounded-[20px] border-2 border-[#35ff77]"
          style={getGuideFrameStyle(applianceId, target)}
        />
        <p className="rounded-full bg-black/55 px-4 py-2 text-center text-[11px] font-black text-white/90">
          {targetDescriptions[target].title}
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
          onClick={() => void startCamera()}
          type="button"
        >
          <RotateCcw size={20} />
        </button>
        <button
          className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white bg-white/15 p-1 shadow-xl shadow-black/35"
          onClick={handleCapture}
          type="button"
        >
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-lgred">
            <Camera size={30} />
          </span>
        </button>
        <button
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-[10px] font-black text-white"
          onClick={createDemoCapture}
          type="button"
        >
          DEMO
        </button>
      </div>
    </section>
  );
}

function ConsentView({
  creditPolicyAgreed,
  truthfulnessAgreed,
  onCancel,
  onContinue,
  setCreditPolicyAgreed,
  setTruthfulnessAgreed,
}: {
  creditPolicyAgreed: boolean;
  truthfulnessAgreed: boolean;
  onCancel: () => void;
  onContinue: () => void;
  setCreditPolicyAgreed: (value: boolean) => void;
  setTruthfulnessAgreed: (value: boolean) => void;
}) {
  const ready = creditPolicyAgreed && truthfulnessAgreed;

  return (
    <section className="flex h-full min-h-0 flex-col bg-cloud">
      <div className="phone-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-4 pt-16">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black text-lgred">STEP 1. 촬영 전 확인</p>
            <h2 className="mt-2 text-[24px] font-black leading-tight text-ink">
              진행하기 전에 확인해 주세요
            </h2>
          </div>
          <button className="shrink-0 rounded-full px-2 py-1 text-sm font-black text-slate-400" onClick={onCancel} type="button">
            닫기
          </button>
        </div>

        <div className="mt-5 rounded-[20px] bg-white p-2 shadow-sm">
          <div className="flex items-start gap-3 rounded-[16px] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-lgred/10 text-lgred">
              <AlertTriangle size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-ink">보상 안내 및 동의</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                사진을 바탕으로 AI가 첫 견적을 계산해요. 수거 현장이나 자원 허브에서 확인한 실제 기기 상태에 따라 보상 크레딧이 조정될 수 있습니다.
              </p>
            </div>
          </div>
          <ConsentRow
            checked={creditPolicyAgreed}
            title="[필수] 크레딧 산정 및 안내 기준에 동의합니다."
            description=""
            onToggle={() => setCreditPolicyAgreed(!creditPolicyAgreed)}
          />
        </div>

        <div className="mt-3 rounded-[20px] bg-white p-2 shadow-sm">
          <div className="flex items-start gap-3 rounded-[16px] p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-slate-100 text-slate-500">
              <ShieldCheck size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-ink">주의사항 및 동의</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
                소중한 가전의 모습을 있는 그대로 정직하게 담아주세요. 허위 정보나 고의적인 훼손이 확인될 경우 서비스 이용이 제한될 수 있습니다.
              </p>
            </div>
          </div>
          <ConsentRow
            checked={truthfulnessAgreed}
            title="[필수] 실제 가전 상태와 다름없음을 확인합니다."
            description=""
            onToggle={() => setTruthfulnessAgreed(!truthfulnessAgreed)}
          />
        </div>

        <div className="mt-3 rounded-[20px] bg-white p-2 shadow-sm">
          <div className="flex items-start gap-3 rounded-[16px] p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-lgred/10 text-lgred">
            <ShieldCheck size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-ink">촬영 가이드</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              가전의 전체 외관과 뒷면 라벨 스티커를 순서대로 촬영해 주세요. AI가 숨겨진 가치를 바로 분석해 드릴게요!
            </p>
          </div>
        </div>
      </div>
      </div>

      <div className="shrink-0 bg-cloud px-5 pb-5 pt-2">
      <button
        className="h-14 w-full rounded-[16px] bg-lgred text-sm font-black text-white shadow-sm disabled:bg-slate-300 disabled:text-white"
        disabled={!ready}
        onClick={onContinue}
        type="button"
      >
        촬영 시작하기
      </button>
      </div>
    </section>
  );
}

function ConsentRow({
  checked,
  title,
  description,
  onToggle,
}: {
  checked: boolean;
  title: string;
  description: string;
  onToggle: () => void;
}) {
  return (
    <button
      className={`flex w-full items-start gap-3 rounded-[16px] p-3 text-left transition ${
        checked ? "bg-lgred/5" : "bg-white"
      }`}
      onClick={onToggle}
      type="button"
    >
      <span
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          checked ? "bg-lgred text-white" : "bg-slate-100 text-slate-300"
        }`}
      >
        <CheckCircle2 size={14} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-black text-ink">{title}</span>
        {description ? (
          <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span>
        ) : null}
      </span>
    </button>
  );
}

function CameraFallback({ target }: { target: CaptureTarget }) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#252a31]">
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/25 to-transparent" />
      <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-white/70">
        {targetDescriptions[target].demoLabel}
      </div>
    </div>
  );
}

function RecognizingView({ applianceLabel }: { applianceLabel: string }) {
  const steps = ["외관 특징 분석", "브랜드/모델명 추정", "예상 연식 및 상태 분류"];

  return (
    <section className="flex min-h-full flex-col overflow-hidden bg-[#111318] text-white">
      <div className="flex items-start justify-between gap-4 px-5 pt-16">
        <div>
          <p className="text-xs font-black text-white/55">STEP 1-2</p>
          <h2 className="mt-1 text-xl font-black">VLM + OpenAI 분석 중</h2>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
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

function ReviewView({
  applianceLabel,
  exteriorPhotoFileName,
  labelPhotoFileName,
  exteriorPreviewUrl,
  labelPreviewUrl,
  recognizedInfo,
  onChange,
  onRetake,
  onAnalyze,
}: {
  applianceLabel: string;
  exteriorPhotoFileName: string;
  labelPhotoFileName: string;
  exteriorPreviewUrl: string;
  labelPreviewUrl: string;
  recognizedInfo: RecognizedAppliance;
  onChange: (value: RecognizedAppliance) => void;
  onRetake: () => void;
  onAnalyze: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const previewUrl = exteriorPreviewUrl || labelPreviewUrl;
  const fileName = exteriorPhotoFileName || labelPhotoFileName;
  const credit = calculateFinalCredit(
    recognizedInfo.applianceType,
    recognizedInfo.size,
    DUMMY_NEW_PRODUCT.price,
    DUMMY_SWAP_COUNT,
    recognizedInfo.modelName || undefined,
    recognizedInfo.weightKg,
  );
  const ready = Boolean(exteriorPhotoFileName && labelPhotoFileName);

  return (
    <section className="phone-scroll flex h-full min-h-0 flex-col overflow-y-auto bg-white px-5 pb-0 pt-16 shadow-sm">
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

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black text-lgred">STEP 1-3</p>
          <h2 className="mt-1 text-xl font-black text-ink">AI 인식 결과 확인</h2>
        </div>
        <span className="shrink-0 rounded-full bg-lgred/10 px-3 py-1 text-xs font-bold text-lgred">
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
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-black text-ink">정보 확인 후 감정 진행</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              AI가 분석한 결과예요. 틀린 내용은 직접 수정할 수 있어요.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <InfoInput label="가전 종류" value={recognizedInfo.applianceType} onChange={(value) => onChange({ ...recognizedInfo, applianceType: value })} />
        <InfoInput label="브랜드" value={recognizedInfo.brand} onChange={(value) => onChange({ ...recognizedInfo, brand: value })} />
        <InfoInput label="모델명" value={recognizedInfo.modelName} onChange={(value) => onChange({ ...recognizedInfo, modelName: value })} />
        <InfoInput label="예상 연식" value={recognizedInfo.estimatedAge} onChange={(value) => onChange({ ...recognizedInfo, estimatedAge: value })} />
        <InfoInput label="외관 상태" value={recognizedInfo.exteriorCondition} onChange={(value) => onChange({ ...recognizedInfo, exteriorCondition: value })} />
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
          className="h-12 rounded-xl bg-lgred px-2 text-[13px] font-black text-white disabled:bg-slate-300"
          disabled={!ready}
          onClick={onAnalyze}
          type="button"
        >
          정보 확인 후 감정하기
        </button>
      </div>
    </section>
  );
}

function PhotoCard({
  title,
  fileName,
  previewUrl,
}: {
  title: string;
  fileName: string;
  previewUrl: string;
}) {
  return (
    <div className="overflow-hidden rounded-3xl bg-[#111318] shadow-sm">
      {previewUrl ? (
        <img alt={title} className="h-36 w-full object-cover" src={previewUrl} />
      ) : (
        <div className="flex h-36 items-center justify-center text-white/70">
          <Camera size={28} />
        </div>
      )}
      <div className="bg-white px-3 py-3">
        <p className="text-xs font-black text-slate-500">{title}</p>
        <p className="mt-1 truncate text-xs font-semibold text-ink">{fileName || "미촬영"}</p>
      </div>
    </div>
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

function AnalyzingView({ applianceLabel }: { applianceLabel: string }) {
  return (
    <section className="flex min-h-full flex-col overflow-hidden bg-[#111318] text-white shadow-sm">
      <div className="flex items-start justify-between gap-4 px-5 pt-16">
        <div>
          <p className="text-xs font-black text-white/55">STEP 2</p>
          <h2 className="mt-1 text-xl font-black">감정 중</h2>
        </div>
        <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">
          {applianceLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-6">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute h-16 w-16 rounded-full bg-lgred/35 animate-scanPulse" />
          <span className="absolute h-16 w-16 rounded-full bg-lgred/35 animate-scanPulse [animation-delay:0.67s]" />
          <span className="absolute h-16 w-16 rounded-full bg-lgred/35 animate-scanPulse [animation-delay:1.33s]" />
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-lgred">
            <Loader2 className="animate-spin" size={26} />
          </span>
        </div>
        <div className="text-center">
          <p className="text-lg font-black">원자재 스크랩 가치와 재사용 가능 부품을 분석 중입니다</p>
          <p className="mt-2 text-sm font-semibold text-white/60">
            촬영 사진, 라벨 정보, 외관 상태를 바탕으로 예상 보상가를 계산합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
