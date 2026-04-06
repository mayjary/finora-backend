import express from "express";
import multer from "multer";
import { supabase } from "../../lib/supabase.js";
import { analyzeChartImage } from "../../ai/gemini.js";
import { requireAuth } from "../../middleware/auth.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/",
  requireAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const userId = req.user.id;
      const image = req.file;

      if (!image) {
        return res.status(400).json({ error: "Image required" });
      }

      const filePath = `${userId}/${Date.now()}.png`;

      const { error: uploadError } = await supabase.storage
        .from("chart-images")
        .upload(filePath, image.buffer, {
          contentType: image.mimetype,
        });

      if (uploadError) throw uploadError;

      const aiResult = await analyzeChartImage(image.buffer);

      const { data, error } = await supabase
        .from("chart_reviews")
        .insert({
          user_id: userId,
          image_path: filePath,
          market_bias: aiResult.market_bias,
          trade_score: aiResult.trade_score,
          observations: aiResult.observations,
          mistakes: aiResult.mistakes,
          suggestions: aiResult.suggestions,
          raw_ai_response: aiResult,
        })
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Chart image analysis failed" });
    }
  }
);

export default router;
