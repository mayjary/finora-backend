import fetch from "node-fetch";

const BASE_URL = "https://www.alphavantage.co/query";

// Detect crypto symbols like BTC, ETH, SOL
const CRYPTO_SYMBOLS = [
  "BTC",
  "ETH",
  "SOL",
  "ADA",
  "XRP",
  "DOGE",
  "BNB",
  "MATIC"
];

const isCryptoSymbol = (symbol) => {
  return CRYPTO_SYMBOLS.includes(symbol.toUpperCase());
};


export const fetchMarketOHLC = async (symbol, timeframe, apiKey) => {
  // CRYPTO
  // CRYPTO
if (isCryptoSymbol(symbol)) {
  const url = `${BASE_URL}?function=DIGITAL_CURRENCY_DAILY&symbol=${symbol}&market=USD&apikey=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  // 🔴 Handle Alpha Vantage throttling or errors
  if (data.Note || data.Information || data["Error Message"]) {
    return {
      error:
        data.Note ||
        data.Information ||
        data["Error Message"] ||
        "Crypto data temporarily unavailable",
    };
  }

  const series = data["Time Series (Digital Currency Daily)"];
  if (data.Note || data.Information || data["Error Message"]) {
    return {
      error:
        data.Note ||
        data.Information ||
        data["Error Message"] ||
        "Stock data temporarily unavailable",
    };
  }
  
  if (!series) {
    return { error: "Stock data not returned by provider" };
  }  

  return Object.entries(series).map(([date, v]) => ({
    date,
    open: Number(v["1a. open (USD)"]),
    high: Number(v["2a. high (USD)"]),
    low: Number(v["3a. low (USD)"]),
    close: Number(v["4a. close (USD)"]),
    volume: Number(v["5. volume"]),
  }));
}

  // STOCKS
  let functionName = "TIME_SERIES_DAILY";
  if (timeframe === "1W") functionName = "TIME_SERIES_WEEKLY";
  if (timeframe === "1M") functionName = "TIME_SERIES_MONTHLY";

  const url = `${BASE_URL}?function=${functionName}&symbol=${symbol}&apikey=${apiKey}`;

  const res = await fetch(url);
  const data = await res.json();

  const seriesKey =
    functionName === "TIME_SERIES_DAILY"
      ? "Time Series (Daily)"
      : functionName === "TIME_SERIES_WEEKLY"
      ? "Weekly Time Series"
      : "Monthly Time Series";

  const series = data[seriesKey];
  if (!series) {
    throw new Error("Invalid Alpha Vantage stock response");
  }

  return Object.entries(series).map(([date, v]) => ({
    date,
    open: Number(v["1. open"]),
    high: Number(v["2. high"]),
    low: Number(v["3. low"]),
    close: Number(v["4. close"]),
    volume: Number(v["5. volume"]),
  }));
};
