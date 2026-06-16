"use client";

import { Service3DIcon } from "@/components/Service3DIcon";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export type ProductCategoryId =
  | "washing_machine"
  | "refrigerator"
  | "air_conditioner"
  | "microwave"
  | "tv"
  | "air_purifier";

export type ProductId = string;
export type ProductGrade = "프리미엄" | "일반/중형" | "보급형";

export type ReplacementProduct = {
  id: ProductId;
  categoryId: ProductCategoryId;
  category: string;
  name: string;
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
};

type PurchasePanelProps = {
  estimatedCredit: number;
  preferredCategoryId: ProductCategoryId;
  selectedProductId: ProductId | null;
  onSelectProduct: (productId: ProductId) => void;
  onContinueToBooking: () => void;
};

type CategoryDefinition = {
  id: ProductCategoryId;
  label: string;
  serviceInfo: string;
  products: Array<Omit<ReplacementProduct, "id" | "categoryId" | "category" | "serviceInfo"> & { slug: string }>;
};

const applianceCategories: CategoryDefinition[] = [
  {
    id: "washing_machine",
    label: "세탁기",
    serviceInfo: "설치 예약 단계에서 기존 세탁기 수거와 새 제품 설치 일정을 함께 확인해요.",
    products: [
      {
        slug: "objet-ai",
        name: "LG 오브제컬렉션 AI 세탁기",
        grade: "프리미엄",
        originalPrice: 2090000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=900&q=80",
        summary: "AI DD와 대용량 코스로 세탁량이 많은 집에 잘 맞아요.",
        detail: "대용량 세탁, 의류 손상 완화, 자동 코스 추천을 중심으로 비교하기 좋은 모델이에요.",
        recommendedFor: "가족 세탁량이 많거나 이불, 수건을 자주 세탁하는 집에 추천해요.",
        highlights: ["AI DD가 세탁물 특성에 맞춰 움직여요", "대용량 코스로 세탁 빈도를 줄일 수 있어요", "오브제컬렉션 톤으로 인테리어와 잘 맞아요"],
        specs: [
          { label: "용량", value: "25kg" },
          { label: "주요 기능", value: "AI DD" },
          { label: "제품군", value: "오브제컬렉션" },
        ],
        tags: ["25kg", "AI DD", "오브제컬렉션"],
      },
      {
        slug: "tromm-steam",
        name: "LG 트롬 스팀 세탁기",
        grade: "프리미엄",
        originalPrice: 1740000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=900&q=80",
        summary: "스팀 케어와 표준 세탁 성능을 함께 챙길 수 있어요.",
        detail: "위생 세탁, 셔츠 관리, 아기 옷 세탁처럼 섬세한 관리가 필요한 집에 어울리는 모델이에요.",
        recommendedFor: "세탁 위생과 의류 관리를 같이 보고 싶은 사용자에게 추천해요.",
        highlights: ["스팀 케어로 위생 관리에 좋아요", "표준 코스가 안정적이에요", "드럼 교체 수요에 잘 맞아요"],
        specs: [
          { label: "용량", value: "21kg" },
          { label: "주요 기능", value: "스팀" },
          { label: "설치", value: "드럼형" },
        ],
        tags: ["21kg", "스팀", "트롬"],
      },
      {
        slug: "wash-tower",
        name: "LG 워시타워 컴팩트",
        grade: "프리미엄",
        originalPrice: 2590000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=900&q=80",
        summary: "세탁기와 건조기 공간을 한 번에 정리하기 좋아요.",
        detail: "세탁과 건조 동선을 줄이고 싶거나 세탁실을 깔끔하게 구성하고 싶은 경우에 잘 맞아요.",
        recommendedFor: "세탁실 공간을 효율적으로 쓰고 싶은 집에 추천해요.",
        highlights: ["세탁과 건조를 세로 배치로 정리해요", "조작부 접근성이 좋아요", "설치 공간 확인이 중요해요"],
        specs: [
          { label: "구성", value: "세탁+건조" },
          { label: "주요 기능", value: "일체형" },
          { label: "제품군", value: "워시타워" },
        ],
        tags: ["워시타워", "세탁+건조", "공간 절약"],
      },
      {
        slug: "top-loader",
        name: "LG 통돌이 세탁기",
        grade: "일반/중형",
        originalPrice: 830000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80",
        summary: "익숙한 상부 투입 방식으로 부담 없이 교체할 수 있어요.",
        detail: "기존 통돌이 세탁기를 쓰던 사용자가 조작 방식 변화 없이 교체하기 좋은 모델이에요.",
        recommendedFor: "간단하고 익숙한 세탁 방식을 선호하는 집에 추천해요.",
        highlights: ["상부 투입 방식이라 사용이 익숙해요", "가격 부담이 비교적 낮아요", "기본 세탁 성능이 안정적이에요"],
        specs: [
          { label: "용량", value: "18kg" },
          { label: "방식", value: "통돌이" },
          { label: "등급", value: "중형" },
        ],
        tags: ["18kg", "통돌이", "중형"],
      },
      {
        slug: "mini-washer",
        name: "LG 미니워시",
        grade: "보급형",
        originalPrice: 620000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=900&q=80",
        summary: "속옷, 아기 옷, 소량 세탁을 분리해서 관리할 수 있어요.",
        detail: "메인 세탁기와 함께 쓰거나 소량 세탁이 잦은 생활 패턴에 맞는 보조 세탁기예요.",
        recommendedFor: "소량 세탁을 자주 나누어 하는 사용자에게 추천해요.",
        highlights: ["분리 세탁이 쉬워요", "작은 공간에 배치하기 좋아요", "보조 세탁기로 활용도가 높아요"],
        specs: [
          { label: "용량", value: "4kg" },
          { label: "방식", value: "미니" },
          { label: "용도", value: "분리 세탁" },
        ],
        tags: ["4kg", "미니워시", "분리 세탁"],
      },
    ],
  },
  {
    id: "refrigerator",
    label: "냉장고",
    serviceInfo: "대형 제품이라 설치 공간과 동선을 먼저 확인하고, 수거와 설치 방문을 함께 진행해요.",
    products: [
      {
        slug: "dios-objet",
        name: "LG DIOS 오브제컬렉션 냉장고",
        grade: "프리미엄",
        originalPrice: 2890000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=900&q=80",
        summary: "대형 보관 용량과 정돈된 디자인을 같이 볼 수 있어요.",
        detail: "냉장/냉동 공간을 넉넉하게 쓰고 싶은 집에 잘 맞는 프리미엄 모델이에요.",
        recommendedFor: "식재료 보관량이 많거나 주방 가전을 통일하고 싶은 집에 추천해요.",
        highlights: ["832L 대용량으로 보관 공간이 넉넉해요", "노크온 기능으로 문 열림을 줄일 수 있어요", "DIOS 라인으로 교체 수요에 잘 맞아요"],
        specs: [
          { label: "용량", value: "832L" },
          { label: "주요 기능", value: "노크온" },
          { label: "제품군", value: "DIOS" },
        ],
        tags: ["832L", "노크온", "DIOS"],
      },
      {
        slug: "kimchi-stand",
        name: "LG DIOS 김치톡톡 스탠드형",
        grade: "프리미엄",
        originalPrice: 1980000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=900&q=80",
        summary: "김치와 식재료를 분리 보관하기 좋은 스탠드형 제품이에요.",
        detail: "김치 보관량이 많거나 일반 냉장고와 별도로 보관 온도를 관리하고 싶을 때 적합해요.",
        recommendedFor: "김치, 장류, 식재료를 별도 보관하는 집에 추천해요.",
        highlights: ["칸별 보관이 편해요", "김치 숙성 관리에 좋아요", "주방 보조 냉장고로 쓰기 좋아요"],
        specs: [
          { label: "용량", value: "402L" },
          { label: "타입", value: "스탠드형" },
          { label: "용도", value: "김치 보관" },
        ],
        tags: ["402L", "김치톡톡", "스탠드형"],
      },
      {
        slug: "objet-4door",
        name: "LG 오브제컬렉션 4도어 냉장고",
        grade: "프리미엄",
        originalPrice: 3190000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=900&q=80",
        summary: "대형 4도어 구성으로 식재료를 분리 보관하기 좋아요.",
        detail: "넓은 냉장실과 분리 수납이 필요한 가구에 맞춘 대형 프리미엄 냉장고예요.",
        recommendedFor: "가족 구성원이 많고 장보기 주기가 긴 집에 추천해요.",
        highlights: ["4도어로 수납 구분이 쉬워요", "오브제 색상 선택지가 넓어요", "대형 주방과 잘 어울려요"],
        specs: [
          { label: "용량", value: "875L" },
          { label: "도어", value: "4도어" },
          { label: "제품군", value: "오브제" },
        ],
        tags: ["875L", "4도어", "오브제"],
      },
      {
        slug: "slim-fridge",
        name: "LG 슬림 냉장고",
        grade: "일반/중형",
        originalPrice: 1190000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1567016526105-22da7c13161a?w=900&q=80",
        summary: "좁은 주방이나 1~2인 가구에 맞는 슬림형 냉장고예요.",
        detail: "설치 폭이 제한적인 공간에서도 기본 냉장/냉동 기능을 안정적으로 사용할 수 있어요.",
        recommendedFor: "원룸, 오피스텔, 소형 주방에 추천해요.",
        highlights: ["좁은 공간에 배치하기 좋아요", "기본 기능 중심으로 부담이 낮아요", "1~2인 가구에 맞아요"],
        specs: [
          { label: "용량", value: "342L" },
          { label: "타입", value: "슬림형" },
          { label: "가구", value: "1~2인" },
        ],
        tags: ["342L", "슬림", "소형"],
      },
      {
        slug: "top-freezer",
        name: "LG 일반형 냉장고",
        grade: "보급형",
        originalPrice: 760000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=900&q=80",
        summary: "기본 냉장 기능 중심으로 합리적인 교체가 가능해요.",
        detail: "큰 부가 기능보다 기본 보관 성능과 가격 균형을 우선하는 사용자에게 맞아요.",
        recommendedFor: "가격 부담을 줄이면서 냉장고를 교체하려는 집에 추천해요.",
        highlights: ["기본 냉장 기능에 집중했어요", "가격 부담이 낮아요", "빠른 교체 수요에 좋아요"],
        specs: [
          { label: "용량", value: "300L" },
          { label: "타입", value: "일반형" },
          { label: "등급", value: "보급형" },
        ],
        tags: ["300L", "일반형", "보급형"],
      },
    ],
  },
  {
    id: "air_conditioner",
    label: "에어컨",
    serviceInfo: "설치 환경에 따라 배관과 실외기 위치 확인이 필요하고, 기존 제품 수거와 새 제품 설치를 함께 안내해요.",
    products: [
      {
        slug: "whisen-wall",
        name: "LG 휘센 벽걸이 에어컨",
        grade: "일반/중형",
        originalPrice: 890000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=900&q=80",
        summary: "작은 방이나 거실 보조 냉방용으로 부담 없이 고를 수 있어요.",
        detail: "기존 소형 에어컨 수거 후 빠르게 설치 예약을 이어가기 좋은 벽걸이형 모델이에요.",
        recommendedFor: "방 하나를 집중 냉방하거나 보조 냉방 제품이 필요한 집에 추천해요.",
        highlights: ["듀얼 인버터로 전력 사용을 관리해요", "1.5룸급 공간에 잘 맞아요", "여름철 교체 수요에 적합해요"],
        specs: [
          { label: "냉방", value: "1.5룸" },
          { label: "방식", value: "벽걸이" },
          { label: "제품군", value: "휘센" },
        ],
        tags: ["벽걸이", "인버터", "휘센"],
      },
      {
        slug: "whisen-tower",
        name: "LG 휘센 타워 에어컨",
        grade: "프리미엄",
        originalPrice: 2750000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1551524164-6cf2ac6d7d0c?w=900&q=80",
        summary: "거실 중심 냉방과 공기 흐름을 함께 고려한 모델이에요.",
        detail: "거실 면적이 넓고 디자인 일체감을 중요하게 보는 사용자에게 적합해요.",
        recommendedFor: "거실 냉방 성능을 가장 우선하는 집에 추천해요.",
        highlights: ["넓은 거실 냉방에 적합해요", "타워형 디자인으로 존재감이 좋아요", "설치 공간 확인이 중요해요"],
        specs: [
          { label: "타입", value: "스탠드" },
          { label: "공간", value: "거실" },
          { label: "제품군", value: "휘센" },
        ],
        tags: ["타워", "거실", "프리미엄"],
      },
      {
        slug: "dual-inverter",
        name: "LG 듀얼 인버터 에어컨",
        grade: "일반/중형",
        originalPrice: 1320000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1560185008-b033106af5c3?w=900&q=80",
        summary: "냉방 효율과 가격 균형을 함께 볼 수 있어요.",
        detail: "과한 프리미엄 기능보다 냉방 효율과 기본 성능을 우선하는 경우에 좋아요.",
        recommendedFor: "에너지 효율을 보면서 합리적인 가격대를 찾는 사용자에게 추천해요.",
        highlights: ["인버터 기반으로 효율을 챙겨요", "가격대가 비교적 안정적이에요", "가정용 교체 수요에 무난해요"],
        specs: [
          { label: "기능", value: "듀얼 인버터" },
          { label: "타입", value: "벽걸이" },
          { label: "등급", value: "중형" },
        ],
        tags: ["듀얼 인버터", "중형", "효율"],
      },
      {
        slug: "portable",
        name: "LG 이동식 에어컨",
        grade: "보급형",
        originalPrice: 690000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1615873968403-89e068629265?w=900&q=80",
        summary: "실외기 설치가 부담스러운 공간에서 활용할 수 있어요.",
        detail: "전월세나 설치 제약이 있는 공간에서 비교적 간단하게 냉방을 보완할 수 있는 제품이에요.",
        recommendedFor: "배관 공사가 어려운 공간에 추천해요.",
        highlights: ["이동 배치가 가능해요", "설치 부담이 낮아요", "보조 냉방으로 적합해요"],
        specs: [
          { label: "타입", value: "이동식" },
          { label: "설치", value: "간편" },
          { label: "용도", value: "보조" },
        ],
        tags: ["이동식", "간편 설치", "보조 냉방"],
      },
      {
        slug: "system",
        name: "LG 시스템 에어컨",
        grade: "프리미엄",
        originalPrice: 3490000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=80",
        summary: "천장형 설치로 공간을 깔끔하게 쓰기 좋은 제품이에요.",
        detail: "인테리어와 냉방 동선을 함께 고려해야 하는 집이나 사무 공간에 적합해요.",
        recommendedFor: "천장형 설치가 가능한 신축 또는 리모델링 공간에 추천해요.",
        highlights: ["공간을 깔끔하게 유지해요", "복수 공간 냉방에 유리해요", "사전 설치 상담이 필요해요"],
        specs: [
          { label: "타입", value: "천장형" },
          { label: "설치", value: "상담 필요" },
          { label: "등급", value: "프리미엄" },
        ],
        tags: ["시스템", "천장형", "상담 필요"],
      },
    ],
  },
  {
    id: "microwave",
    label: "전자레인지",
    serviceInfo: "소형 가전은 배송 설치 부담이 적고, 기존 제품은 수거 예약 단계에서 함께 확인해요.",
    products: [
      {
        slug: "objet-mwave",
        name: "LG 오브제컬렉션 전자레인지",
        grade: "프리미엄",
        originalPrice: 329000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?w=900&q=80",
        summary: "주방 톤을 맞추면서 기본 조리 기능을 쓰기 좋아요.",
        detail: "간단 조리, 데우기, 해동을 자주 쓰는 주방에 맞는 오브제 라인 제품이에요.",
        recommendedFor: "주방 소형가전 디자인을 통일하고 싶은 사용자에게 추천해요.",
        highlights: ["오브제 톤으로 주방에 잘 어울려요", "기본 조리 기능이 충분해요", "소형 가전 교체가 쉬워요"],
        specs: [
          { label: "용량", value: "23L" },
          { label: "타입", value: "일반형" },
          { label: "제품군", value: "오브제" },
        ],
        tags: ["23L", "오브제", "전자레인지"],
      },
      {
        slug: "lightwave",
        name: "LG 광파오븐",
        grade: "프리미엄",
        originalPrice: 720000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=900&q=80",
        summary: "전자레인지와 오븐 기능을 함께 쓰고 싶을 때 좋아요.",
        detail: "데우기뿐 아니라 구이, 베이킹, 간편 조리를 함께 쓰는 사용자에게 맞아요.",
        recommendedFor: "간단한 홈쿡과 오븐 조리를 자주 하는 집에 추천해요.",
        highlights: ["오븐 기능까지 함께 써요", "조리 활용도가 높아요", "주방 공간을 줄일 수 있어요"],
        specs: [
          { label: "용량", value: "32L" },
          { label: "기능", value: "광파" },
          { label: "타입", value: "복합형" },
        ],
        tags: ["광파", "오븐", "복합형"],
      },
      {
        slug: "solo-compact",
        name: "LG 컴팩트 전자레인지",
        grade: "보급형",
        originalPrice: 169000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=900&q=80",
        summary: "작은 주방에서 기본 데우기 기능을 쓰기 좋아요.",
        detail: "공간과 예산 부담을 낮추면서 기본 전자레인지 기능을 사용할 수 있는 제품이에요.",
        recommendedFor: "원룸, 오피스텔, 서브 주방에 추천해요.",
        highlights: ["공간을 적게 차지해요", "가격 부담이 낮아요", "기본 기능 중심이에요"],
        specs: [
          { label: "용량", value: "20L" },
          { label: "타입", value: "컴팩트" },
          { label: "등급", value: "보급형" },
        ],
        tags: ["20L", "컴팩트", "보급형"],
      },
      {
        slug: "grill",
        name: "LG 그릴 전자레인지",
        grade: "일반/중형",
        originalPrice: 420000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1586208958839-06c17cacdf08?w=900&q=80",
        summary: "간단한 그릴 조리까지 함께 활용할 수 있어요.",
        detail: "데우기와 함께 토스트, 간단 구이처럼 조리 범위를 넓히고 싶은 사용자에게 맞아요.",
        recommendedFor: "전자레인지 하나로 다양한 간편 조리를 하고 싶은 집에 추천해요.",
        highlights: ["그릴 조리를 지원해요", "간편식 활용도가 높아요", "중형 주방에 잘 맞아요"],
        specs: [
          { label: "용량", value: "25L" },
          { label: "기능", value: "그릴" },
          { label: "등급", value: "중형" },
        ],
        tags: ["그릴", "25L", "간편 조리"],
      },
      {
        slug: "steam-oven",
        name: "LG 스팀 오븐레인지",
        grade: "프리미엄",
        originalPrice: 890000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=900&q=80",
        summary: "스팀과 오븐 기능까지 갖춘 고급형 주방 가전이에요.",
        detail: "찜, 구이, 데우기, 오븐 조리를 다양하게 쓰고 싶은 사용자에게 적합해요.",
        recommendedFor: "요리를 자주 하고 조리 품질을 중요하게 보는 집에 추천해요.",
        highlights: ["스팀 조리를 지원해요", "오븐 활용도가 높아요", "프리미엄 주방에 잘 맞아요"],
        specs: [
          { label: "용량", value: "34L" },
          { label: "기능", value: "스팀" },
          { label: "타입", value: "오븐레인지" },
        ],
        tags: ["스팀", "오븐", "34L"],
      },
    ],
  },
  {
    id: "tv",
    label: "TV",
    serviceInfo: "벽걸이 설치 여부와 기존 TV 수거 방식을 설치 예약 단계에서 함께 확인해요.",
    products: [
      {
        slug: "oled-evo",
        name: "LG OLED evo TV",
        grade: "프리미엄",
        originalPrice: 3490000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=900&q=80",
        summary: "화질과 얇은 디자인을 가장 우선할 때 좋은 모델이에요.",
        detail: "영화, 스포츠, 게임처럼 몰입감 있는 화면 품질이 중요한 사용자에게 적합해요.",
        recommendedFor: "거실 메인 TV를 프리미엄으로 교체하려는 집에 추천해요.",
        highlights: ["OLED 화질을 경험할 수 있어요", "얇은 디자인이 강점이에요", "게임과 영화에 잘 맞아요"],
        specs: [
          { label: "크기", value: "65형" },
          { label: "패널", value: "OLED" },
          { label: "등급", value: "프리미엄" },
        ],
        tags: ["65형", "OLED", "evo"],
      },
      {
        slug: "qned",
        name: "LG QNED TV",
        grade: "프리미엄",
        originalPrice: 2490000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1601944179066-29786cb9d32a?w=900&q=80",
        summary: "밝은 거실에서도 선명한 화면을 보기 좋아요.",
        detail: "대형 화면과 밝기, 색 표현을 함께 고려하는 사용자에게 맞는 모델이에요.",
        recommendedFor: "낮에도 TV 시청이 많은 거실에 추천해요.",
        highlights: ["밝은 화면 표현이 좋아요", "대형 거실에 어울려요", "화질과 가격 균형이 좋아요"],
        specs: [
          { label: "크기", value: "75형" },
          { label: "패널", value: "QNED" },
          { label: "용도", value: "거실" },
        ],
        tags: ["75형", "QNED", "대형"],
      },
      {
        slug: "uhd",
        name: "LG UHD TV",
        grade: "일반/중형",
        originalPrice: 1290000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1586899028174-e7098604235b?w=900&q=80",
        summary: "기본 4K 화질 중심으로 부담 없이 교체할 수 있어요.",
        detail: "OTT, 방송, 콘솔 연결 등 기본 사용을 안정적으로 처리하는 중형 TV예요.",
        recommendedFor: "가격과 화면 크기의 균형을 보고 싶은 사용자에게 추천해요.",
        highlights: ["4K 기본 화질을 제공해요", "가격 부담이 낮아요", "가정용 메인 TV로 무난해요"],
        specs: [
          { label: "크기", value: "55형" },
          { label: "화질", value: "4K UHD" },
          { label: "등급", value: "중형" },
        ],
        tags: ["55형", "4K", "UHD"],
      },
      {
        slug: "smart-monitor",
        name: "LG 스마트 모니터 TV",
        grade: "보급형",
        originalPrice: 590000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=900&q=80",
        summary: "방, 서재, 작은 공간에서 TV와 모니터를 겸용하기 좋아요.",
        detail: "업무 모니터와 OTT 시청 기기를 하나로 줄이고 싶은 사용자에게 적합해요.",
        recommendedFor: "서브 TV나 방 안 디스플레이가 필요한 집에 추천해요.",
        highlights: ["모니터와 TV를 겸용할 수 있어요", "작은 공간에 잘 맞아요", "가격 부담이 낮아요"],
        specs: [
          { label: "크기", value: "32형" },
          { label: "용도", value: "겸용" },
          { label: "등급", value: "보급형" },
        ],
        tags: ["32형", "스마트", "겸용"],
      },
      {
        slug: "standbyme",
        name: "LG 스탠바이미",
        grade: "프리미엄",
        originalPrice: 1170000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1616469829581-73993eb86b02?w=900&q=80",
        summary: "이동하면서 쓰는 개인형 화면으로 활용도가 높아요.",
        detail: "침실, 주방, 거실을 오가며 개인 콘텐츠를 보는 사용자에게 맞는 이동형 디스플레이예요.",
        recommendedFor: "공간을 옮겨가며 콘텐츠를 보는 사용자에게 추천해요.",
        highlights: ["이동형 사용이 가능해요", "개인 콘텐츠 시청에 좋아요", "선물용 수요도 높아요"],
        specs: [
          { label: "크기", value: "27형" },
          { label: "타입", value: "이동형" },
          { label: "제품군", value: "스탠바이미" },
        ],
        tags: ["27형", "이동형", "스탠바이미"],
      },
    ],
  },
  {
    id: "air_purifier",
    label: "공기청정기",
    serviceInfo: "소형 설치 제품이라 배송 후 기존 제품 수거 여부를 예약 단계에서 함께 확인해요.",
    products: [
      {
        slug: "puricare-360",
        name: "LG 퓨리케어 360 공기청정기",
        grade: "프리미엄",
        originalPrice: 1390000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=900&q=80",
        summary: "넓은 공간 공기 관리를 한 대로 커버하기 좋아요.",
        detail: "거실이나 넓은 생활 공간에서 공기 흐름과 청정 성능을 함께 보고 싶은 사용자에게 맞아요.",
        recommendedFor: "거실 중심으로 공기 관리를 하고 싶은 집에 추천해요.",
        highlights: ["360도 청정이 가능해요", "넓은 공간에 적합해요", "프리미엄 공기청정 라인이에요"],
        specs: [
          { label: "면적", value: "100㎡" },
          { label: "타입", value: "360" },
          { label: "제품군", value: "퓨리케어" },
        ],
        tags: ["360", "100㎡", "퓨리케어"],
      },
      {
        slug: "puricare-pet",
        name: "LG 퓨리케어 펫 공기청정기",
        grade: "프리미엄",
        originalPrice: 1190000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&q=80",
        summary: "반려동물 털과 냄새 관리까지 고려한 모델이에요.",
        detail: "반려동물과 함께 사는 집에서 공기청정과 냄새 관리를 같이 챙기기 좋아요.",
        recommendedFor: "반려동물이 있는 가구에 추천해요.",
        highlights: ["펫 필터 구성이 강점이에요", "냄새 관리에 좋아요", "거실 배치에 잘 맞아요"],
        specs: [
          { label: "면적", value: "66㎡" },
          { label: "특화", value: "펫" },
          { label: "필터", value: "탈취" },
        ],
        tags: ["펫", "탈취", "66㎡"],
      },
      {
        slug: "aero-tower",
        name: "LG 에어로타워",
        grade: "프리미엄",
        originalPrice: 1290000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=900&q=80",
        summary: "공기청정과 송풍을 함께 쓰는 타워형 제품이에요.",
        detail: "공기 관리와 실내 순환 바람을 함께 고려하는 사용자에게 맞는 모델이에요.",
        recommendedFor: "계절과 관계없이 실내 공기 순환을 원하는 집에 추천해요.",
        highlights: ["타워형 디자인이 깔끔해요", "송풍 기능을 함께 써요", "거실 인테리어와 잘 맞아요"],
        specs: [
          { label: "타입", value: "타워형" },
          { label: "기능", value: "송풍" },
          { label: "제품군", value: "에어로타워" },
        ],
        tags: ["에어로타워", "송풍", "프리미엄"],
      },
      {
        slug: "mini",
        name: "LG 퓨리케어 미니",
        grade: "보급형",
        originalPrice: 290000,
        sameDayEligible: true,
        imageUrl: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=900&q=80",
        summary: "방, 책상, 작은 공간에 두기 좋은 소형 공기청정기예요.",
        detail: "개인 공간이나 작은 방에서 간편하게 공기 관리를 시작하기 좋은 모델이에요.",
        recommendedFor: "방마다 작은 청정기를 두고 싶은 사용자에게 추천해요.",
        highlights: ["작은 공간에 잘 맞아요", "이동과 배치가 쉬워요", "가격 부담이 낮아요"],
        specs: [
          { label: "타입", value: "소형" },
          { label: "공간", value: "방" },
          { label: "등급", value: "보급형" },
        ],
        tags: ["소형", "방", "미니"],
      },
      {
        slug: "humidifying",
        name: "LG 가습 공기청정기",
        grade: "일반/중형",
        originalPrice: 820000,
        sameDayEligible: false,
        imageUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=900&q=80",
        summary: "건조한 계절에 공기청정과 가습을 함께 챙길 수 있어요.",
        detail: "겨울철 건조함과 미세먼지 관리를 동시에 고민하는 집에 적합해요.",
        recommendedFor: "건조함이 불편한 집이나 아이 방에 추천해요.",
        highlights: ["가습 기능을 함께 제공해요", "겨울철 활용도가 높아요", "아이 방 공기 관리에 좋아요"],
        specs: [
          { label: "기능", value: "가습" },
          { label: "타입", value: "복합형" },
          { label: "등급", value: "중형" },
        ],
        tags: ["가습", "복합형", "중형"],
      },
    ],
  },
];

