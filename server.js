const express = require('express');
const app = express();

app.get('/stock/:ticker', async (req, res) => {
const ticker = req.params.ticker.toUpperCase();

try {
const targetUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?region=US&lang=en-US&includePrePost=false&interval=1m&range=1d`;
const response = await fetch(targetUrl);
const data = await response.json();

const meta = data?.chart?.result?.[0]?.meta;
const timestamps = data?.chart?.result?.[0]?.timestamp || null;
const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0] || null;

if (meta && meta.regularMarketPrice !== undefined) {
const pctChange = meta.previousClose
? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
: 0;

// Extract intraday arrays
let firstOpen = null;
let firstOpenTime = null;
let lastClose = null;
let lastCloseTime = null;

if (timestamps && Array.isArray(timestamps) && timestamps.length > 0 && quotes) {
const opens = quotes.open || [];
const closes = quotes.close || [];

for (let i = 0; i < opens.length; i++) {
if (opens[i] !== null && opens[i] !== undefined) {
firstOpen = opens[i];
firstOpenTime = timestamps[i] || null;
break;
}
}

for (let i = closes.length - 1; i >= 0; i--) {
if (closes[i] !== null && closes[i] !== undefined) {
lastClose = closes[i];
lastCloseTime = timestamps[i] || null;
break;
}
}
}

res.json({
price: meta.regularMarketPrice,
change: pctChange,
source: "Your Private Server",
shortName: meta.shortName || null,
marketState: meta.marketState || null,
firstOpen: firstOpen,
firstOpenTime: firstOpenTime,
lastClose: lastClose,
lastCloseTime: lastCloseTime
});
} else {
res.status(404).json({ error: 'Ticker not found' });
}
} catch (e) {
res.status(500).json({ error: 'Fetch failed' });
}
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
