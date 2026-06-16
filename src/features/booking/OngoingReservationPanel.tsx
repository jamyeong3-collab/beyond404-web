import { Calendar3DIcon } from "@/components/Calendar3DIcon";
import { Service3DIcon } from "@/components/Service3DIcon";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { BookingPurpose } from "./BookingPanel";

type ReviewStatus =
  | "none"
  | "reserved"
  | "pickup"
  | "reviewPending"
  | "reviewCompleted"
  | "reReviewPending"
  | "reReviewCompleted";

type OngoingReservationPanelProps = {
  bookingPurpose?: BookingPurpose;
  reservationLabel: string;
  reservationAddress: string;
  status: ReviewStatus;
  onChange: () => void;
  onCancel: () => void;
  onOpenTracking: () => void;
  onOpenCredit: () => void;
};

export function OngoingReservationPanel({
  bookingPurpose = "pickup",
  reservationLabel,
  reservationAddress,
  status,
  onChange,
  onCancel,
  onOpenTracking,
}: OngoingReservationPanelProps) {
  const pickupCompleted =
    status === "reviewPending" ||
    status === "reviewCompleted" ||
    status === "reReviewPending" ||
    status === "reReviewCompleted";
  const isInstallation = bookingPurpose === "installation";

  const trackingDescription = pickupCompleted
    ? isInstallation
      ? "설치와 기존 제품 수거가 완료되면 안심처리 상태를 확인할 수 있어요."
      : "수거와 e-waste 공장 전달까지 완료되어 안심처리 상태를 확인할 수 있어요."
    : status === "reserved"
      ? isInstallation
        ? "예약된 설치 일정 기준으로 크루 배정, 이동, 기존 제품 수거 상태를 확인할 수 있어요."
        : "예약된 수거 일정 기준으로 크루 배정 및 이동 상태를 확인할 수 있어요."
      : isInstallation
        ? "배정된 설치 크루의 이동 상태와 설치 및 수거 진행 상황을 확인할 수 있어요."
        : "배정된 수거 크루의 이동 상태와 수거 진행 상황을 확인할 수 있어요.";

  return (
    <section className="flex h-full flex-col rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
        <Calendar3DIcon className="h-6 w-6 shrink-0" />
        {isInstallation ? "진행 중인 설치 예약이에요" : "진행 중인 예약이에요"}
      </div>

      <div className="mt-4 rounded-3xl border border-lgred/15 bg-lgred/5 p-4">
        <p className="text-xs font-bold text-lgred">{isInstallation ? "설치 예약이 접수됐어요" : "예약이 접수됐어요"}</p>
        <p className="mt-1 text-[13px] font-medium leading-5 text-slate-600">
          {isInstallation
            ? "예약 시간과 위치를 확인하고 설치와 기존 제품 수거 진행 상태로 이동할 수 있어요."
            : "예약 시간과 위치를 확인하고 수거 진행 상태로 이동할 수 있어요."}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <InfoRow icon={<Service3DIcon type="clock" className="h-9 w-9" />} title="예약 시간이에요" description={reservationLabel || "예약 정보가 없어요"} />
        <InfoRow
          icon={<Service3DIcon type="location" className="h-9 w-9" />}
          title={isInstallation ? "설치 위치예요" : "수거 위치예요"}
          description={
            reservationAddress || (isInstallation ? "입력한 설치 주소를 불러오고 있어요." : "입력한 수거 주소를 불러오고 있어요.")
          }
        />
      </div>

      <div className="mt-4">
        <StageCard
          icon={<Service3DIcon type="truck" className="h-10 w-10" />}
          stepLabel="STEP 4"
          title={pickupCompleted ? (isInstallation ? "설치와 수거가 완료됐어요" : "수거 및 처리가 완료됐어요") : "크루 이동을 확인해요"}
          description={trackingDescription}
          buttonLabel={
            pickupCompleted
              ? isInstallation
                ? "설치와 수거가 완료됐어요"
                : "수거 및 처리가 완료됐어요"
              : status === "pickup"
                ? "이동 중인 크루를 확인할게요"
                : isInstallation
                  ? "설치와 수거 진행을 확인할게요"
                  : "수거 진행을 확인할게요"
          }
          onClick={onOpenTracking}
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <button
          className="h-12 rounded-xl border border-lgred/20 bg-white text-[13px] font-bold text-lgred"
          onClick={onChange}
          type="button"
        >
          예약을 변경할게요
        </button>
        <button
          className="h-12 rounded-xl bg-slate-100 text-[13px] font-semibold text-slate-500"
          onClick={onCancel}
          type="button"
        >
          예약을 취소할게요
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
        <span className="flex h-11 w-11 shrink-0 items-center justify-center">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-lgred">{stepLabel}</p>
          <p className="mt-1 text-[15px] font-bold leading-5 text-ink">{title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
        </div>
      </div>

      <button
        className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-lgred text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
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
      <span className="flex h-10 w-10 shrink-0 items-center justify-center">
        {icon}
      </span>
      <div>
        <p className="text-[13px] font-bold text-ink">{title}</p>
        <p className="mt-1 text-xs font-medium text-slate-500">{description}</p>
      </div>
    </div>
  );
}
