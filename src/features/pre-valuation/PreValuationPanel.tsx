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
          <div className="mt-4 rounded-3xl bg-[#202632] px-4 py-4 text-white">
            <p className="text-[15px] font-bold leading-5 text-white">예상 가격이에요</p>
            <p className="mt-1 text-[20px] font-bold leading-6">{estimatedValue.toLocaleString()}원</p>
            <p className="mt-2 text-[13px] font-medium leading-5 text-white/70">
              수거만 진행해도 받을 수 있는 기본 예상 크레딧이에요. LG 가전 구매와 연결하면 제품 가격에 따라 추가 할인이 적용돼요.
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
