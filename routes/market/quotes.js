import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const API_KEY = process.env.FMP_API_KEY;

const INDEXES = ["SPY", "QQQ", "DIA"];
const STOCKS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"];
const CRYPTO = ["BTCUSD", "ETHUSD"]; // FMP format

// 🔥 FETCH FROM FMP
const fetchQuote = async (symbol) => {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/quote?symbol=${symbol}&apikey=LmJD1wKCFeVKZedU064yvWqiDxponnvu`
    );

    const data = await res.json();

    console.log("FMP:", symbol, data);

    if (!Array.isArray(data) || data.length === 0) {
      return {
        symbol,
        price: null,
        change: null,
        changePercent: null,
      };
    }

    const item = data[0];

    return {
      symbol: item.symbol,
      price: item.price ?? null,
      change: item.change ?? null,
      changePercent: item.changesPercentage ?? null,
    };
  } catch (err) {
    console.error("FMP error:", symbol, err);
    return null;
  }
};

// 🚀 ROUTE
router.get("/", async (req, res) => {
  try {
    const allSymbols = [...INDEXES, ...STOCKS, ...CRYPTO];

    const results = await Promise.all(
      allSymbols.map((s) => fetchQuote(s))
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
        crypto.push({
          ...item,
          symbol: item.symbol.replace("USD", ""), // BTC, ETH
        });
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