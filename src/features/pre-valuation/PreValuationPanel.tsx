"use client";

import type { SwapRequest } from "@/types/swap";
import { Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";

type PreValuationPanelProps = {
  swapRequest: SwapRequest | null;
  capturedImageUrl?: string;
  loading?: boolean;
  onOpenPurchase: () => void;
  onNext: () => void;
};

const fallbackProductImages: Record<string, { label: string; imageUrl: string }> = {
  washing_machine: {
    label: "LG 세탁기",
    imageUrl: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=900&q=80",
  },
  refrigerator: {
    label: "LG 냉장고",
    imageUrl: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=900&q=80",
  },
  air_conditioner: {
    label: "LG 에어컨",
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&q=80",
  },
  microwave: {
    label: "LG 전자레인지",
    imageUrl: "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=900&q=80",
  },
  tv: {
    label: "LG TV",
    imageUrl: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=900&q=80",
  },
};

export function PreValuationPanel({
  swapRequest,
  capturedImageUrl = "",
  loading = false,
  onOpenPurchase,
  onNext,
}: PreValuationPanelProps) {
  const valuation = swapRequest?.preValuation;
  const hasValuation = Boolean(valuation && valuation.maxEstimatedValue > 0);
  const estimatedValue = valuation
    ? Math.round((valuation.minEstimatedValue + valuation.maxEstimatedValue) / 2)
    : 0;
  const applianceType = swapRequest?.appliance.applianceType ?? "washing_machine";
  const fallbackProduct = fallbackProductImages[applianceType] ?? fallbackProductImages.washing_machine;
  const userPhotoUrl =
    getDisplayableImageUrl(capturedImageUrl) ??
    getDisplayableImageUrl(swapRequest?.captureEvidence?.exteriorPhotoFileName) ??
    getDisplayableImageUrl(swapRequest?.appliance.uploadedFileName);
  const imageUrl = userPhotoUrl ?? fallbackProduct.imageUrl;
  const imageLabel = userPhotoUrl ? "촬영한 제품이에요" : `${fallbackProduct.label} 예시 이미지예요`;
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-sm">
      <div className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
        <div className="flex h-56 items-center justify-center bg-white">
          {imageUrl && !imageFailed ? (
            <img
              alt={imageLabel}
              className="h-full w-full object-contain p-4"
              onError={() => setImageFailed(true)}
              src={imageUrl}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-slate-400">
              <ImageIcon size={36} />
              <p className="mt-2 text-[13px] font-medium">제품 이미지를 준비하고 있어요</p>
            </div>
          )}
        </div>
        <div className="border-t border-slate-100 px-4 py-3">
          <p className="text-[13px] font-semibold leading-5 text-slate-500">{imageLabel}</p>
          <p className="mt-1 truncate text-[15px] font-bold leading-5 text-ink">
            {swapRequest?.appliance.modelName || fallbackProduct.label}
          </p>
        </div>
      </div>

      {hasValuation && valuation ? (
        <>
          <div className="mt-4 rounded-[28px] bg-white p-4 shadow-[0_10px_26px_rgba(15,23,42,0.08)] ring-1 ring-slate-100">
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-lgred/8 px-3 py-1 text-[11px] font-bold text-lgred">
                예상 크레딧
              </span>
              <span className="text-[10px] font-bold text-slate-400">수거 후 확정</span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[13px] font-bold leading-5 text-slate-500">기본 보상 금액이에요</p>
                <p className="mt-1 text-[28px] font-bold leading-8 text-ink">
                  {estimatedValue.toLocaleString()}원
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold text-slate-500">수거만 진행</span>
                <span className="text-[12px] font-bold text-ink">기본 크레딧 지급</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold text-slate-500">LG 가전 구매</span>
                <span className="text-[12px] font-bold text-lgred">추가 할인 가능</span>
              </div>
            </div>

            <p className="mt-3 truncate text-[10px] font-semibold leading-4 text-slate-500">
              최종 크레딧은 수거 후 상태와 선택한 구매 제품 가격에 따라 달라질 수 있어요.
            </p>
          </div>

          <div className="mt-6 space-y-2">
            <p className="text-[15px] font-bold leading-5 text-ink">어떻게 진행할까요?</p>
            <button
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-lgred px-4 py-3 text-[13px] font-bold leading-5 text-white disabled:bg-slate-300"
              disabled={loading}
              onClick={onOpenPurchase}
              type="button"
            >
              LG 가전 구매로 더 많은 할인을 받을게요
            </button>
            <button
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl border border-lgred/20 bg-white px-4 py-3 text-[13px] font-bold leading-5 text-lgred disabled:text-slate-400"
              disabled={loading}
              onClick={onNext}
              type="button"
            >
              수거만 진행해서 크레딧을 받을게요
            </button>
          </div>
        </>
      ) : (
        <p className="mt-4 text-[15px] leading-6 text-slate-500">
          촬영 이미지 분석이 끝나면 예상 보상 크레딧을 계산해드려요.
        </p>
      )}
    </section>
  );
}

function getDisplayableImageUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  if (
    trimmed.startsWith("data:image/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("/")
  ) {
    return trimmed;
  }

  return null;
}
