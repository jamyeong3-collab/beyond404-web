"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type ApplianceId = "washing_machine" | "refrigerator" | "air_conditioner" | "microwave" | "tv";
type CapturePhase = "consent" | "camera" | "recognizing" | "review";
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
  capacity: string;
  size: string; // 소형 | 중형 | 대형
  estimatedAge: string;
  exteriorCondition: string;
  confidence: number;
  weightKg: number | null; // API 또는 DB에서 얻은 실제 무게
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
  const [recognizedInfo, setRecognizedInfo] = useState<RecognizedAppliance>(
    recognitionByAppliance[applianceId],
  );

  const canUseCamera = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(navigator.mediaDevices?.getUserMedia);
  }, []);

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

    void startCamera();
    return () => stopCamera();
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

  async function startCamera() {
    if (!canUseCamera) {
      setCameraReady(false);
      setCameraMessage("이 브라우저에서는 실시간 카메라 대신 데모 촬영으로 진행해 주세요.");
      return;
    }

    try {
      stopCamera();
      setCameraMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 1920 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraReady(true);
    } catch {
      setCameraReady(false);
      setCameraMessage("카메라 권한 또는 HTTPS 환경이 없어 데모 촬영으로 전환할 수 있습니다.");
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
      setExteriorPhotoFileName(generatedFileName);
      onFileChange(generatedFileName);
      setTarget("label");
      setPhase("camera");
      return;
    }

    if (labelPreviewUrl) URL.revokeObjectURL(labelPreviewUrl);
    setLabelPreviewUrl(dataUrl);
    setLabelPhotoFileName(generatedFileName);
    setPhase("recognizing");
    stopCamera();
    window.setTimeout(() => setPhase("review"), 1000);
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

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    saveCapture(
      canvas.toDataURL("image/jpeg", 0.92),
      `swapit-${target}-${applianceId}-${Date.now()}.jpg`,
    );
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
    setExteriorPhotoFileName("");
    setLabelPhotoFileName("");
    onFileChange("");
    setTarget("exterior");
    setPhase("camera");
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
        onContinue={() => setPhase("camera")}
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

      <div className="relative z-10 flex h-[calc(100%-150px)] items-center justify-center px-6">
        <div className="w-full max-w-[310px] rounded-[28px] border-2 border-[#35ff77] px-5 py-6">
          <div className="rounded-2xl bg-black/45 px-4 py-3 text-center">
            <ScanLine className="mx-auto text-white" size={24} />
            <p className="mt-2 text-sm font-black">{targetDescriptions[target].title}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/70">
              {targetDescriptions[target].description}
            </p>
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
    <section className="flex h-full flex-col bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black text-lgred">STEP 1. 촬영 전 동의</p>
          <h2 className="mt-1 text-2xl font-black text-ink">촬영과 크레딧 산정 동의</h2>
        </div>
        <button className="text-sm font-black text-slate-400" onClick={onCancel} type="button">
          닫기
        </button>
      </div>

      <div className="mt-4 rounded-3xl border border-[#ffd9d9] bg-[#fff7f7] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffe8e8] text-[#cb2431]">
            <AlertTriangle size={18} />
          </span>
          <div>
            <p className="text-sm font-black text-ink">사전 고지</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
              고의적인 손상, 허위 촬영, 허위 기기 정보가 수거 또는 허브 최종 확인 단계에서 발견되면 크레딧 회수 또는 법적 불이익이 발생할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <ConsentRow
          checked={creditPolicyAgreed}
          title="크레딧 산정 및 회수 정책에 동의합니다"
          description="최종 감정 결과가 촬영 정보와 다르면 보상 크레딧이 조정될 수 있습니다."
          onToggle={() => setCreditPolicyAgreed(!creditPolicyAgreed)}
        />
        <ConsentRow
          checked={truthfulnessAgreed}
          title="고의 훼손/허위 촬영이 아님을 확인합니다"
          description="허위 신청이 확인될 경우 추후 서비스 이용 제한이 발생할 수 있습니다."
          onToggle={() => setTruthfulnessAgreed(!truthfulnessAgreed)}
        />
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lgred/10 text-lgred">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-black text-ink">다음 단계</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              외관 전체 사진과 뒷 라벨 사진을 순서대로 촬영한 뒤, VLM 인식 결과를 확인하고 감정을 진행합니다.
            </p>
          </div>
        </div>
      </div>

      <button
        className="mt-auto h-12 rounded-2xl bg-lgred text-sm font-black text-white disabled:bg-slate-300"
        disabled={!ready}
        onClick={onContinue}
        type="button"
      >
        동의 후 촬영 시작
      </button>
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
      className={`flex w-full items-start gap-3 rounded-3xl border p-4 text-left ${
        checked ? "border-lgred bg-lgred/5" : "border-slate-200 bg-white"
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
      <span>
        <span className="block text-sm font-black text-ink">{title}</span>
        <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{description}</span>
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
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-xs font-black text-white/55">STEP 1-2</p>
          <h2 className="mt-1 text-xl font-black">VLM + OpenAI 분석 중</h2>
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
          <p className="text-xs font-black text-lgred">STEP 1-3</p>
          <h2 className="mt-1 text-xl font-black text-ink">AI 인식 결과 확인</h2>
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
