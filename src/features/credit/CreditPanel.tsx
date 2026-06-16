"use client";

import { Service3DIcon } from "@/components/Service3DIcon";
import type { SwapRequest } from "@/types/swap";
import {
  AlertCircle,
  Home,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Send,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

type ReviewStatus =
  | "none"
  | "reserved"
  | "pickup"
  | "reviewPending"
  | "reviewCompleted"
  | "reReviewPending"
  | "reReviewCompleted";

type CreditPanelProps = {
  fileName: string;
  reviewStatus: ReviewStatus;
  swapRequest: SwapRequest | null;
  loading: boolean;
  onFinalize: () => void;
  onRequestReReview: () => void;
  onOpenMarket: () => void;
  onReturnHome: () => void;
};

export function CreditPanel({
  fileName,
  reviewStatus,
  swapRequest,
  loading,
  onFinalize,
  onRequestReReview,
  onOpenMarket,
  onReturnHome,
}: CreditPanelProps) {
  const [reReviewOpen, setReReviewOpen] = useState(false);
  const [showReReviewResult, setShowReReviewResult] = useState(false);
  const [creditIssued, setCreditIssued] = useState(false);
  const credit = swapRequest?.credit;

  if (reReviewOpen) {
    return (
      <section className="flex h-full min-h-0 flex-col rounded-[28px] bg-white p-5 shadow-sm">
        <ReReviewForm onBack={() => setReReviewOpen(false)} onSubmit={onRequestReReview} />
      </section>
    );
  }

  return (
    <section className="flex min-h-full flex-col rounded-[28px] bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold text-lgred">
        <Service3DIcon type="check" className="h-7 w-7 shrink-0" />
        STEP 5. 최종 검수 및 크레딧
      </div>

      {reviewStatus === "reReviewPending" ? (
        <ReReviewPendingView onReturnHome={onReturnHome} />
      ) : reviewStatus === "reReviewCompleted" && !showReReviewResult ? (
        <ReReviewReadyView onOpenResult={() => setShowReReviewResult(true)} />
      ) : credit ? (
        creditIssued ? (
          <CreditIssuedView
            amount={credit.amount}
            onReturnHome={onReturnHome}
            onUseCredit={onOpenMarket}
          />
        ) : (
          <FinalCreditView
            amount={credit.amount}
            allowReReview={reviewStatus !== "reReviewCompleted"}
            fileName={fileName}
            onIssueCredit={() => setCreditIssued(true)}
            onReReview={() => setReReviewOpen(true)}
          />
        )
      ) : reviewStatus === "reviewCompleted" ? (
        <ReviewReadyView loading={loading} onFinalize={onFinalize} />
      ) : (
        <PendingReviewView loading={loading} onReturnHome={onReturnHome} />
      )}
    </section>
  );
}

function PendingReviewView({
  loading,
  onReturnHome,
}: {
  loading: boolean;
  onReturnHome: () => void;
}) {
  return (
    <>
      <div className="mt-4 rounded-3xl border border-lgred/15 bg-lgred/5 p-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lgred/10 text-lgred">
          {loading ? <Loader2 className="animate-spin" size={30} /> : <Service3DIcon type="clipboard" className="h-16 w-16" />}
        </div>
        <p className="mt-4 text-xs font-semibold text-lgred">최종 검수 중</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">수거품을 확인하고 있어요</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          수거 후 추가 검수가 진행 중입니다. 데모에서는 10초 뒤 ThinQ 홈에 검수 완료 알림이 표시됩니다.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <ReviewRow done icon={<Service3DIcon type="check" className="h-9 w-9" />} title="수거 완료" description="가전이 LG 검수 프로세스로 이동했어요." />
        <ReviewRow icon={<Service3DIcon type="search" className="h-9 w-9" />} title="추가 검수 진행" description="외관, 부품 재사용 가능성, 원자재 가치를 확인합니다." />
        <ReviewRow icon={<Service3DIcon type="bell" className="h-9 w-9" />} title="ThinQ 알림 발송 예정" description="검수 완료 후 감정결과를 안내합니다." />
      </div>

      <button className="mt-auto h-12 w-full rounded-xl bg-lgred text-sm font-bold text-white" onClick={onReturnHome}>
        <span className="inline-flex items-center gap-2">
          <Home size={17} />
          ThinQ 홈으로 돌아가기
        </span>
      </button>
    </>
  );
}

function ReviewReadyView({
  loading,
  onFinalize,
}: {
  loading: boolean;
  onFinalize: () => void;
}) {
  return (
    <>
      <div className="mt-4 rounded-3xl border border-lgred/20 bg-lgred/10 p-6 text-center">
        <Service3DIcon type="bell" className="mx-auto h-16 w-16" />
        <p className="mt-4 text-xs font-semibold text-lgred">검수 완료</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">감정결과가 준비됐어요</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          최종 검수 결과와 확정 크레딧을 확인할 수 있습니다.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <ReviewRow done icon={<Service3DIcon type="check" className="h-9 w-9" />} title="최종 검수 완료" description="수거품 확인이 끝났어요." />
        <ReviewRow done icon={<Service3DIcon type="clipboard" className="h-9 w-9" />} title="감정 결과 생성" description="사진, 외관, 부품 상태를 반영했습니다." />
        <ReviewRow done icon={<Service3DIcon type="credit" className="h-9 w-9" />} title="크레딧 산정 완료" description="확정 금액 확인 후 크레딧을 받을 수 있어요." />
      </div>

      <button
        className="mt-auto h-12 w-full rounded-xl bg-lgred text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={loading}
        onClick={onFinalize}
      >
        {loading ? "검수 결과 불러오는 중" : "검수 결과 확인하러가기"}
      </button>
    </>
  );
}

function ReReviewPendingView({ onReturnHome }: { onReturnHome: () => void }) {
  return (
    <>
      <div className="mt-4 rounded-3xl border border-lgred/15 bg-lgred/5 p-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-lgred/10 text-lgred">
          <Loader2 className="animate-spin" size={30} />
        </div>
        <p className="mt-4 text-xs font-semibold text-lgred">재검수 중</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">요청 내용을 다시 확인하고 있어요</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          제출한 사유를 기준으로 감정 결과를 다시 확인합니다. 데모에서는 5초 뒤 ThinQ 홈에 완료 알림이 표시됩니다.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <ReviewRow done icon={<Service3DIcon type="clipboard" className="h-9 w-9" />} title="재검수 요청 접수" description="작성한 사유가 검수 담당자에게 전달됐어요." />
        <ReviewRow icon={<Service3DIcon type="search" className="h-9 w-9" />} title="결과 재확인" description="외관 상태, 부품 가치, 처리 비용을 다시 확인합니다." />
        <ReviewRow icon={<Service3DIcon type="bell" className="h-9 w-9" />} title="완료 알림 예정" description="재검수가 끝나면 ThinQ 홈에서 바로 확인할 수 있어요." />
      </div>

      <button className="mt-auto h-12 w-full rounded-xl bg-lgred text-sm font-bold text-white" onClick={onReturnHome}>
        <span className="inline-flex items-center gap-2">
          <Home size={17} />
          ThinQ 홈으로 돌아가기
        </span>
      </button>
    </>
  );
}

function ReReviewReadyView({ onOpenResult }: { onOpenResult: () => void }) {
  return (
    <>
      <div className="mt-4 rounded-3xl border border-lgred/20 bg-lgred/10 p-6 text-center">
        <Service3DIcon type="check" className="mx-auto h-16 w-16" />
        <p className="mt-4 text-xs font-semibold text-lgred">재검수 완료</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">재검수 결과가 준비됐어요</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          요청 사유를 반영해 감정 결과를 다시 확인했습니다.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <ReviewRow done icon={<Service3DIcon type="clipboard" className="h-9 w-9" />} title="요청 사유 확인" description="고객이 작성한 내용을 기준으로 다시 검토했습니다." />
        <ReviewRow done icon={<Service3DIcon type="check" className="h-9 w-9" />} title="재검수 완료" description="외관과 부품 가치를 한 번 더 확인했습니다." />
        <ReviewRow done icon={<Service3DIcon type="credit" className="h-9 w-9" />} title="최종 크레딧 유지" description="확정된 크레딧 결과를 다시 안내합니다." />
      </div>

      <button className="mt-auto h-12 w-full rounded-xl bg-lgred text-sm font-bold text-white" onClick={onOpenResult}>
        재검수 결과 확인하기
      </button>
    </>
  );
}

function FinalCreditView({
  amount,
  allowReReview,
  fileName,
  onIssueCredit,
  onReReview,
}: {
  amount: number;
  allowReReview: boolean;
  fileName: string;
  onIssueCredit: () => void;
  onReReview: () => void;
}) {
  return (
    <div className="mt-4 flex flex-col">
      <div>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50">
          <div className="flex h-24 items-center justify-center bg-[radial-gradient(circle_at_50%_40%,rgba(165,0,52,.18),transparent_30%),linear-gradient(145deg,#252936,#111318)] text-white">
            <div className="text-center">
              <ImageIcon className="mx-auto text-white/80" size={30} />
              <p className="mt-2 max-w-[240px] truncate text-xs font-bold text-white/70">
                {fileName || "촬영된 가전 사진"}
              </p>
            </div>
          </div>
          <div className="p-3">
            <p className="text-xs font-semibold text-lgred">최종 감정가</p>
            <p className="mt-1 text-3xl font-bold leading-none text-ink">₹{amount.toLocaleString()}</p>
            <p className="mt-2 text-xs leading-4 text-slate-500">
              추가 검수 결과를 기준으로 산정된 확정 금액입니다.
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2 pb-1">
          <ValuationReason title="외관 상태" description="전면 사용 흔적은 있으나 주요 파손은 확인되지 않았습니다." />
          <ValuationReason title="부품 재사용 가능성" description="일부 내부 부품은 재사용 가능성이 있어 보상가에 반영했습니다." />
          <ValuationReason title="원자재 가치" description="금속/플라스틱 회수 가능 가치를 기준으로 기본 금액을 산정했습니다." />
          <ValuationReason title="처리 비용" description="수거, 분류, 안전 해체 비용을 차감해 최종 금액을 확정했습니다." />
        </div>
      </div>

      <div className={`mt-3 grid gap-2 ${allowReReview ? "grid-cols-2" : "grid-cols-1"}`}>
        <button className="h-12 rounded-xl bg-lgred text-sm font-bold text-white" onClick={onIssueCredit}>
          크레딧 받기
        </button>
        {allowReReview ? (
          <button
            className="h-12 rounded-xl border border-lgred/20 bg-white text-sm font-bold text-lgred"
            onClick={onReReview}
          >
            재검수 요청
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CreditIssuedView({
  amount,
  onReturnHome,
  onUseCredit,
}: {
  amount: number;
  onReturnHome: () => void;
  onUseCredit: () => void;
}) {
  return (
    <>
      <div className="mt-4 rounded-3xl border border-lgred/20 bg-lgred/10 p-6 text-center">
        <Service3DIcon type="credit" className="mx-auto h-16 w-16" />
        <p className="mt-4 text-xs font-semibold text-lgred">크레딧 발급 완료</p>
        <h2 className="mt-2 text-2xl font-bold text-ink">₹{amount.toLocaleString()} 크레딧을 받았어요</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          발급된 크레딧은 ThinQ 안에서 새 LG 가전을 구매하거나 교체 예약을 진행할 때 사용할 수 있습니다.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <ReviewRow
          done
          icon={<Service3DIcon type="check" className="h-9 w-9" />}
          title="ThinQ 크레딧 지갑에 저장"
          description="발급 금액은 내 크레딧 내역에 자동으로 반영됩니다."
        />
        <ReviewRow
          done
          icon={<Service3DIcon type="credit" className="h-9 w-9" />}
          title="LG 제품 구매 시 사용"
          description="결제 단계에서 보유 크레딧을 선택하면 구매 금액에서 차감됩니다."
        />
        <ReviewRow
          done
          icon={<Service3DIcon type="bell" className="h-9 w-9" />}
          title="사용 기한 알림"
          description="크레딧 만료 전 ThinQ 알림으로 다시 안내받을 수 있습니다."
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2">
        <button
          className="h-12 rounded-xl border border-lgred/20 bg-white text-sm font-bold text-lgred"
          onClick={onReturnHome}
        >
          <span className="inline-flex items-center gap-2">
            <Home size={17} />
            홈으로
          </span>
        </button>
        <button className="h-12 rounded-xl bg-lgred text-sm font-bold text-white" onClick={onUseCredit}>
          크레딧으로 구매하기
        </button>
      </div>
    </>
  );
}

function ReReviewForm({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: () => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <>
      <div className="flex items-center gap-2 text-sm font-bold text-lgred">
        <AlertCircle size={18} />
        재검수 요청
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        감정 결과를 다시 확인받고 싶다면 사유를 작성해 재검수를 요청할 수 있습니다.
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-ink">
          <MessageSquare size={17} />
          재검수 사유
        </div>
        <textarea
          className="h-40 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-ink outline-none focus:border-lgred"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="예: 실제 외관 상태보다 낮게 평가된 것 같습니다."
        />
      </div>

      <button
        className="mt-auto h-12 rounded-xl bg-lgred text-sm font-bold text-white disabled:bg-slate-300"
        disabled={reason.trim().length < 5}
        onClick={onSubmit}
      >
        <span className="inline-flex items-center gap-2">
          <Send size={17} />
          재검수 요청하기
        </span>
      </button>
      <button className="mt-2 h-11 rounded-xl bg-slate-100 text-sm font-bold text-slate-500" onClick={onBack}>
        취소
      </button>
    </>
  );
}

function ValuationReason({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-sm font-bold text-ink">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function ReviewRow({
  done = false,
  icon,
  title,
  description,
}: {
  done?: boolean;
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-3 rounded-2xl bg-slate-50 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center">
        {icon}
      </span>
      <div>
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}
