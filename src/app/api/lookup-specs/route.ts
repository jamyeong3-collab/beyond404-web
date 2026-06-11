import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { modelName } = (await request.json()) as { modelName: string };

    if (!modelName?.trim()) {
      return NextResponse.json({ error: "모델명이 없습니다." }, { status: 400 });
    }

    const prompt = `가전제품 모델명 "${modelName}"의 정보를 알려줘. JSON 형식으로만 답해줘. 다른 말은 하지 말고 JSON만 출력해.

각 항목 판단 기준:
1. applianceType: 모델 코드 패턴으로 가전 종류 추론. (예: "냉장고", "세탁기", "에어컨", "전자레인지", "TV")
2. brand: 모델 코드 패턴으로 제조사 추론.
   - LG 패턴: GN/GR(냉장고), F/WD/FH(세탁기), US/SQ(에어컨), MS/MW(전자레인지), OLED/UP(TV)
   - 삼성 패턴: RF/RS/RT/RB/RQ/RZ(냉장고), WW/WD(세탁기), AR(에어컨), MS/ME/MG(전자레인지), QN/UN(TV)
   - 위니아/대우 패턴: WRN/FRS(냉장고), DWD(세탁기)
   - 위 패턴에 없어도 알 수 있으면 반환. 정말 모를 때만 null.
3. capacity: 모델명에서 용량을 추론할 수 있으면 반환. 모델명 숫자가 용량을 나타내는 경우 많음.
   (예: MW23GD → "23L", GN-B813 → "813L", FHP1411 → "14kg")
   확신할 수 없으면 null.
4. size: capacity 기준으로 판단. capacity 모르면 null.
   - 냉장고: 300L 이하=소형, 300~600L=중형, 600L 초과=대형
   - 세탁기: 9kg 이하=소형, 9~16kg=중형, 16kg 초과=대형
   - 에어컨: 1톤 이하=소형, 1~2톤=중형, 2톤 초과=대형
   - 전자레인지: 20L 이하=소형, 20~30L=중형, 30L 초과=대형
   - TV: 43인치 이하=소형, 43~65인치=중형, 65인치 초과=대형
5. releaseYear: 알고 있을 때만. 모르면 null.
6. powerConsumption: 알고 있을 때만. 모르면 null.
7. weight_kg: 이 모델의 제품 본체 무게(kg). 알고 있을 때만 숫자로 반환. 모르면 null.
   (예: LG MW23GD → 12, LG GN-B813 → 102)

형식:
{
  "applianceType": "전자레인지",
  "brand": "LG",
  "capacity": "23L",
  "size": "중형",
  "releaseYear": 2022,
  "powerConsumption": "1000W",
  "weight_kg": 12
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    });

    const raw = response.choices[0].message.content?.trim() ?? "{}";
    const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(clean);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Lookup specs error]", error);
    return NextResponse.json({ error: "스펙 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
