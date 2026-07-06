const express = require('express');
const app = express();

app.get('/stock/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();
    const yahooUrl = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?region=US&lang=en-US&includePrePost=false&interval=1m&range=1d`;

    // Your list of public keyless proxies
    const proxies = [
        `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${yahooUrl}` // Doesn't need URL encoding usually
    ];

    // Loop through each proxy one by one until one works
    for (let i = 0; i < proxies.length; i++) {
        const currentProxyUrl = proxies[i];
        
        try {
            console.log(`Trying proxy ${i + 1}: ${currentProxyUrl}`);
            
            // Set a strict 4-second timeout so a slow proxy doesn't freeze your cron-job
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(currentProxyUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error(`Proxy returned status ${response.status}`);

            const rawData = await response.json();
            let data;

            // CRITICAL STEP: Different proxies wrap the Yahoo JSON differently.
            // We have to extract the clean Yahoo data depending on which proxy responded.
            if (currentProxyUrl.includes('allorigins')) {
                data = JSON.parse(rawData.contents); // AllOrigins wraps it in a 'contents' string
            } else if (currentProxyUrl.includes('codetabs') || currentProxyUrl.includes('corsproxy.io') || currentProxyUrl.includes('thingproxy')) {
                data = rawData; // These proxies return the raw Yahoo JSON directly
            }

            // --- Your original parsing logic stays exactly the same ---
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

                    for (let j = 0; j < opens.length; j++) {
                        if (opens[j] !== null && opens[j] !== undefined) {
                            firstOpen = opens[j];
                            firstOpenTime = timestamps[j] || null;
                            break;
                        }
                    }

                    for (let j = closes.length - 1; j >= 0; j--) {
                        if (closes[j] !== null && closes[j] !== undefined) {
                            lastClose = closes[j];
                            lastCloseTime = timestamps[j] || null;
                            break;
                        }
                    }
                }

                // If we successfully get here, return the data and STOP the loop!
                return res.json({
                    price: meta.regularMarketPrice,
                    change: pctChange,
                    source: `Your Private Server (via Proxy ${i + 1})`,
                    shortName: meta.shortName || null,
                    marketState: meta.marketState || null,
                    firstOpen: firstOpen,
                    firstOpenTime: firstOpenTime,
                    lastClose: lastClose,
                    lastCloseTime: lastCloseTime
                });
            }

        } catch (err) {
            console.warn(`Proxy ${i + 1} failed: ${err.message}. Moving to next...`);
            // The loop continues to the next proxy if this one catches an error
        }
    }

    // If the loop finishes and EVERY proxy failed
    res.status(500).json({ error: 'All public proxies failed to fetch Yahoo data.' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
