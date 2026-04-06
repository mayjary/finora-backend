import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const BASE_URL = "https://finnhub.io/api/v1/quote";
const API_KEY = process.env.FINNHUB_API_KEY;

// Use ETFs instead of raw index symbols
const INDEXES = ["SPY", "QQQ", "DIA"];
const STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
const CRYPTO = ["BINANCE:BTCUSDT", "BINANCE:ETHUSDT"];

const fetchQuote = async (symbol) => {
  const url = `${BASE_URL}?symbol=${symbol}&token=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data || data.c === 0) return null;

  return {
    symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
  };
};

router.get("/", async (req, res) => {
  try {
    const allSymbols = [
      ...INDEXES,
      ...STOCKS,
      ...CRYPTO,
    ];

    // 🚀 Parallel fetching instead of for-loops
    const results = await Promise.all(
      allSymbols.map((symbol) => fetchQuote(symbol))
    );

    const indexes = [];
    const stocks = [];
    const crypto = [];

    results.forEach((item) => {
      if (!item) return;

      if (INDEXES.includes(item.symbol)) {
        indexes.push(item);
      } else if (STOCKS.includes(item.symbol)) {
        stocks.push(item);
      } else {
        crypto.push(item);
      }
    });

    res.json({
      updatedAt: new Date(),
      indexes,
      stocks,
      crypto,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Market data unavailable" });
  }
});

export default router;