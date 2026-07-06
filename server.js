const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());

// ---------- NEW: region detection ----------
function getRegionFromTicker(ticker) {
const map = {
'.MX': 'MX',
'.L': 'GB',
'.KS': 'KR',
'.KQ': 'KR',
'.T': 'JP',
'.TO': 'CA',
'.V': 'CA',
'.AX': 'AU',
'.HK': 'HK',
'.SS': 'CN',
'.SZ': 'CN',
};
const upper = ticker.toUpperCase();
for (const [suffix, region] of Object.entries(map)) {
if (upper.endsWith(suffix)) return region;
}
if (upper.startsWith('^') || upper.includes('-')) return 'US';
return 'US';
}
// ------------------------------------------

app.get('/stock/:ticker', async (req, res) => {
const ticker = req.params.ticker.toUpperCase();

try {
// ---------- CHANGED: dynamic region ----------
const region = getRegionFromTicker(ticker);
const targetUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?region=${region}&lang=en-US&includePrePost=false&interval=1m&range=1d`;
// --------------------------------------------

const response = await fetch(targetUrl, {
headers: {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
'Accept': 'application/json'
}
});

if (!response.ok) {
const errorText = await response.text();
throw new Error(`Yahoo rejected request: Status ${response.status} - ${errorText}`);
}

const data = await response.json();

const meta = data?.chart?.result?.[0]?.meta;
const timestamps = data?.chart?.result?.[0]?.timestamp || null;
const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0] || null;

if (meta && meta.regularMarketPrice !== undefined) {
const pctChange = meta.previousClose
? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
: 0;

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
res.status(404).json({ error: 'Ticker not found or data missing from Yahoo' });
}
} catch (e) {
console.error("Server Error:", e.message);
res.status(500).json({ error: 'Fetch failed', details: e.message });
}
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
