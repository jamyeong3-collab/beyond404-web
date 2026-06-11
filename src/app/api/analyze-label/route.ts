import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LABEL_PROMPT = `가전제품 라벨/스티커 사진에서 텍스트를 읽어줘. JSON 형식으로만 답해줘. 다른 말은 하지 말고 JSON만 출력해.
사진에 보이는 텍스트만 그대로 읽어서 반환해. 추측하거나 지어내지 말 것.

읽을 항목:
1. brand: 라벨에 표기된 제조사. (예: "LG", "SAMSUNG", "삼성") 없으면 null.
2. modelName: 모델번호/모델명. 보통 영문+숫자 조합. (예: "MS2342DB", "GN-B813SQCL", "FHP1411Z9P") 없으면 null.
3. manufacturingDate: 제조년월. (예: "2021.03", "2021년 3월") 없으면 null.

반드시 아래 형식만 출력:
{
  "brand": "LG",
  "modelName": "MS2342DB",
  "manufacturingDate": "2021.03"
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
            { type: "text", text: LABEL_PROMPT },
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
      max_tokens: 200,
    });

    const raw = response.choices[0].message.content?.trim() ?? "{}";
    const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
    const result = JSON.parse(clean);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Label analyze error]", error);
    return NextResponse.json({ error: "라벨 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
