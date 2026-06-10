import { CalendarCheck, ChevronRight, Clock, CreditCard, MapPin, Truck } from "lucide-react";
import type { ReactNode } from "react";

type ReviewStatus =
  | "none"
  | "reserved"
  | "pickup"
  | "reviewPending"
  | "reviewCompleted"
  | "reReviewPending"
  | "reReviewCompleted";

type OngoingReservationPanelProps = {
  reservationLabel: string;
  reservationAddress: string;
  status: ReviewStatus;
  onChange: () => void;
  onCancel: () => void;
  onOpenTracking: () => void;
  onOpenCredit: () => void;
};

export function OngoingReservationPanel({
  reservationLabel,
  reservationAddress,
  status,
  onChange,
  onCancel,
  onOpenTracking,
  onOpenCredit,
}: OngoingReservationPanelProps) {
  const canOpenCredit =
    status === "reviewPending" ||
    status === "reviewCompleted" ||
    status === "reReviewPending" ||
    status === "reReviewCompleted";

  const trackingDescription =
    status === "reserved"
      ? "예약된 수거 일정 기준으로 크루 배정 후 이동 상태를 확인할 수 있습니다."
      : "배정된 수거 크루의 이동 상태와 수거 진행 상황을 확인할 수 있습니다.";

  const creditDescription = canOpenCredit
    ? "수거 완료 후 최종 감정 결과와 크레딧 보상 단계를 확인할 수 있습니다."
    : "크레딧 보상은 수거 완료 후 STEP 5에서 확인할 수 있습니다.";

  return (
    <section className="flex h-full flex-col rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <CalendarCheck size={18} />
        진행 중인 예약
      </div>

      <div className="mt-5 rounded-3xl border border-lgred/15 bg-lgred/5 p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lgred text-white">
          <CalendarCheck size={30} />
        </div>
        <p className="mt-4 text-xs font-black text-lgred">수거 예약이 완료되었습니다</p>
        <h2 className="mt-2 text-2xl font-black text-ink">{reservationLabel || "예약 시간 확인 중"}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          여기서 예약 정보를 확인하고, STEP 4 수거 진행 확인과 STEP 5 크레딧 보상 단계로 이어서 이동할 수 있습니다.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <InfoRow icon={<Clock size={18} />} title="예약 시간" description={reservationLabel || "예약 정보 없음"} />
        <InfoRow
          icon={<MapPin size={18} />}
          title="수거 위치"
          description={reservationAddress || "입력한 수거 주소를 불러오는 중입니다."}
        />
      </div>

      <div className="mt-4 space-y-3">
        <StageCard
          icon={<Truck size={18} />}
          stepLabel="STEP 4"
          title="크루 이동 확인"
          description={trackingDescription}
          buttonLabel={status === "pickup" ? "이동 중인 크루 확인" : "수거 진행 확인하기"}
          onClick={onOpenTracking}
        />
        <StageCard
          icon={<CreditCard size={18} />}
          stepLabel="STEP 5"
          title="크레딧 보상 확인"
          description={creditDescription}
          buttonLabel={canOpenCredit ? "크레딧 보상 확인하기" : "수거 완료 후 확인 가능"}
          disabled={!canOpenCredit}
          onClick={onOpenCredit}
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <button
          className="h-12 rounded-xl border border-lgred/20 bg-white text-sm font-black text-lgred"
          onClick={onChange}
          type="button"
        >
          예약 변경
        </button>
        <button
          className="h-12 rounded-xl bg-slate-100 text-sm font-black text-slate-500"
          onClick={onCancel}
          type="button"
        >
          예약 취소
        </button>
      </div>
    </section>
  );
}

function StageCard({
  icon,
  stepLabel,
  title,
  description,
  buttonLabel,
  disabled = false,
  onClick,
}: {
  icon: ReactNode;
  stepLabel: string;
  title: string;
  description: string;
  buttonLabel: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lgred/10 text-lgred">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black text-lgred">{stepLabel}</p>
          <p className="mt-1 text-base font-black text-ink">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>

      <button
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-lgred text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        {buttonLabel}
        {!disabled ? <ChevronRight size={16} /> : null}
      </button>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lgred/10 text-lgred">
        {icon}
      </span>
      <div>
        <p className="text-sm font-black text-ink">{title}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">{description}</p>
      </div>
    </div>
  );
}
