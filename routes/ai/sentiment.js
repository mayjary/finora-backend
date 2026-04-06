import express from "express";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const router = express.Router();

// Needed for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// POST /api/ai/sentiment
router.post("/", (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const pythonPath = path.join(
    __dirname,
    "../../ai/sentiment_predict.py"
  );

  const python = spawn("python3", [pythonPath]);

  let output = "";
  let error = "";

  python.stdin.write(JSON.stringify({ text }));
  python.stdin.end();

  python.stdout.on("data", (data) => {
    output += data.toString();
  });

  python.stderr.on("data", (data) => {
    error += data.toString();
  });

  python.on("close", () => {
    if (error) {
        console.error("Python stderr:", error);
        return res.status(500).json({
          error: "Sentiment analysis failed",
          details: error
        });
      }

    try {
      const result = JSON.parse(output);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: "Invalid response from model" });
    }
  });
});

export default router;
