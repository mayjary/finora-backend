import sys
import json
import re
from textblob import TextBlob
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

sia = SentimentIntensityAnalyzer()

def analyze_sentiment(text):
    clean = re.sub("[^a-zA-Z ]", " ", text)

    blob = TextBlob(clean)
    polarity = blob.sentiment.polarity
    subjectivity = blob.sentiment.subjectivity

    vader = sia.polarity_scores(clean)

    if polarity > 0.03 or vader["compound"] > 0.05:
        sentiment = "positive"
    elif polarity < -0.03 or vader["compound"] < -0.05:
        sentiment = "negative"
    else:
        sentiment = "neutral"

    return {
        "polarity": round(polarity, 3),
        "subjectivity": round(subjectivity, 3),
        "compound": round(vader["compound"], 3),
        "sentiment": sentiment
    }

if __name__ == "__main__":
    payload = json.loads(sys.stdin.read())
    text = payload.get("text", "")
    result = analyze_sentiment(text)
    print(json.dumps(result))
