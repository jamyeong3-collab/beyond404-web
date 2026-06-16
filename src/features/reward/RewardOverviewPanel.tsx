"use client";

import type { SwapRequest } from "@/types/swap";
import { BadgePercent, ChevronRight, Gift, ShieldCheck, Sparkles, Truck } from "lucide-react";
import type { ReactNode } from "react";

type RewardOverviewPanelProps = {
  swapRequest: SwapRequest | null;
  onOpenDelivery: () => void;
  onAdvanceDelivery: () => void;
  advancing: boolean;
};

export function RewardOverviewPanel({
  swapRequest,
  onOpenDelivery,
  onAdvanceDelivery,
  advancing,
}: RewardOverviewPanelProps) {
  const reward = swapRequest?.rewardOverview;
  const estimate = swapRequest?.rewardEstimate;
  const selectedProduct = swapRequest?.selectedProduct;
  const currentCredit = reward?.currentCredit ?? estimate?.estimatedFinalCredit ?? 0;

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold text-lgred">
        <Gift size={18} />
        전체 보상 확인
      </div>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        기존 step 5 대신 이번 교환 보상, 등급, 다음 혜택, 배송 연결 상태를 한 번에 보여줍니다.
      </p>

      <div className="mt-4 rounded-3xl bg-[#202632] p-5 text-white">
        <p className="text-xs font-semibold text-white/60">이번 교환 확정 보상 크레딧</p>
        <p className="mt-2 text-3xl font-bold">{currentCredit.toLocaleString()}원</p>
        <p className="mt-2 text-xs font-semibold text-white/70">
          {swapRequest?.tracking.phase === "DELIVERED_TO_EWASTE_HUB"
            ? "e-waste 공장에 전달 완료 후 보상 상태가 갱신되었습니다."
            : "허브 인수 확인이 반영된 기준값입니다."}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetricCard title="현재 등급" value={reward?.userTier ?? "Starter"} icon={<Sparkles size={18} />} />
        <MetricCard
          title="누적 교환"
          value={`${reward?.exchangeCount ?? estimate?.exchangeCount ?? 1}회`}
          icon={<BadgePercent size={18} />}
        />
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <ShieldCheck size={16} />
          이번 교환 보상 내역
        </div>
        <div className="mt-3 space-y-2">
          <InfoRow label="스크랩 가치" value={`${estimate?.scrapValue?.toLocaleString() ?? 0}원`} />
          <InfoRow label="적용 비율" value={`${Math.round((estimate?.creditRate ?? 0) * 100)}%`} />
          <InfoRow label="최대 상한" value={`${Math.round((estimate?.creditCapRate ?? 0.15) * 100)}%`} />
          <InfoRow label="반납 크기 등급" value={swapRequest?.appliance.sizeGrade ?? "-"} />
        </div>
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-ink">
          <Truck size={16} />
          새 가전 연결 정보
        </div>
        <p className="mt-2 text-base font-bold text-ink">{selectedProduct?.productName ?? "선택된 제품 없음"}</p>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {selectedProduct
            ? `${selectedProduct.productGrade} / ${selectedProduct.productPrice.toLocaleString()}원`
            : "제품 선택 후 배송 추적이 연결됩니다."}
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {(reward?.benefits ?? []).map((benefit) => (
          <div key={benefit} className="rounded-2xl bg-[#fff7f8] px-4 py-3 text-sm font-semibold text-slate-600">
            {benefit}
          </div>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 disabled:bg-slate-100"
          disabled={advancing}
          onClick={onAdvanceDelivery}
          type="button"
        >
          {advancing ? "업데이트 중..." : "배송 상태 진행"}
        </button>
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-lgred text-sm font-bold text-white"
          onClick={onOpenDelivery}
          type="button"
        >
          새 가전 배송상황
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold">{title}</span>
      </div>
      <p className="mt-3 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <strong className="text-sm font-bold text-ink">{value}</strong>
    </div>
  );
}
