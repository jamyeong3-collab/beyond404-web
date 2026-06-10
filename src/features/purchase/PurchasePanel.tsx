"use client";

import { CheckCircle2, Refrigerator, ShoppingBag, Truck, WashingMachine, Wind } from "lucide-react";
import type { ReactNode } from "react";

type ProductId = "washer" | "fridge" | "aircon";

type PurchasePanelProps = {
  estimatedCredit: number;
  selectedProductId: ProductId | null;
  onSelectProduct: (productId: ProductId) => void;
  onContinueToBooking: () => void;
  onSkip: () => void;
};

const purchaseProducts = [
  {
    id: "washer",
    name: "LG AI DD Washing Machine",
    category: "세탁기",
    originalPrice: 629000,
    sameDayEligible: true,
    tags: ["11kg", "AI DD", "Steam+"],
    icon: WashingMachine,
  },
  {
    id: "fridge",
    name: "LG Convertible Refrigerator",
    category: "냉장고",
    originalPrice: 749000,
    sameDayEligible: true,
    tags: ["398L", "Wi‑Fi", "Convertible"],
    icon: Refrigerator,
  },
  {
    id: "aircon",
    name: "LG Dual Inverter AC",
    category: "에어컨",
    originalPrice: 459000,
    sameDayEligible: false,
    tags: ["1.5 Ton", "5 Star", "Dual Inverter"],
    icon: Wind,
  },
] as const;

export function PurchasePanel({
  estimatedCredit,
  selectedProductId,
  onSelectProduct,
  onContinueToBooking,
  onSkip,
}: PurchasePanelProps) {
  const selectedProduct =
    purchaseProducts.find((product) => product.id === selectedProductId) ?? null;

  return (
    <section className="rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-black text-lgred">
        <ShoppingBag size={18} />
        STEP 2-1. LG 교체 제품 선택
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        예상 보상가를 적용한 할인 금액과 당일 배송 가능 여부를 확인하고, 교체할 LG 가전을 먼저 선택할 수 있습니다.
      </p>

      <div className="mt-4 rounded-3xl bg-[#202632] p-4 text-white">
        <p className="text-xs font-black text-white/60">예상 SwapIt 보상 크레딧</p>
        <p className="mt-1 text-3xl font-black">{estimatedCredit.toLocaleString()}원</p>
        <p className="mt-2 text-xs font-semibold text-white/70">
          원가 대비 비율 할인으로 계산되며, 최종 금액은 수거 후 확정 감정 결과로 다시 안내됩니다.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {purchaseProducts.map((product) => {
          const active = selectedProduct?.id === product.id;
          const finalPrice = Math.max(product.originalPrice - estimatedCredit, 0);
          const discountRate = Math.min(
            100,
            Math.round((estimatedCredit / product.originalPrice) * 100),
          );
          const Icon = product.icon;

          return (
            <button
              key={product.id}
              className={`block w-full rounded-3xl border p-4 text-left transition ${
                active ? "border-lgred bg-lgred/5 shadow-sm" : "border-slate-200 bg-slate-50"
              }`}
              onClick={() => onSelectProduct(product.id)}
              type="button"
            >
              <div className="flex items-start gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-lgred shadow-sm">
                  <Icon size={28} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-black text-lgred">{product.category}</p>
                    {product.sameDayEligible ? (
                      <span className="rounded-full bg-[#dff8e7] px-2 py-1 text-[10px] font-black text-[#1b8f45]">
                        당일 배송 가능
                      </span>
                    ) : null}
                  </div>
                  <h3 className="mt-1 text-base font-black text-ink">{product.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {product.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <PriceTile label="원가" value={`${product.originalPrice.toLocaleString()}원`} />
                    <PriceTile label="할인율" value={`${discountRate}%`} accent />
                    <PriceTile label="최종가" value={`${finalPrice.toLocaleString()}원`} strong />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-3xl bg-slate-50 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lgred/10 text-lgred">
            <Truck size={18} />
          </span>
          <div>
            <p className="text-sm font-black text-ink">선택 후 바로 수거/교체 예약으로 연결</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              시간 예약 또는 바로콜을 선택하면, 기존 가전 수거와 새 LG 가전 교체 일정을 같은 흐름으로 이어서 진행합니다.
            </p>
          </div>
        </div>
      </div>

      {selectedProduct ? (
        <div className="mt-4 rounded-3xl border border-lgred/15 bg-lgred/5 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-lgred">
            <CheckCircle2 size={16} />
            선택한 제품
          </div>
          <p className="mt-2 text-lg font-black text-ink">{selectedProduct.name}</p>
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-2 gap-2">
        <button
          className="h-12 rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-600"
          onClick={onSkip}
          type="button"
        >
          제품 선택 없이 예약
        </button>
        <button
          className="h-12 rounded-2xl bg-lgred text-sm font-black text-white disabled:bg-slate-300"
          disabled={!selectedProduct}
          onClick={onContinueToBooking}
          type="button"
        >
          이 제품으로 예약 진행
        </button>
      </div>
    </section>
  );
}

function PriceTile({
  label,
  value,
  accent = false,
  strong = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white p-3">
      <p className="text-[11px] font-black text-slate-400">{label}</p>
      <p
        className={`mt-1 text-sm font-black ${
          strong ? "text-ink" : accent ? "text-lgred" : "text-slate-600"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
