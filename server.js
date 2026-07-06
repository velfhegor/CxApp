const express = require('express');
const cors = require('cors'); // Essential addition to allow tracker2.html to connect
const app = express();

// Enable CORS for all incoming requests
app.use(cors());

app.get('/stock/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();

    try {
        const targetUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?region=US&lang=en-US&includePrePost=false&interval=1m&range=1d`;
        
        // Essential addition: Chrome headers to bypass Yahoo's anti-bot firewall
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json'
            }
        });

        // Catch Yahoo blocks and log exactly what happened
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Yahoo rejected request: Status ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Your exact data extraction logic
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

            // Exactly matching the format tracker2.html is looking for
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

// Essential addition: Render deployment port
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
