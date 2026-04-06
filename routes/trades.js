import express from "express";
import { supabase } from "../lib/supabase.js";

const router = express.Router();

/*
  TABLE STRUCTURE:

  id uuid
  user_id uuid
  symbol text
  trade_type text
  quantity numeric
  entry_price numeric
  exit_price numeric
  entry_time timestamp
  exit_time timestamp
  pnl numeric
  source text
  created_at timestamp
*/

const calculatePnL = (entry, exit, qty, type) => {
  if (type === "buy") {
    return (exit - entry) * qty;
  } else {
    return (entry - exit) * qty;
  }
};


// ===============================
// GET ALL TRADES
// ===============================
router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("trades")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to fetch trades" });
    }

    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});


// ===============================
// ADD MANUAL TRADE
// ===============================
router.post("/manual", async (req, res) => {
  try {
    const {
      user_id,
      symbol,
      trade_type,
      quantity,
      entry_price,
      exit_price,
      entry_time,
      exit_time
    } = req.body;

    const pnl = calculatePnL(
      Number(entry_price),
      Number(exit_price),
      Number(quantity),
      trade_type
    );

    const { data, error } = await supabase
      .from("trades")
      .insert({
        user_id,
        symbol: symbol.toUpperCase(),
        trade_type,
        quantity,
        entry_price,
        exit_price,
        entry_time,
        exit_time,
        pnl,
        source: "manual",
      })
      .select("*")
      .single();

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to add trade" });
    }

    res.json(data);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to add trade" });
  }
});

router.get("/performance", async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          DATE(created_at) as date,
          SUM(pnl) as daily_pnl
        FROM trades
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY DATE(created_at)
      `);
  
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Failed to fetch performance data" });
    }
  });


// ===============================
// IMPORT CSV TRADES
// ===============================
router.post("/import", async (req, res) => {
  try {
    const { user_id, trades } = req.body;

    if (!trades || trades.length === 0) {
      return res.status(400).json({ error: "No trades provided" });
    }

    const rowsToInsert = trades.map((t) => {
      const pnl = calculatePnL(
        Number(t.entry_price),
        Number(t.exit_price),
        Number(t.quantity),
        t.trade_type
      );

      return {
        user_id,
        symbol: t.symbol.toUpperCase(),
        trade_type: t.trade_type,
        quantity: t.quantity,
        entry_price: t.entry_price,
        exit_price: t.exit_price,
        entry_time: t.entry_time,
        exit_time: t.exit_time,
        pnl,
        source: "csv",
      };
    });

    const { data, error } = await supabase
      .from("trades")
      .insert(rowsToInsert)
      .select("*");

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Import failed" });
    }

    res.json({
      message: "Trades imported successfully",
      count: data ? data.length : 0,
      trades: data || [],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Import failed" });
  }
});


// ===============================
// GET TOTAL PNL
// ===============================
router.get("/summary", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("trades")
      .select("pnl");

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to fetch summary" });
    }

    const totalTrades = data?.length || 0;
    const totalPnL = (data || []).reduce(
      (sum, row) => sum + Number(row.pnl || 0),
      0
    );
    const winningTrades = (data || []).filter((row) => Number(row.pnl || 0) > 0)
      .length;
    const winRate =
      totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    res.json({
      totalTrades,
      totalPnL,
      winRate: Number(winRate.toFixed(2)),
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

export default router;