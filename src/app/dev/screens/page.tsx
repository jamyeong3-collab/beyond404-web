"use client";

/**
 * 스크린샷 전용 페이지 — Figma 공유용
 * 모든 화면 상태를 정적 mock 데이터로 렌더링
 * /dev/screens 에서 접근
 */

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ScanLine,
  ShieldCheck,
} from "lucide-react";

const MOCK = {
  applianceLabel: "냉장고",
  brand: "LG",
  modelName: "GN-B813SQCL",
  estimatedAge: "3-5년",
  exteriorCondition: "생활 스크래치 경미",
  confidence: 84,
  scrap: 37800,
  bonus: 80000,
  total: 117800,
};

const SCREENS = [
  "01_consent",
  "02_camera_exterior",
  "03_recognizing",
  "04_camera_label",
  "05_label_recognizing",
  "06_review",
  "07_analyzing",
];

function PhoneFrame({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-bold text-slate-500">{id}</p>
      <div
        data-screen={id}
        className="relative overflow-hidden rounded-[40px] shadow-2xl"
        style={{ width: 390, height: 844, flexShrink: 0 }}
      >
        <div className="h-full w-full overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

/* ── 01. 동의 화면 ─────────────────────────────────────────── */
function ConsentScreen() {
  return (
    <section className="flex h-full flex-col bg-white p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#a50034]">STEP 1. 촬영 전 동의</p>
          <h2 className="mt-1 text-2xl font-bold text-[#111318]">촬영과 크레딧 산정 동의</h2>
        </div>
        <button className="text-sm font-bold text-slate-500" type="button">닫기</button>
      </div>

      <div className="mt-4 rounded-3xl border border-[#ffd9d9] bg-[#fff7f7] p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffe8e8] text-[#cb2431]">
            <AlertTriangle size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#111318]">사전 고지</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
              고의적인 손상, 허위 촬영, 허위 기기 정보가 수거 또는 허브 최종 확인 단계에서 발견되면 크레딧 회수 또는 법적 불이익이 발생할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {[
          { checked: true, title: "크레딧 산정 및 회수 정책에 동의합니다", desc: "최종 감정 결과가 촬영 정보와 다르면 보상 크레딧이 조정될 수 있습니다." },
          { checked: false, title: "고의 훼손/허위 촬영이 아님을 확인합니다", desc: "허위 신청이 확인될 경우 추후 서비스 이용 제한이 발생할 수 있습니다." },
        ].map((item) => (
          <div
            key={item.title}
            className={`flex w-full items-start gap-3 rounded-3xl border p-4 ${item.checked ? "border-[#a50034] bg-[#a50034]/5" : "border-slate-200 bg-white"}`}
          >
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.checked ? "bg-[#a50034] text-white" : "bg-slate-100 text-slate-400"}`}>
              <CheckCircle2 size={14} />
            </span>
            <span>
              <span className="block text-sm font-bold text-[#111318]">{item.title}</span>
              <span className="mt-1 block text-xs font-semibold leading-5 text-slate-500">{item.desc}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#a50034]/10 text-[#a50034]">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#111318]">다음 단계</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              외관 전체 사진과 뒷 라벨 사진을 순서대로 촬영한 뒤, VLM 인식 결과를 확인하고 감정을 진행합니다.
            </p>
          </div>
        </div>
      </div>

      <button className="mt-auto h-12 rounded-2xl bg-slate-300 text-sm font-bold text-white" type="button" disabled>
        동의 후 촬영 시작
      </button>
    </section>
  );
}

/* ── 02. 카메라 (외관) ─────────────────────────────────────── */
function CameraExteriorScreen() {
  return (
    <section className="relative h-full overflow-hidden bg-[#111318] text-white">
      <div className="absolute inset-0 bg-[#252a31]">
        <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/40">외관 촬영</div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black/12" />

      <div className="relative z-20 flex items-center justify-between px-6 pt-5">
        <button className="text-sm font-semibold text-white" type="button">취소</button>
        <span className="rounded-full bg-black/35 px-3 py-1 text-xs font-semibold text-white/90">1/2 외관 사진</span>
      </div>

      <div className="relative z-10 flex h-[calc(100%-150px)] items-center justify-center px-6">
        <div className="w-full max-w-[310px] rounded-[28px] border-2 border-[#35ff77] px-5 py-6">
          <div className="rounded-2xl bg-black/45 px-4 py-3 text-center">
            <ScanLine className="mx-auto text-white" size={24} />
            <p className="mt-2 text-sm font-bold">가전 외관 전체가 보이도록 촬영해 주세요</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-white/70">정면 또는 사선에서 주요 파손 여부가 보이는 각도로 맞춰주세요.</p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-9">
        <button className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white" type="button">
          <RotateCcw size={20} />
        </button>
        <button className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white bg-white/15 p-1 shadow-xl shadow-black/35" type="button">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[#a50034]">
            <Camera size={30} />
          </span>
        </button>
        <button className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-[10px] font-semibold text-white" type="button">
          DEMO
        </button>
      </div>
    </section>
  );
}

/* ── 03. AI 인식 중 ────────────────────────────────────────── */
function RecognizingScreen() {
  const steps = ["외관 특징 분석", "브랜드/모델명 추정", "예상 연식 및 상태 분류"];
  return (
    <section className="flex min-h-full flex-col overflow-hidden bg-[#111318] text-white">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-xs font-semibold text-white/55">STEP 1-2</p>
          <h2 className="mt-1 text-xl font-bold">VLM + OpenAI 분석 중</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">{MOCK.applianceLabel}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-7 px-5 pb-8">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute h-16 w-16 rounded-full bg-[#a50034]/35" />
          <span className="absolute h-16 w-16 rounded-full bg-[#a50034]/20" />
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-[#a50034]">
            <ScanLine size={28} />
          </span>
        </div>
        <ul className="w-full space-y-3">
          {steps.map((label) => (
            <li key={label} className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3">
              <CheckCircle2 size={18} className="shrink-0 text-[#a50034]" />
              <span className="text-sm font-semibold">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ── 04. 라벨 카메라 ───────────────────────────────────────── */
function CameraLabelScreen() {
  return (
    <section className="relative h-full overflow-hidden bg-[#111318] text-white">
      <div className="absolute inset-0 bg-[#252a31]">
        <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
        <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/40">뒷 라벨 촬영</div>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-black/15" />

      <div className="relative z-20 flex items-center justify-between px-6 pt-5">
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white/85">2 / 2</span>
        <button className="text-sm font-semibold text-white/70" type="button">건너뛰기</button>
      </div>

      <div className="relative z-10 flex h-[calc(100%-150px)] flex-col items-center justify-center gap-4 px-6">
        <p className="text-center text-base font-bold text-white">모델 라벨 스티커를 찍어주세요</p>
        <p className="rounded-full bg-black/55 px-4 py-2 text-[11px] font-semibold text-white/90">글씨가 잘 보이도록 가까이 대주세요</p>
        <div className="h-[150px] w-[310px] rounded-2xl border-2 border-dashed border-white/65" />
        <p className="text-center text-[11px] font-semibold leading-5 text-white/55">후면·측면·제품 내부 어디든 라벨이 있는 곳을 찍어주세요</p>
      </div>

      <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-9">
        <button className="flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white" type="button">
          <RotateCcw size={21} />
        </button>
        <button className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-4 border-white bg-white/15 p-1 shadow-xl shadow-black/35" type="button">
          <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[#a50034]">
            <Camera size={31} />
          </span>
        </button>
        <div className="h-11 w-11" />
      </div>
    </section>
  );
}

/* ── 05. 라벨 인식 중 ──────────────────────────────────────── */
function LabelRecognizingScreen() {
  return (
    <section className="flex min-h-full flex-col items-center justify-center overflow-hidden bg-[#111318] text-white gap-6 px-8">
      <div className="relative flex h-28 w-28 items-center justify-center">
        <span className="absolute h-14 w-14 rounded-full bg-[#a50034]/35" />
        <span className="absolute h-14 w-14 rounded-full bg-[#a50034]/20" />
        <span className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-[#a50034]">
          <ScanLine size={24} />
        </span>
      </div>
      <div className="text-center">
        <p className="text-xl font-bold">라벨 분석 중</p>
        <p className="mt-2 text-sm font-semibold text-white/60">모델명과 스펙 정보를 읽어오고 있어요</p>
      </div>
    </section>
  );
}

/* ── 06. 리뷰 화면 ─────────────────────────────────────────── */
function ReviewScreen() {
  return (
    <section className="flex h-full flex-col overflow-y-auto bg-white p-5 pb-0">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#a50034]">STEP 1-3</p>
          <h2 className="mt-1 text-xl font-bold text-[#111318]">AI 인식 결과 확인</h2>
        </div>
        <span className="rounded-full bg-[#a50034]/10 px-3 py-1 text-xs font-bold text-[#a50034]">{MOCK.applianceLabel}</span>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm font-bold text-[#111318]">방금 촬영한 사진</p>
        <span className="text-[11px] font-bold text-slate-500">탭하면 전체보기</span>
      </div>
      <div className="mt-2 flex h-44 w-full items-center justify-center overflow-hidden rounded-3xl bg-[#111318]">
        <Camera size={34} className="text-white/40" />
      </div>

      <div className="mt-4 rounded-3xl bg-[#a50034]/5 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#a50034] text-white">
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#111318]">정보 확인 후 감정 진행</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">AI가 분석한 결과예요. 틀린 내용은 직접 수정할 수 있어요.</p>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {[
          ["가전 종류", MOCK.applianceLabel],
          ["브랜드", MOCK.brand],
          ["모델명", MOCK.modelName],
          ["예상 연식", MOCK.estimatedAge],
          ["외관 상태", MOCK.exteriorCondition],
        ].map(([label, value]) => (
          <div key={label}>
            <span className="text-xs font-semibold text-slate-500">{label}</span>
            <div className="mt-1 flex h-11 w-full items-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-[#111318]">
              {value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">인식 신뢰도</span>
          <strong className="text-sm font-bold text-[#a50034]">{MOCK.confidence}%</strong>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <span className="block h-full rounded-full bg-[#a50034]" style={{ width: `${MOCK.confidence}%` }} />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-3xl bg-[#a50034]">
        <div className="flex items-center justify-between px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold text-white/65">예상 최종 크레딧</p>
            <p className="mt-0.5 text-3xl font-bold text-white">
              {MOCK.total.toLocaleString("ko-KR")}
              <span className="ml-1 text-lg font-bold text-white/80">원</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-white/60">중형 {MOCK.applianceLabel}</p>
            <p className="mt-1 text-[10px] font-semibold text-white/45">1회 이용 · standard</p>
          </div>
        </div>
        <div className="space-y-1.5 bg-black/15 px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/60">스크랩 가치</span>
            <span className="text-[11px] font-semibold text-white/80">+{MOCK.scrap.toLocaleString()}원</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/60">신제품 연계 (8%)</span>
            <span className="text-[11px] font-semibold text-white/80">+{MOCK.bonus.toLocaleString()}원</span>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-5 mt-5 grid grid-cols-2 gap-2 bg-white/95 px-5 pb-5 pt-3">
        <button className="h-12 rounded-xl border border-[#a50034]/20 bg-white text-sm font-bold text-[#a50034]" type="button">다시 촬영</button>
        <button className="h-12 rounded-xl bg-[#a50034] px-2 text-[13px] font-bold text-white" type="button">정보 확인 후 감정하기</button>
      </div>
    </section>
  );
}

/* ── 07. 감정 중 ───────────────────────────────────────────── */
function AnalyzingScreen() {
  return (
    <section className="flex min-h-full flex-col overflow-hidden bg-[#111318] text-white">
      <div className="flex items-center justify-between px-5 pt-5">
        <div>
          <p className="text-xs font-semibold text-white/55">STEP 2</p>
          <h2 className="mt-1 text-xl font-bold">감정 중</h2>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">{MOCK.applianceLabel}</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 pb-6">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <span className="absolute h-16 w-16 rounded-full bg-[#a50034]/35" />
          <span className="absolute h-16 w-16 rounded-full bg-[#a50034]/20" />
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-[#a50034]">
            <Loader2 size={26} />
          </span>
        </div>
        <div className="text-center px-6">
          <p className="text-lg font-bold">원자재 스크랩 가치와 재사용 가능 부품을 분석 중입니다</p>
          <p className="mt-2 text-sm font-semibold text-white/60">촬영 사진, 라벨 정보, 외관 상태를 바탕으로 예상 보상가를 계산합니다.</p>
        </div>
      </div>
    </section>
  );
}

/* ── 메인 페이지 ───────────────────────────────────────────── */
export default function ScreensPage() {
  return (
    <div className="min-h-screen bg-slate-100 p-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-800">SwapIt — 전체 화면 플로우</h1>
      <p className="mb-10 text-sm text-slate-500">Figma 전달용 스크린샷 페이지 · 390×844 (iPhone 14)</p>
      <div className="flex flex-wrap gap-10">
        <PhoneFrame id="01_동의화면"><ConsentScreen /></PhoneFrame>
        <PhoneFrame id="02_카메라_외관"><CameraExteriorScreen /></PhoneFrame>
        <PhoneFrame id="03_AI인식중"><RecognizingScreen /></PhoneFrame>
        <PhoneFrame id="04_카메라_라벨"><CameraLabelScreen /></PhoneFrame>
        <PhoneFrame id="05_라벨인식중"><LabelRecognizingScreen /></PhoneFrame>
        <PhoneFrame id="06_리뷰화면"><ReviewScreen /></PhoneFrame>
        <PhoneFrame id="07_감정중"><AnalyzingScreen /></PhoneFrame>
      </div>
    </div>
  );
}
