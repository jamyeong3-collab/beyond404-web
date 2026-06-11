import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const PROMPT = `아래 가전제품 사진을 분석해서 정확히 JSON 형식으로만 답해줘. 다른 말은 하지 말고 JSON만 출력해.

분석할 항목:
1. applianceType: 가전 종류 (예: "냉장고", "세탁기", "에어컨", "전자레인지", "TV")
2. brand: 제조사 브랜드 (예: "LG", "삼성", "위니아" 등, 모르면 null)
3. modelName: 모델명. 아래 순서로 시도:
   방법A - 전면 OCR: 제품 어디든 보이는 모든 텍스트(라벨, 버튼 글씨, 시리즈명, 용량 표기 등)를 읽어서 모델 코드 추출
   방법B - 시리즈/라인업 추정: 외형·색상·버튼 배치·로고·브랜드를 종합해 구체적 시리즈명이나 라인업명 반환 (예: "MS2342DB", "스탠바이미 Go M1", "그랑데AI F21VDW" 등)
   방법C - 모델 코드를 알 수 없는 경우: 전면에서 읽히는 시리즈 문구나 라인업명을 그대로 반환 (예: "스마트인버터 타고스트로", "오브제컬렉션 냉장고")
   위 셋 모두 불가능할 때만 null. 임의 코드 지어내기 금지, 단 시리즈명·마케팅명 반환은 허용.
4. capacity: 모델명을 인식했다면 해당 모델의 실제 용량/스펙을 반환. (예: 냉장고 "813L", 세탁기 "12kg", 에어컨 "1.5톤", TV "55인치") 모델명 모르거나 확신 없으면 null.
5. size: 제품 크기 등급. 반드시 다음 중 하나만: "소형" | "중형" | "대형"
   - capacity를 확인했으면 그 수치 기반으로 판단
   - capacity 모르면 사진의 시각적 크기로 추정
6. sizeSource: size를 어떻게 판단했는지. 반드시 다음 중 하나만: "model_spec" | "visual_estimate"
   - model_spec: 모델명 기반 실제 스펙으로 판단
   - visual_estimate: 시각적 추정
7. estimatedAge: 예상 연식. 반드시 다음 중 하나만: "1년 미만" | "1~3년" | "3년 이상" | "5년 이상" | "10년 이상"
8. conditionGrade: 외관 상태. 반드시 다음 중 하나만: "매우 좋음" | "양호" | "보통" | "파손 있음"
9. conditionDetail: 외관 상태 한 줄 설명 (한국어, 20자 이내)
10. confidence: 전체 인식 신뢰도 (0~100 정수)

반드시 아래 형식만 출력:
{
  "applianceType": "냉장고",
  "brand": "LG",
  "modelName": "GN-B813SQCL",
  "capacity": "813L",
  "size": "대형",
  "sizeSource": "model_spec",
  "estimatedAge": "3년 이상",
  "conditionGrade": "양호",
  "conditionDetail": "경미한 흠집 있지만 전반적으로 양호",
  "confidence": 78
}`;

export async function POST(request: NextRequest) {
  try {
    const { image } = (await request.json()) as { image: string };

    if (!image) {
      return NextResponse.json({ error: "이미지가 없습니다." }, { status: 400 });
    }

    const base64Image = image.replace(/^data:image\/[a-z+]+;base64,/, "");

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const raw = response.choices[0].message.content?.trim() ?? "{}";
    const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(clean);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[VLM analyze error]", error);
    return NextResponse.json({ error: "분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
