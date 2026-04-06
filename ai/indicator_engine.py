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
    # 🔴 Drop invalid rows early
    if df.empty or "close" not in df:
        return {
            "indicators": {},
            "patterns": {},
            "insights": ["No valid market data"]
        }

    # Convert to numeric safely
    df["close"] = pd.to_numeric(df["close"], errors="coerce")
    df["open"] = pd.to_numeric(df["open"], errors="coerce")
    df["high"] = pd.to_numeric(df["high"], errors="coerce")
    df["low"] = pd.to_numeric(df["low"], errors="coerce")

    # Drop rows with NaN values
    df = df.dropna(subset=["close"])

    # Ensure enough data for RSI
    if len(df) < 20:
        return {
            "indicators": {},
            "patterns": {},
            "insights": ["Insufficient clean data for indicator calculation"]
        }

    df = df.sort_values("date")


    df["RSI"] = ta.rsi(df["close"], length=14)
    df["SMA_50"] = ta.sma(df["close"], length=50)
    df["SMA_200"] = ta.sma(df["close"], length=200)

    macd = ta.macd(df["close"])
    df["MACD"] = macd["MACD_12_26_9"]

    latest = df.iloc[-1]

    indicators = {}

    rsi = safe_float(latest["RSI"])
    if rsi is not None:
        indicators["RSI"] = {
            "value": rsi,
            "signal": "Overbought" if rsi > 70 else "Oversold" if rsi < 30 else "Neutral"
        }

    macd_val = safe_float(latest["MACD"])
    if macd_val is not None:
        indicators["MACD"] = {
            "value": macd_val,
            "signal": "Bullish" if macd_val > 0 else "Bearish"
        }

    sma50 = safe_float(latest["SMA_50"])
    if sma50 is not None:
        indicators["SMA_50"] = {
            "value": sma50,
            "signal": "Above" if latest["close"] > sma50 else "Below"
        }

    sma200 = safe_float(latest["SMA_200"])
    if sma200 is not None:
        indicators["SMA_200"] = {
            "value": sma200,
            "signal": "Above" if latest["close"] > sma200 else "Below"
        }

    insights = []

    if "RSI" in indicators and indicators["RSI"]["signal"] == "Overbought":
        insights.append("RSI indicates overbought conditions")

    if "MACD" in indicators and indicators["MACD"]["signal"] == "Bullish":
        insights.append("MACD suggests bullish momentum")

    if "SMA_50" in indicators and "SMA_200" in indicators:
        if (
            indicators["SMA_50"]["signal"] == "Above"
            and indicators["SMA_200"]["signal"] == "Above"
        ):
            insights.append("Price trading above key moving averages")

    if not insights:
        insights.append("Insufficient data for strong technical signals")

    return {
        "indicators": indicators,
        "patterns": {},
        "insights": insights
    }

if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    result = analyze(payload["candles"])
    print(json.dumps(result))
