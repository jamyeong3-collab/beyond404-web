"use client";

import { CheckCircle2, Refrigerator, ShoppingBag, WashingMachine, Wind, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type ProductId = "washer" | "fridge" | "aircon";
export type ProductGrade = "프리미엄" | "일반/중형" | "보급형";

export type ReplacementProduct = {
  id: ProductId;
  name: string;
  category: string;
  grade: ProductGrade;
  originalPrice: number;
  sameDayEligible: boolean;
  imageUrl: string;
  summary: string;
  detail: string;
  recommendedFor: string;
  serviceInfo: string;
  highlights: string[];
  specs: { label: string; value: string }[];
  tags: string[];
  icon: ReactNode;
};

type PurchasePanelProps = {
  estimatedCredit: number;
  selectedProductId: ProductId | null;
  onSelectProduct: (productId: ProductId) => void;
  onContinueToBooking: () => void;
};

export const purchaseProducts: ReplacementProduct[] = [
  {
    id: "washer",
    name: "LG 오브제컬렉션 AI 세탁기",
    category: "세탁기",
    grade: "프리미엄",
    originalPrice: 2090000,
    sameDayEligible: true,
    imageUrl: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=900&q=80",
    summary: "AI DD와 대용량 코스로 세탁량이 많은 집에 잘 맞아요.",
    detail: "반납 세탁기와 같은 생활 가전 라인으로 교체하기 좋은 모델이에요. 대용량 세탁, 의류 손상 완화, 자동 코스 추천을 중심으로 비교할 수 있어요.",
    recommendedFor: "가족 세탁량이 많거나 이불, 수건을 자주 세탁하는 집에 추천해요.",
    serviceInfo: "배송 설치 일정은 수거 예약 이후 연결되고, 기존 제품 수거 동선과 함께 확인돼요.",
    highlights: ["AI DD로 세탁물 특성에 맞춰 동작해요", "대용량 코스로 세탁 빈도를 줄일 수 있어요", "오브제컬렉션 톤으로 인테리어에 맞추기 좋아요"],
    specs: [
      { label: "용량", value: "25kg" },
      { label: "주요 기능", value: "AI DD" },
      { label: "제품군", value: "오브제컬렉션" },
    ],
    tags: ["25kg", "AI DD", "오브제컬렉션"],
    icon: <WashingMachine size={28} />,
  },
  {
    id: "fridge",
    name: "LG DIOS 오브제컬렉션 냉장고",
    category: "냉장고",
    grade: "프리미엄",
    originalPrice: 2890000,
    sameDayEligible: true,
    imageUrl: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=900&q=80",
    summary: "넉넉한 수납과 노크온 편의 기능을 함께 확인할 수 있어요.",
    detail: "대형 냉장고 교체를 고려할 때 보관 용량과 사용 편의성을 함께 볼 수 있는 모델이에요. 냉장/냉동 공간을 넉넉하게 쓰는 집에 잘 맞아요.",
    recommendedFor: "식재료 보관량이 많거나 주방 가전 톤을 통일하고 싶은 집에 추천해요.",
    serviceInfo: "대형 제품이라 설치 공간 확인이 필요하고, 수거 예약 단계에서 방문 위치를 함께 확인해요.",
    highlights: ["832L 대용량으로 보관 공간이 넉넉해요", "노크온 기능으로 문 열림을 줄일 수 있어요", "디오스 라인으로 주방 교체 수요에 잘 맞아요"],
    specs: [
      { label: "용량", value: "832L" },
      { label: "주요 기능", value: "노크온" },
      { label: "제품군", value: "DIOS" },
    ],
    tags: ["832L", "노크온", "디오스"],
    icon: <Refrigerator size={28} />,
  },
  {
    id: "aircon",
    name: "LG 휘센 벽걸이 에어컨",
    category: "에어컨",
    grade: "일반/중형",
    originalPrice: 890000,
    sameDayEligible: false,
    imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&q=80",
    summary: "작은 방이나 거실 보조 냉방용으로 부담 없이 고를 수 있어요.",
    detail: "교체 비용 부담을 낮추면서 냉방 효율을 챙기고 싶은 경우에 보기 좋은 모델이에요. 기존 소형 가전 수거 후 빠르게 예약 흐름을 이어갈 수 있어요.",
    recommendedFor: "방 하나를 집중 냉방하거나 보조 냉방 제품이 필요한 집에 추천해요.",
    serviceInfo: "에어컨은 설치 환경에 따라 추가 확인이 필요해요. 주문 후 설치 가능 일정 안내를 이어서 확인해요.",
    highlights: ["듀얼 인버터로 전력 사용을 효율적으로 관리해요", "1.5톤급으로 방/중소형 공간에 잘 맞아요", "휘센 라인이라 여름철 교체 수요에 적합해요"],
    specs: [
      { label: "냉방 용량", value: "1.5톤" },
      { label: "인버터", value: "듀얼" },
      { label: "제품군", value: "휘센" },
    ],
    tags: ["1.5톤", "듀얼 인버터", "휘센"],
    icon: <Wind size={28} />,
  },
];

function calculatePurchaseBenefit(baseCredit: number, productPrice: number) {
  const productPriceBonus = Math.round((productPrice * 0.03) / 1000) * 1000;
  const benefitCap = Math.round((productPrice * 0.15) / 1000) * 1000;
  return Math.min(baseCredit + productPriceBonus, benefitCap);
}

export function PurchasePanel({
  estimatedCredit,
  selectedProductId,
  onSelectProduct,
  onContinueToBooking,
}: PurchasePanelProps) {
  const selectedProduct = purchaseProducts.find((product) => product.id === selectedProductId) ?? null;
  const [detailProduct, setDetailProduct] = useState<ReplacementProduct | null>(null);
  const selectedPurchaseBenefit = selectedProduct
    ? calculatePurchaseBenefit(estimatedCredit, selectedProduct.originalPrice)
    : 0;
  const selectedFinalPrice = selectedProduct
    ? Math.max(selectedProduct.originalPrice - selectedPurchaseBenefit, 0)
    : 0;

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
        <ShoppingBag size={18} />
        LG 교체 제품을 선택해요
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        교체할 제품을 선택하면 반납 제품 보상과 선택 제품 가격을 함께 반영한 예상 결제 금액을 확인할 수 있어요.
      </p>

      <div className="mt-4 rounded-3xl bg-[#202632] px-4 py-4 text-white">
        <p className="text-[13px] font-semibold leading-5 text-white/65">기본 예상 보상이에요</p>
        <p className="mt-1 text-[20px] font-bold leading-6">{estimatedCredit.toLocaleString()}원</p>
        <p className="mt-2 text-[13px] font-medium leading-5 text-white/70">
          최종 혜택은 선택한 제품 가격대에 따라 달라져요.
        </p>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3">
        {purchaseProducts.map((product) => {
          const active = selectedProduct?.id === product.id;
          const purchaseBenefit = calculatePurchaseBenefit(estimatedCredit, product.originalPrice);
          const finalPrice = Math.max(product.originalPrice - purchaseBenefit, 0);

          return (
            <button
              key={product.id}
              className={`relative h-[280px] w-[212px] shrink-0 snap-start overflow-hidden rounded-3xl border text-left shadow-sm transition ${
                active ? "border-lgred bg-lgred/5" : "border-slate-200 bg-slate-50"
              }`}
              onClick={() => {
                setDetailProduct(null);
                onSelectProduct(product.id);
              }}
              type="button"
            >
              <div className="relative h-36 bg-[#eaf1ff]">
                <img alt={product.name} className="h-full w-full object-cover" src={product.imageUrl} />
                <span className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-lgred shadow-sm">
                  {product.icon}
                </span>
                {active ? (
                  <span className="absolute right-3 top-3 rounded-full bg-lgred px-2.5 py-1 text-[10px] font-bold text-white">
                    선택됨
                  </span>
                ) : null}
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-lgred">{product.category}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
                    {product.grade}
                  </span>
                </div>
                <h3 className="mt-2 line-clamp-2 min-h-10 text-[15px] font-bold leading-5 text-ink">{product.name}</h3>
                <p className="mt-2 text-[11px] font-medium leading-4 text-slate-500">
                  예상 결제 {finalPrice.toLocaleString()}원
                </p>
                <p className="mt-1 text-[11px] font-semibold leading-4 text-lgred">
                  혜택 {purchaseBenefit.toLocaleString()}원
                </p>
              </div>
            </button>
          );
        })}
        </div>
      </div>

      {selectedProduct ? (
        <div className="mt-4 rounded-3xl border border-lgred/15 bg-lgred/5 p-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
            <CheckCircle2 size={16} />
            선택한 제품이에요
          </div>
          <p className="mt-2 text-[15px] font-bold leading-5 text-ink">{selectedProduct.name}</p>
          <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
            {selectedProduct.summary}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-500">예상 혜택</p>
              <p className="mt-1 text-[13px] font-bold text-lgred">{selectedPurchaseBenefit.toLocaleString()}원</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-2">
              <p className="text-[10px] font-semibold text-slate-500">예상 결제</p>
              <p className="mt-1 text-[13px] font-bold text-ink">{selectedFinalPrice.toLocaleString()}원</p>
            </div>
          </div>
        </div>
      ) : null}

      <button
        className="mt-4 h-12 w-full rounded-2xl bg-lgred text-[13px] font-bold text-white disabled:bg-slate-300"
        disabled={!selectedProduct}
        onClick={() => {
          if (selectedProduct) {
            setDetailProduct(selectedProduct);
          }
        }}
        type="button"
      >
        제품 보기
      </button>

      {detailProduct ? (
        <ProductDetailSheet
          estimatedCredit={estimatedCredit}
          onClose={() => setDetailProduct(null)}
          onOrder={() => {
            onSelectProduct(detailProduct.id);
            setDetailProduct(null);
            onContinueToBooking();
          }}
          product={detailProduct}
        />
      ) : null}
    </section>
  );
}

