import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeChartImage = async (imageBuffer) => {
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const prompt = `
You are a professional trading mentor.

Analyze the uploaded trading chart image.

Return ONLY valid JSON:
{
  "market_bias": "",
  "trade_score": 0,
  "observations": [],
  "mistakes": [],
  "suggestions": []
}
`;

  const result = await model.generateContent([
    prompt,
    {
      inlineData: {
        data: imageBuffer.toString("base64"),
        mimeType: "image/png",
      },
    },
  ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/```json|```/g, "");
    return JSON.parse(cleaned);

};
