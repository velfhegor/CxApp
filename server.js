const express = require('express');
const app = express();

app.get('/stock/:ticker', async (req, res) => {
    // FORCE uppercase so FRED never drops a 400 error on lowercase input
    const ticker = req.params.ticker.toUpperCase();
    
    // Default fallback is the S&P 500
    let seriesId = "SP500"; 
    let displayName = "S&P 500 Index (FRED)";

    // Route requests dynamically to different world markets
    if (ticker === "NASDAQ" || ticker === "NDAQ" || ticker === "COMP") {
        seriesId = "NASDAQCOM";
        displayName = "NASDAQ Composite (FRED)";
    } else if (ticker === "NDX" || ticker === "QQQ") {
        seriesId = "NASDAQ100";
        displayName = "NASDAQ 100 (FRED)";
    } else if (ticker === "LONDON" || ticker === "LSE" || ticker === "UK") {
        seriesId = "SPASTT01GBM661N";
        displayName = "London Stock Exchange Index (FRED)";
    } else if (ticker === "TOKYO" || ticker === "NIKKEI" || ticker === "JP") {
        seriesId = "NIKKEI225";
        displayName = "Nikkei 225 Tokyo Index (FRED)";
    } else if (ticker === "MEXICO" || ticker === "BMV" || ticker === "IPC" || ticker === "MX") {
        seriesId = "SPASTT01MXM661N";
        displayName = "Mexican IPC Index (FRED)";
    }

    try {
        const publicKey = "abcdefghijklmnopqrstuvwxyz123456";
        const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${publicKey}&file_type=json`;
        
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`FRED API returned status ${response.status}`);
        
        const fredData = await response.json();

        if (fredData && fredData.observations && fredData.observations.length > 0) {
            const lastObservation = fredData.observations[fredData.observations.length - 1];
            const prevObservation = fredData.observations[fredData.observations.length - 2];

            const currentPrice = parseFloat(lastObservation.value);
            const previousClose = parseFloat(prevObservation.value);

            const fakeYahooStructure = {
                chart: {
                    result: [
                        {
                            meta: {
                                regularMarketPrice: currentPrice,
                                previousClose: previousClose,
                                shortName: displayName,
                                marketState: "REGULAR"
                            },
                            timestamp: [Math.floor(Date.now() / 1000)],
                            indicators: {
                                quote: [
                                    {
                                        open: [previousClose],
                                        close: [currentPrice]
                                    }
                                ]
                            }
                        }
                    ],
                    error: null
                }
            };

            return res.json(fakeYahooStructure);
        } else {
            return res.status(404).json({ chart: { result: null, error: "Market data unavailable" } });
        }

    } catch (e) {
        console.error("Keyless Global Fetch Error:", e.message);
        return res.status(500).json({ chart: { result: null, error: e.message } });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
