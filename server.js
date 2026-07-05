
const express = require('express');
const app = express();

app.get('/stock/:ticker', async (req, res) => {
const ticker = req.params.ticker.toUpperCase();

try {
const targetUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?region=US&lang=en-US&includePrePost=false&interval=1m&range=1d`;

const response = await fetch(targetUrl);
const data = await response.json();

const meta = data?.chart?.result?.[0]?.meta;

if (meta && meta.regularMarketPrice !== undefined) {
const pctChange = meta.previousClose
? ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100
: 0;

res.json({
price: meta.regularMarketPrice,
change: pctChange,
source: "Your Private Server"
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
