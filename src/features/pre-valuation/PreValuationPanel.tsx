import type { SwapRequest } from "@/types/swap";
import { Coins, Factory, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";

type PreValuationPanelProps = {
  swapRequest: SwapRequest | null;
  loading?: boolean;
  onOpenPurchase: () => void;
  onNext: () => void;
};

export function PreValuationPanel({
  swapRequest,
  loading = false,
  onOpenPurchase,
  onNext,
}: PreValuationPanelProps) {
  const valuation = swapRequest?.preValuation;
  const hasValuation = Boolean(valuation && valuation.minEstimatedValue > 0);
  const midpoint = valuation
    ? Math.round((valuation.minEstimatedValue + valuation.maxEstimatedValue) / 2)
    : 0;

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <Coins size={18} />
        STEP 2. 예상 보상 크레딧
      </div>

      {hasValuation && valuation ? (
        <>
          <div className="mt-4 rounded-3xl bg-[#202632] p-5 text-white">
            <p className="text-xs font-black text-white/60">순수 원자재 스크랩 가치 기반 예상 범위</p>
            <p className="mt-2 text-3xl font-black">
              {valuation.minEstimatedValue.toLocaleString()} ~ {valuation.maxEstimatedValue.toLocaleString()}원
            </p>
            <p className="mt-2 text-xs font-semibold text-white/70">
              예상 평균 보상가 {midpoint.toLocaleString()}원을 기준으로 LG 교체 제품 할인에 먼저 반영할 수 있습니다.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <MetricCard
              icon={<Factory size={18} />}
              title="스크랩 기준"
              value="금속/플라스틱"
              description="분해 후 회수 가능한 자재 가치 반영"
            />
            <MetricCard
              icon={<ShoppingBag size={18} />}
              title="교체 할인 기준"
              value={`${midpoint.toLocaleString()}원`}
              description="LG 구매 페이지 할인 예상치"
            />
          </div>

          <div className="mt-4 space-y-2">
            {valuation.basis.map((item) => (
              <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-3xl bg-lgred/5 p-4">
            <p className="text-sm font-black text-ink">다음 단계 안내</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              먼저 LG 교체 제품을 고르면 원가와 할인 적용가를 확인한 뒤, 시간 예약 또는 바로콜로 수거/배송을 예약할 수 있습니다.
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              className="h-12 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600 disabled:bg-slate-100"
              disabled={loading}
              onClick={onNext}
              type="button"
            >
              제품 선택 없이 예약
            </button>
            <button
              className="h-12 rounded-2xl bg-lgred text-sm font-black text-white disabled:bg-slate-300"
              disabled={loading}
              onClick={onOpenPurchase}
              type="button"
            >
              LG 구매 페이지 보기
            </button>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-slate-500">
          촬영 이미지 분석이 끝나면 예상 보상 크레딧이 계산됩니다.
        </p>
      )}
    </section>
  );
}

function MetricCard({
  icon,
  title,
  value,
  description,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-black">{title}</span>
      </div>
      <p className="mt-3 text-lg font-black text-ink">{value}</p>
      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">{description}</p>
    </div>
  );
}
