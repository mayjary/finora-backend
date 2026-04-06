import express from "express";
import { fetchMarketOHLC } from "../../utils/alphaVantage.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.post("/", async (req, res) => {
  const { symbol, timeframe } = req.body;

  if (!symbol || !timeframe) {
    return res.status(400).json({
      error: "Symbol and timeframe required",
    });
  }

  try {
    // 🔹 Fetch market data ONCE
    const candles = await fetchMarketOHLC(
      symbol,
      timeframe,
      process.env.ALPHA_VANTAGE_API_KEY
    );

    // 🔴 Handle provider errors
    if (candles?.error) {
      return res.status(429).json({
        error: candles.error,
      });
    }

    // 🔴 Ensure sufficient data
    if (!Array.isArray(candles) || candles.length < 20) {
      return res.status(400).json({
        error: "Not enough market data to analyze",
      });
    }

    // 🔹 Run Python indicator engine
    const pythonPath = path.resolve(
      __dirname,
      "../../ai/indicator_engine.py"
    );

    const python = spawn("python3", [pythonPath]);

    python.stdin.write(JSON.stringify({ candles }));
    python.stdin.end();

    let output = "";
    let pythonError = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      pythonError += data.toString();
    });

    python.on("close", () => {
      if (pythonError) {
        console.error("Python error:", pythonError);
        return res.status(500).json({
          error: "Indicator engine failed",
          details: pythonError,
        });
      }

      try {
        const parsed = JSON.parse(output);
        res.json(parsed);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        res.status(500).json({
          error: "Invalid response from indicator engine",
        });
      }
    });
  } catch (err) {
    console.error("Chart analysis error:", err);
    res.status(500).json({
      error: "Chart analysis failed",
    });
  }
});

export default router;
