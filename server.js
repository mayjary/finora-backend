import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import marketQuotesRoute from "./routes/market/quotes.js";
import chartAnalysisRoute from "./routes/ai/chartAnalysis.js";
import chartImageAnalysisRoute from "./routes/ai/chartImageAnalysis.js";
import tradesRoute from "./routes/trades.js";
import sentimentRoute from "./routes/ai/sentiment.js";
import tradeInsightsRoute from "./ai/tradeInsights.js";
import dimonChatRoute from "./ai/dimonChat.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// market data
app.use("/api/market/quotes", marketQuotesRoute);

// AI
app.use("/api/ai/chart-analysis", chartAnalysisRoute);
app.use("/api/ai/chart-image-analysis", chartImageAnalysisRoute);
app.use("/api/ai/sentiment", sentimentRoute);
app.use("/api/ai/trade-insights", tradeInsightsRoute);
app.use("/api/ai/dimon", dimonChatRoute);

// trades (THIS HANDLES EVERYTHING)
app.use("/api/trades", tradesRoute);

app.get("/", (req, res) => {
  res.send("API running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});