export const purchaseProducts: ReplacementProduct[] = applianceCategories.flatMap((category) =>
  category.products.map(({ slug, ...product }) => ({
    ...product,
    id: `${category.id}-${slug}`,
    categoryId: category.id,
    category: category.label,
    serviceInfo: category.serviceInfo,
  })),
);

export function getDefaultProductIdForCategory(categoryId: ProductCategoryId): ProductId | null {
  return purchaseProducts.find((product) => product.categoryId === categoryId)?.id ?? null;
}

function calculatePurchaseBenefit(baseCredit: number, productPrice: number) {
  const productPriceBonus = Math.round((productPrice * 0.03) / 1000) * 1000;
  const benefitCap = Math.round((productPrice * 0.15) / 1000) * 1000;
  return Math.min(baseCredit + productPriceBonus, benefitCap);
}

function categoryLabel(categoryId: ProductCategoryId) {
  return applianceCategories.find((category) => category.id === categoryId)?.label ?? "가전";
}

function getProductReviewMeta(product: ReplacementProduct) {
  const seed = product.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return {
    rating: (4.6 + (seed % 4) * 0.1).toFixed(1),
    reviewCount: 80 + (seed % 240),
  };
}

export function PurchasePanel({
  estimatedCredit,
  preferredCategoryId,
  selectedProductId,
  onSelectProduct,
  onContinueToBooking,
}: PurchasePanelProps) {
  const selectedProduct = purchaseProducts.find((product) => product.id === selectedProductId) ?? null;
  const [detailProduct, setDetailProduct] = useState<ReplacementProduct | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<"all" | ProductCategoryId>(preferredCategoryId);
  const selectedPurchaseBenefit = selectedProduct
    ? calculatePurchaseBenefit(estimatedCredit, selectedProduct.originalPrice)
    : 0;
  const selectedFinalPrice = selectedProduct
    ? Math.max(selectedProduct.originalPrice - selectedPurchaseBenefit, 0)
    : 0;
  const preferredCategoryLabel = categoryLabel(preferredCategoryId);
  const orderedCategories = [
    ...applianceCategories.filter((category) => category.id === preferredCategoryId),
    ...applianceCategories.filter((category) => category.id !== preferredCategoryId),
  ];
  const categoryOptions = [
    ...orderedCategories.map((category) => ({ id: category.id, label: category.label })),
    { id: "all" as const, label: "전체" },
  ];
  const visibleProducts =
    selectedCategoryId === "all"
      ? [
          ...purchaseProducts.filter((product) => product.categoryId === preferredCategoryId),
          ...purchaseProducts.filter((product) => product.categoryId !== preferredCategoryId),
        ]
      : purchaseProducts.filter((product) => product.categoryId === selectedCategoryId);

  useEffect(() => {
    setSelectedCategoryId(preferredCategoryId);
  }, [preferredCategoryId]);

  return (
    <section className="rounded-[28px] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
        <Service3DIcon type="shopping" className="h-7 w-7 shrink-0" />
        LG 교체 제품을 선택해요
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-500">
        수거 신청한 {preferredCategoryLabel}와 같은 카테고리를 먼저 보여드려요. 다른 가전 카테고리도 함께 비교할 수 있어요.
      </p>

      <div className="mt-4 rounded-3xl bg-[#202632] px-4 py-4 text-white">
        <p className="text-[13px] font-semibold leading-5 text-white/65">기본 예상 보상이에요</p>
        <p className="mt-1 text-[20px] font-bold leading-6">{estimatedCredit.toLocaleString()}원</p>
        <p className="mt-2 text-[13px] font-medium leading-5 text-white/70">
          최종 혜택은 선택한 제품 가격대에 따라 달라져요.
        </p>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-bold text-ink">가전제품 카테고리</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500">
            {visibleProducts.length}개
          </span>
        </div>
        <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {categoryOptions.map((category) => {
            const active = selectedCategoryId === category.id;

            return (
              <button
                key={category.id}
                className={`shrink-0 rounded-full px-3 py-2 text-[12px] font-bold transition ${
                  active ? "bg-lgred text-white shadow-sm" : "bg-slate-100 text-slate-600"
                }`}
                onClick={() => setSelectedCategoryId(category.id)}
                type="button"
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex snap-x snap-mandatory gap-3">
          {visibleProducts.map((product) => {
            const active = selectedProduct?.id === product.id;
            const purchaseBenefit = calculatePurchaseBenefit(estimatedCredit, product.originalPrice);
            const finalPrice = Math.max(product.originalPrice - purchaseBenefit, 0);
            const reviewMeta = getProductReviewMeta(product);

            return (
              <button
                key={product.id}
                className={`relative h-[348px] w-[212px] shrink-0 snap-start overflow-hidden rounded-3xl border-2 text-left transition ${
                  active
                    ? "border-[#d85f86] bg-[#fff6f9] shadow-[inset_0_0_0_1px_rgba(216,95,134,0.16)]"
                    : "border-slate-200 bg-slate-50 shadow-sm"
                }`}
                onClick={() => {
                  setDetailProduct(null);
                  onSelectProduct(product.id);
                }}
                type="button"
              >
                <div className="relative h-[132px] bg-[#eaf1ff]">
                  <img alt={product.name} className="h-full w-full object-cover" src={product.imageUrl} />
                  {active ? (
                    <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#c21855] shadow-sm ring-1 ring-[#f0bfd0]">
                      선택됨
                    </span>
                  ) : null}
                </div>
                <div className="p-3 pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-bold text-lgred">{product.category}</p>
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
                      {product.grade}
                    </span>
                  </div>
                  <h3 className="mt-2 line-clamp-3 min-h-[60px] text-[15px] font-bold leading-5 text-ink">{product.name}</h3>
                  <p className="mt-1 text-[11px] font-semibold leading-4 text-slate-500">
                    평점 {reviewMeta.rating} · 리뷰 {reviewMeta.reviewCount.toLocaleString()}개
                  </p>
                  <div className="mt-2 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">예상 결제</span>
                      <span className="text-[15px] font-bold leading-5 tabular-nums text-ink">
                        {finalPrice.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold text-slate-500">혜택</span>
                      <span className="text-[15px] font-bold leading-5 tabular-nums text-lgred">
                        {purchaseBenefit.toLocaleString()}원
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedProduct ? (
        <div className="mt-4 rounded-3xl border border-lgred/15 bg-lgred/5 p-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-lgred">
            <Service3DIcon type="check" className="h-7 w-7 shrink-0" />
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
