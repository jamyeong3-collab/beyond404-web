# SwapIt 더미 데이터 연결 가이드

이 문서는 현재 더미(임시) 데이터로 처리된 항목들이 **실제 시스템과 합칠 때 어떻게 교체되어야 하는지** 설명합니다.
코드 충돌 방지 및 담당자 간 연결 포인트 공유를 위한 문서입니다.

---

## 현재 구조 요약

```
[사용자] 가전 촬영
    ↓
[LLM — GPT-4o Vision]
    전면 사진 → 가전 종류, 크기 등급, 외관 상태, 예상 연식
    스티커 OCR → 모델명, 브랜드
    모델명 조회 → 용량, 출시연도 보완
    ↓
[프론트 — CapturePanel.tsx]
    스크랩 가치 계산 (가전 종류 + 크기 등급 기반)
    신제품 연계 크레딧 계산 (현재 더미값 사용)
    ↓
[사용자] 최종 크레딧 확인
```

---

## 더미 항목 목록

### 1. 신제품 가격 및 등급

| 항목 | 현재 더미값 | 교체 방법 | 담당 |
|------|-----------|---------|------|
| 신제품 가격 | 1,000,000원 고정 | 사용자가 구매할 신제품 선택 시 해당 제품 가격으로 교체 | 프론트 |
| 신제품 등급 | 가격 기준 자동 분류 함수로 처리 (교체 불필요) | — | — |

**코드 위치:** `src/features/capture/CapturePanel.tsx`
```typescript
// 이 두 상수를 교체하면 됨
const DUMMY_NEW_PRODUCT = { price: 1_000_000, label: "일반 LG 가전 100만원" };
const DUMMY_SWAP_COUNT = 1;
```

**교체 시 전달받아야 할 데이터:**
```typescript
type NewProduct = {
  price: number;       // 신제품 실제 판매가
  name: string;        // 신제품명 (표시용)
}
```

---

### 2. 사용자 누적 이용 횟수 (swap_count)

| 항목 | 현재 더미값 | 교체 방법 | 담당 |
|------|-----------|---------|------|
| 이용 횟수 | `1` 고정 | 로그인된 사용자의 `users.swap_count` 조회 후 전달 | 백엔드 |

**코드 위치:** `src/features/capture/CapturePanel.tsx`
```typescript
const DUMMY_SWAP_COUNT = 1; // ← 이 값을 API에서 받아온 값으로 교체
```

**백엔드 DB 컬럼:**
```sql
users.swap_count INT DEFAULT 0
-- SwapIt 신청 완료(크레딧 발급) 시 +1 increment
```

**프론트에서 받아야 할 API 응답 예시:**
```json
{ "swapCount": 2 }
```

---

### 3. 제품 무게 (weight_kg)

| 항목 | 현재 더미값 | 교체 방법 | 담당 |
|------|-----------|---------|------|
| 무게 | 크기 등급별 평균값 테이블 | 모델명 → DB 조회로 실제 무게 반환 | 백엔드 |

**코드 위치:** `src/features/capture/CapturePanel.tsx`
```typescript
const APPLIANCE_WEIGHTS = {
  냉장고: { 소형: 35, 중형: 65, 대형: 100 },
  // ... 평균값 테이블
};
```

**교체 방향:**
- 현재: `가전 종류 + 크기 등급` → 평균 무게 테이블 조회
- 목표: `모델명` → 가전 스펙 DB 조회 → 실제 무게 반환
- DB 구조: `appliance_specs(model_name, appliance_type, weight_kg)` — 다나와 크롤링으로 수집 중

**교체 후 흐름:**
```
모델명 인식됨 → /api/specs?model=GN-B813SQCL → { weight_kg: 102 }
모델명 없음   → 기존 크기 등급 평균값 fallback 유지
```

---

## LLM이 처리하는 부분 vs 시스템이 처리해야 할 부분

| 항목 | 현재 처리 방식 | 목표 처리 방식 |
|------|-------------|-------------|
| 가전 종류 | GPT-4o Vision | 유지 |
| 크기 등급 | GPT-4o Vision + 스펙 조회 | 모델명 → DB 조회로 정확도 향상 |
| 외관 상태 | GPT-4o Vision | 유지 (시각 판단 불가피) |
| 모델명 | GPT-4o 스티커 OCR | 유지 |
| 무게 | 평균값 테이블 (더미) | 모델명 → DB |
| 신제품 가격 | 고정값 (더미) | 제품 카탈로그 or 사용자 입력 |
| 이용 횟수 | 1 고정 (더미) | 백엔드 `users.swap_count` |
| 최종 크레딧 계산 | 프론트에서 직접 계산 | 유지 or 백엔드 이관 가능 |

---

## 합칠 때 순서 권장

1. **백엔드** — `users.swap_count` API 엔드포인트 제공
2. **백엔드** — `appliance_specs` DB 구축 + 모델명 조회 API 제공
3. **프론트** — `DUMMY_SWAP_COUNT`를 API 응답값으로 교체
4. **프론트** — `DUMMY_NEW_PRODUCT`를 신제품 선택 UI와 연결
5. **프론트** — 모델명 있을 때 무게 DB 조회 추가 (없으면 기존 fallback 유지)

---

## 계산 로직 코드 위치

모든 계산 함수는 `src/features/capture/CapturePanel.tsx` 상단에 집중:

| 함수 | 역할 |
|------|------|
| `calculateScrapValue(applianceType, size)` | 스크랩 가치 계산 |
| `getNewProductTier(price)` | 신제품 등급 분류 |
| `calculateFinalCredit(...)` | 최종 크레딧 계산 |

자세한 계산 공식은 `docs/PRICING_RULES.md` 참조.
