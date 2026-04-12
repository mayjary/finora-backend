import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { trades } = req.body;

    if (!trades || trades.length === 0) {
      return res.status(400).json({
        error: "No trades provided",
      });
    }

    // 🔥 STRONG PROMPT
    const prompt = `
        You are an elite trading performance analyst.

        Analyze the user's trades and return EXACTLY 5 concise bullet points.

        Rules:
        - Each point should be 1 short sentence
        - No numbering
        - No headings
        - Focus on patterns, mistakes, strengths, improvements
        - Start each point with "• "

        Example:
        • Strong performance in trending markets
        • Losses occur during overtrading

        Trades:
        ${JSON.stringify(trades.slice(0, 20))}
        `;

    // 🔥 GEMINI API CALL
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      }
    );

    const data = await response.json();

    // 🔍 DEBUG (remove later if needed)
    console.log("Gemini RAW RESPONSE:", JSON.stringify(data, null, 2));

    // 🔥 SAFE PARSING
    let text = "";


    if (
    data?.candidates?.[0]?.content?.parts?.[0]?.text
    ) {
    text = data.candidates[0].content.parts[0].text;
    }

    // 🔥 CLEAN OUTPUT
    text = text
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.startsWith("•"))
    .join("\n");

    // fallback
    if (!text || text.trim() === "") {
    text = `• Not enough meaningful trade data
    • Add more diverse trades
    • Improve risk management
    • Track losses more carefully
    • Maintain consistency`;
    }

    // ✅ RETURN TO FRONTEND
    res.json({
      insights: text,
    });

  } catch (err) {
    console.error("Trade Insights Error:", err);

    res.status(500).json({
      error: "AI insights failed",
    });
  }
});

export default router;