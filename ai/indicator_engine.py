import pandas as pd
import pandas_ta as ta
import json
import sys
import math

def safe_float(value):
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    return round(float(value), 2)

def analyze(candles):
    df = pd.DataFrame(candles)

    # 🔴 Validate input
    if df.empty or "close" not in df:
        return {
            "indicators": {},
            "patterns": {},
            "insights": ["No valid market data"]
        }

    # 🔹 Convert safely
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df["open"] = pd.to_numeric(df["open"], errors="coerce")
    df["high"] = pd.to_numeric(df["high"], errors="coerce")
    df["low"] = pd.to_numeric(df["low"], errors="coerce")

    # 🔴 Drop bad rows
    df = df.dropna(subset=["close"])

    if len(df) < 30:
        return {
            "indicators": {},
            "patterns": {},
            "insights": ["Not enough data (need at least 30 candles)"]
        }

    df = df.sort_values("date")

    # =============================
    # 🔥 INDICATORS (OPTIMIZED)
    # =============================

    df["RSI"] = ta.rsi(df["close"], length=14)
    df["SMA_20"] = ta.sma(df["close"], length=20)
    df["SMA_50"] = ta.sma(df["close"], length=50)

    macd = ta.macd(df["close"])
    df["MACD"] = macd["MACD_12_26_9"]

    latest = df.iloc[-1]

    indicators = {}

    # =============================
    # 🔹 RSI
    # =============================
    rsi = safe_float(latest["RSI"])
    if rsi is not None:
        indicators["RSI"] = {
            "value": rsi,
            "signal": (
                "Overbought" if rsi > 70 else
                "Oversold" if rsi < 30 else
                "Neutral"
            )
        }

    # =============================
    # 🔹 MACD
    # =============================
    macd_val = safe_float(latest["MACD"])
    if macd_val is not None:
        indicators["MACD"] = {
            "value": macd_val,
            "signal": "Bullish" if macd_val > 0 else "Bearish"
        }

    # =============================
    # 🔹 SMA 20
    # =============================
    sma20 = safe_float(latest["SMA_20"])
    if sma20 is not None:
        indicators["SMA_20"] = {
            "value": sma20,
            "signal": "Above" if latest["close"] > sma20 else "Below"
        }

    # =============================
    # 🔹 SMA 50
    # =============================
    sma50 = safe_float(latest["SMA_50"])
    if sma50 is not None:
        indicators["SMA_50"] = {
            "value": sma50,
            "signal": "Above" if latest["close"] > sma50 else "Below"
        }

    # =============================
    # 🔥 INSIGHTS ENGINE
    # =============================
    insights = []

    # RSI signals
    if "RSI" in indicators:
        if indicators["RSI"]["signal"] == "Overbought":
            insights.append("RSI indicates overbought conditions")
        elif indicators["RSI"]["signal"] == "Oversold":
            insights.append("Potential reversal zone (oversold)")

    # MACD signals
    if "MACD" in indicators:
        if indicators["MACD"]["signal"] == "Bullish":
            insights.append("MACD suggests bullish momentum")
        else:
            insights.append("MACD indicates bearish pressure")

    # Trend detection
    if "SMA_20" in indicators and "SMA_50" in indicators:
        if (
            indicators["SMA_20"]["signal"] == "Above" and
            indicators["SMA_50"]["signal"] == "Above"
        ):
            insights.append("Strong short-term uptrend")
        elif (
            indicators["SMA_20"]["signal"] == "Below" and
            indicators["SMA_50"]["signal"] == "Below"
        ):
            insights.append("Strong short-term downtrend")

    # Price momentum
    try:
        recent_close = df["close"].iloc[-5:]
        if recent_close.iloc[-1] > recent_close.mean():
            insights.append("Price showing upward momentum")
        else:
            insights.append("Price showing weakness")
    except:
        pass

    # Fallback (never empty)
    if not insights:
        insights.append("Market is neutral with no strong signals")

    return {
        "indicators": indicators,
        "patterns": {},
        "insights": insights
    }

# =============================
# 🔹 ENTRY POINT
# =============================
if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    result = analyze(payload["candles"])
    print(json.dumps(result))