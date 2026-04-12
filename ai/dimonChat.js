import express from "express";
import fetch from "node-fetch";
import { supabase } from "../lib/supabase.js";

const router = express.Router();

const SYSTEM_INSTRUCTION = `You are Dimon, Finora's AI trading assistant.

Behavior:
- Always give COMPLETE answers
- Never stop mid-sentence
- Be concise and efficient
- Prefer bullet points over paragraphs
- Focus only on actionable insights

Style:
- Maximum 5–6 bullet points
- Each point must be short (1 line)
- No long paragraphs
- No fluff

Rules:
- Do not guarantee profits
- Do not say you lack data
- Always use provided trade data

Goal:
Give sharp, actionable, personalized trading advice based on real user trades.`;

const MAX_USER_MSG = 2000;
const MAX_HISTORY_MESSAGES = 12;

router.post("/", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "Gemini API key not configured" });
    }

    const { messages, user_id } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }

    // =========================
    // CLEAN CHAT HISTORY
    // =========================
    const trimmed = messages
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        role: m.role === "model" ? "model" : "user",
        text: String(m.text || "").slice(0, MAX_USER_MSG),
      }))
      .filter((m) => m.text.trim().length > 0);

    const firstUserIdx = trimmed.findIndex((m) => m.role === "user");
    const fromUser = firstUserIdx >= 0 ? trimmed.slice(firstUserIdx) : trimmed;

    if (fromUser.length === 0 || fromUser[0].role !== "user") {
      return res.status(400).json({ error: "First message must be from the user" });
    }

    // =========================
    // FETCH USER TRADES
    // =========================
    let tradesText = "User has no trades.";

    if (user_id) {
      const { data: trades, error } = await supabase
        .from("trades")
        .select("symbol, trade_type, pnl")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false })
        .limit(15); // 🔥 reduced for better output

      if (error) {
        console.error("Supabase error:", error);
      }

      if (trades && trades.length > 0) {
        tradesText = trades
          .map((t) => `${t.symbol} ${t.trade_type} pnl:${t.pnl}`)
          .join("\n");
      }
    }

    // =========================
    // BASIC ANALYTICS
    // =========================
    let statsText = "";

    if (user_id) {
      const { data: statsTrades } = await supabase
        .from("trades")
        .select("pnl")
        .eq("user_id", user_id);

      if (statsTrades && statsTrades.length > 0) {
        const total = statsTrades.length;
        const wins = statsTrades.filter((t) => Number(t.pnl) > 0).length;
        const losses = statsTrades.filter((t) => Number(t.pnl) < 0).length;
        const totalPnL = statsTrades.reduce((acc, t) => acc + Number(t.pnl || 0), 0);

        statsText = `
Total Trades: ${total}
Wins: ${wins}
Losses: ${losses}
Win Rate: ${((wins / total) * 100).toFixed(1)}%
Total PnL: ${totalPnL.toFixed(2)}
`;
      }
    }

    // =========================
    // BUILD PROMPT
    // =========================
    const conversation = fromUser
      .map((m) => `${m.role}: ${m.text}`)
      .join("\n");

    const finalPrompt = `
User Conversation:
${conversation}

User Trading Stats:
${statsText}

Recent Trades:
${tradesText}

Instructions:
You MUST analyze the user's trading data.

Do NOT say you don't have access to data.

Give personalized insights based on:
- patterns
- mistakes
- strengths
- improvements

Keep response short, clear, and actionable.
`;

    // =========================
    // GEMINI CALL
    // =========================
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: finalPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096, // 🔥 effectively "no limit"
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini error:", JSON.stringify(data, null, 2));
      return res.status(502).json({
        error: data?.error?.message || "Gemini request failed",
      });
    }

    const candidate = data?.candidates?.[0];
    let reply = candidate?.content?.parts?.[0]?.text?.trim() || "";
    const finishReason = candidate?.finishReason;

    if (finishReason && finishReason !== "STOP") {
      console.warn("⚠️ Gemini finish reason:", finishReason);
    }

    if (!reply) {
      reply = "I couldn’t generate a reply right now. Try again.";
    }

    // ❌ NO HARD CUTS HERE (important)

    res.json({ reply });

  } catch (err) {
    console.error("Dimon error:", err);
    res.status(500).json({ error: "Chat failed" });
  }
});

export default router;