function ProductDetailSheet({
  estimatedCredit,
  product,
  onClose,
  onOrder,
}: {
  estimatedCredit: number;
  product: ReplacementProduct;
  onClose: () => void;
  onOrder: () => void;
}) {
  const purchaseBenefit = calculatePurchaseBenefit(estimatedCredit, product.originalPrice);
  const finalPrice = Math.max(product.originalPrice - purchaseBenefit, 0);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.getElementById("swapit-phone-viewport"));
  }, []);

  if (!portalTarget) {
    return null;
  }

  return createPortal(
    <div className="absolute inset-0 z-[80] flex items-end justify-center bg-black/70 px-4 backdrop-blur-[1px]" onClick={onClose}>
      <div
        className="flex max-h-[84%] min-h-[70%] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl animate-[sheetUp_.24s_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="relative h-72 overflow-hidden rounded-t-[28px] bg-[#f5f7fb]">
            <img alt={product.name} className="h-full w-full object-cover object-center" src={product.imageUrl} />
            <button
              aria-label="제품 상세 닫기"
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm"
              onClick={onClose}
              type="button"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-lgred/10 px-3 py-1 text-[11px] font-bold text-lgred">
                {product.category}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">
                {product.grade}
              </span>
              {product.sameDayEligible ? (
                <span className="rounded-full bg-[#dff8e7] px-3 py-1 text-[11px] font-semibold text-[#1b8f45]">
                  당일 배송 가능
                </span>
              ) : null}
            </div>

            <h3 className="mt-3 text-[17px] font-bold leading-6 text-ink">{product.name}</h3>
            <p className="mt-2 text-[13px] font-medium leading-5 text-slate-500">{product.detail}</p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <PriceTile label="정가" value={`${product.originalPrice.toLocaleString()}원`} />
              <PriceTile label="예상 혜택" value={`${purchaseBenefit.toLocaleString()}원`} accent />
              <PriceTile label="예상 결제" value={`${finalPrice.toLocaleString()}원`} strong />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-4 rounded-3xl bg-slate-50 p-4">
              <p className="text-[13px] font-bold text-ink">이런 경우에 잘 맞아요</p>
              <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{product.recommendedFor}</p>
            </div>

            <div className="mt-3 rounded-3xl bg-slate-50 p-4">
              <p className="text-[13px] font-bold text-ink">주요 포인트</p>
              <div className="mt-3 space-y-2">
                {product.highlights.map((highlight) => (
                  <div key={highlight} className="flex gap-2 text-xs font-medium leading-5 text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lgred" />
                    <span>{highlight}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              {product.specs.map((spec) => (
                <div key={spec.label} className="rounded-2xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold text-slate-500">{spec.label}</p>
                  <p className="mt-1 text-[12px] font-bold leading-4 text-ink">{spec.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 rounded-3xl bg-lgred/5 p-4">
              <p className="text-[13px] font-bold text-ink">배송/설치 안내</p>
              <p className="mt-2 text-xs font-medium leading-5 text-slate-500">{product.serviceInfo}</p>
            </div>
          </div>
        </div>
        <div className="shrink-0 border-t border-slate-100 bg-white px-4 pb-4 pt-3 shadow-[0_-12px_24px_rgba(15,23,42,.08)]">
          <button
            className="h-12 w-full rounded-2xl bg-lgred text-[13px] font-bold text-white"
            onClick={onOrder}
            type="button"
          >
            주문하기
          </button>
        </div>
      </div>
    </div>,
    portalTarget,
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
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-[13px] font-bold ${strong ? "text-ink" : accent ? "text-lgred" : "text-slate-600"}`}>
        {value}
      </p>
    </div>
  );
}
