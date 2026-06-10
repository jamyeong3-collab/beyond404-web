import { CalendarCheck, CheckCircle2, MapPin } from "lucide-react";

type ReservationCompletePanelProps = {
  reservationAddress: string;
  reservationLabel: string;
  onClose: () => void;
  onViewReservation: () => void;
};

export function ReservationCompletePanel({
  reservationAddress,
  reservationLabel,
  onClose,
  onViewReservation,
}: ReservationCompletePanelProps) {
  return (
    <section className="flex h-full flex-col rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <CalendarCheck size={18} />
        예약 완료
      </div>

      <div className="mt-5 rounded-3xl border border-lgred/15 bg-lgred/5 p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lgred text-white">
          <CheckCircle2 size={30} />
        </div>
        <p className="mt-4 text-xs font-black text-lgred">수거 예약이 확정되었습니다</p>
        <h2 className="mt-2 text-2xl font-black text-ink">{reservationLabel || "예약 정보 확인 중"}</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          지금은 직접 나가거나, 예약 확인하기를 눌러 진행 중인 예약 화면으로 이동할 수 있습니다.
        </p>
      </div>

      <div className="mt-4 rounded-2xl bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-lgred/10 text-lgred">
            <MapPin size={18} />
          </span>
          <div>
            <p className="text-sm font-black text-ink">수거 위치</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {reservationAddress || "입력한 주소를 불러오는 중입니다."}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <button
          className="h-12 rounded-xl border border-lgred/20 bg-white text-sm font-black text-lgred"
          onClick={onClose}
          type="button"
        >
          나가기
        </button>
        <button
          className="h-12 rounded-xl bg-lgred text-sm font-black text-white"
          onClick={onViewReservation}
          type="button"
        >
          예약 확인하기
        </button>
      </div>
    </section>
  );
}
