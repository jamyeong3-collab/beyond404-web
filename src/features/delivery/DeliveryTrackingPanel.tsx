"use client";

import type { SwapRequest } from "@/types/swap";
import { CheckCircle2, Package2, Truck, Warehouse } from "lucide-react";
import type { ReactNode } from "react";

type DeliveryTrackingPanelProps = {
  swapRequest: SwapRequest | null;
};

export function DeliveryTrackingPanel({ swapRequest }: DeliveryTrackingPanelProps) {
  const tracking = swapRequest?.deliveryTracking;
  const selectedProduct = swapRequest?.selectedProduct;
  const stages = tracking?.stages ?? [];

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold text-lgred">
        <Truck size={18} />
        새 가전 배송상황
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        수거 완료 후 선택한 제품의 출고와 배송 상태를 택배형 단계로 확인합니다.
      </p>

      <div className="mt-4 rounded-3xl bg-[#202632] p-5 text-white">
        <p className="text-xs font-semibold text-white/60">배송 대상 제품</p>
        <p className="mt-2 text-2xl font-bold">{selectedProduct?.productName ?? "선택된 제품 없음"}</p>
        <p className="mt-2 text-xs font-semibold text-white/70">{tracking?.etaMessage ?? "배송 준비 중"}</p>
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        {stages.length > 0 ? (
          <div className="space-y-4">
            {stages.map((stage, index) => (
              <div key={stage.stageKey} className="grid grid-cols-[18px_minmax(0,1fr)_72px] items-start gap-3">
                <div className="flex flex-col items-center">
                  <span
                    className={`mt-1 h-4 w-4 rounded-full ${
                      stage.completed ? "bg-lgred" : "border border-slate-300 bg-white"
                    }`}
                  />
                  {index < stages.length - 1 ? (
                    <span className={`mt-1 h-10 w-[3px] rounded-full ${stage.completed ? "bg-lgred/70" : "bg-slate-200"}`} />
                  ) : null}
                </div>
                <div>
                  <p className={`text-sm font-bold ${stage.completed ? "text-ink" : "text-slate-500"}`}>{stage.label}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{helperText(stage.stageKey)}</p>
                </div>
                <p className={`text-right text-xs font-semibold ${stage.completed ? "text-slate-500" : "text-slate-400"}`}>
                  {stage.completedAt ? formatTime(stage.completedAt) : "--:--"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm font-semibold text-slate-500">배송 상태가 아직 준비되지 않았습니다.</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <StatusCard icon={<Package2 size={18} />} title="주문" value="확인" />
        <StatusCard icon={<Warehouse size={18} />} title="출고" value={stageValue(stages, "SHIPPED")} />
        <StatusCard icon={<CheckCircle2 size={18} />} title="도착" value={stageValue(stages, "DELIVERED")} />
      </div>
    </section>
  );
}

function helperText(stageKey: string) {
  switch (stageKey) {
    case "ORDER_CONFIRMED":
      return "교환 제품 주문이 접수되었습니다.";
    case "PREPARING":
      return "창고에서 제품 출고를 준비하고 있습니다.";
    case "SHIPPED":
      return "새 가전이 출고되어 이동 중입니다.";
    case "DELIVERED":
      return "새 가전 배송이 완료되었습니다.";
    default:
      return "";
  }
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function stageValue(
  stages: { stageKey: string; completed: boolean }[],
  key: string,
) {
  const stage = stages.find((item) => item.stageKey === key);
  return stage?.completed ? "완료" : "대기";
}

function StatusCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode;
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <p className="mt-2 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}
