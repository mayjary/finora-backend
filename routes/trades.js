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
    const { data, error } = await supabase
      .from("trades")
      .select("exit_time, pnl")
      .not("exit_time", "is", null);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: "Failed to fetch performance data" });
    }

    // group by date manually
    const grouped = {};

    (data || []).forEach((trade) => {
      const date = new Date(trade.exit_time).toISOString().split("T")[0];

      if (!grouped[date]) {
        grouped[date] = 0;
      }

      grouped[date] += Number(trade.pnl || 0);
    });

    // convert to array
    const result = Object.entries(grouped)
      .map(([date, daily_pnl]) => ({
        date,
        daily_pnl,
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json(result);

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

// ===============================
// DELETE TRADE
// ===============================
// DELETE TRADE (SAFE)
// ===============================
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "Trade ID is required" });
    }

    const { data, error } = await supabase
      .from("trades")
      .delete()
      .eq("id", id)
      .select(); // 👈 THIS RETURNS DELETED ROW

    if (error) {
      console.error("DELETE ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: "Trade not found" });
    }

    res.json({
      message: "Trade deleted from database",
      deleted: data[0],
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

export default router;