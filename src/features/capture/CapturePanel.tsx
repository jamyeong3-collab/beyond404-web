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
type CapturePhase = "camera" | "recognizing" | "review";

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
  estimatedAge: string;
  conditionGrade: string;
  confidence: number;
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
    estimatedAge: "5년 이상",
    conditionGrade: "양호",
    confidence: 82,
  },
  refrigerator: {
    applianceType: "냉장고",
    brand: "LG",
    modelName: "GL-T422VPZX",
    estimatedAge: "4년 이상",
    conditionGrade: "보통",
    confidence: 79,
  },
  air_conditioner: {
    applianceType: "에어컨",
    brand: "LG",
    modelName: "US-Q19BNZE3",
    estimatedAge: "3년 이상",
    conditionGrade: "양호",
    confidence: 84,
  },
  microwave: {
    applianceType: "전자레인지",
    brand: "LG",
    modelName: "MS2043DB",
    estimatedAge: "5년 이상",
    conditionGrade: "보통",
    confidence: 76,
  },
  tv: {
    applianceType: "TV",
    brand: "LG",
    modelName: "OLED55A3",
    estimatedAge: "3년 이상",
    conditionGrade: "양호",
    confidence: 81,
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
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<CapturePhase>(fileName ? "review" : "camera");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
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

  useEffect(() => {
    if (loading || phase !== "camera") {
      stopCamera();
      return undefined;
    }

    startCamera();

    return () => stopCamera();
  }, [loading, phase]);

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
      width: { ideal: 1280 },
      height: { ideal: 1920 },
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
    const generatedFileName = `swapit-${applianceId}-${Date.now()}.jpg`;

    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraMessage("카메라 화면이 준비되면 촬영해주세요.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");

    if (!context) {
      setCameraMessage("촬영 이미지를 만들 수 없습니다. 다시 시도해주세요.");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const capturedImageUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreviewUrl(capturedImageUrl);
    onFileChange(generatedFileName);
    stopCamera();
    setPhase("recognizing");
    window.setTimeout(() => setPhase("review"), 900);
  }

  function createDemoCapture(generatedFileName: string) {
    setPreviewUrl("");
    onFileChange(generatedFileName);
    stopCamera();
    setPhase("recognizing");
    window.setTimeout(() => setPhase("review"), 900);
  }

  function handleRetake() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return "";
    });
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
        onAnalyze={() =>
          onAnalyze({
            exteriorPhotoFileName: fileName,
            labelPhotoFileName: fileName ? `label-${fileName}` : "label-demo-capture.jpg",
            agreedToCreditPolicy: true,
            applianceType: applianceId,
            brand: recognizedInfo.brand,
            modelName: recognizedInfo.modelName,
            estimatedAge: recognizedInfo.estimatedAge,
            exteriorCondition: recognizedInfo.conditionGrade,
          })
        }
        onRetake={handleRetake}
      />
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
        <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-black text-white/85">
          {applianceLabel}
        </span>
      </div>

      <div className="relative z-10 flex h-[calc(100%-150px)] items-center justify-center px-3">
        <div className={`relative border-2 border-[#22ff36] ${frame.className}`}>
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
          <h2 className="mt-1 text-xl font-black">Mock VLM 인식 중</h2>
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
            실제 VLM 연결 전이라 데모용 인식 결과를 생성합니다.
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
  return (
    <section className="phone-scroll flex h-full min-h-0 flex-col overflow-y-auto bg-white p-5 pb-0 shadow-sm">
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
        <span className="text-[11px] font-bold text-slate-400">촬영 결과</span>
      </div>

      <div
        className="mt-2 block w-full overflow-hidden rounded-3xl bg-[#111318] shadow-sm"
        style={{ display: "block", minHeight: 224 }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="촬영한 가전"
            className="block h-56 w-full object-cover [filter:none]"
            style={{ display: "block", height: 224, width: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            className="flex h-56 flex-col items-center justify-center text-white/70"
            style={{ height: 224 }}
          >
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
              실제 VLM 연결 전에는 임시 결과가 표시됩니다. 틀린 내용은 직접 수정할 수 있어요.
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
