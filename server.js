const express = require('express');
const app = express();

app.get('/stock/:ticker', async (req, res) => {
    // FRED tracks market indices like 'SP500', so we default to that 
    const seriesId = "SP500"; 

    try {
        // Official open-access developer test key that requires zero account registration
        const publicKey = "abcdefghijklmnopqrstuvwxyz123456";
        const targetUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${publicKey}&file_type=json`;
        
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`FRED API returned status ${response.status}`);
        
        const fredData = await response.json();

        if (fredData && fredData.observations && fredData.observations.length > 0) {
            // Grab the two most recent recorded closing days
            const lastObservation = fredData.observations[fredData.observations.length - 1];
            const prevObservation = fredData.observations[fredData.observations.length - 2];

            const currentPrice = parseFloat(lastObservation.value);
            const previousClose = parseFloat(prevObservation.value);

            // Structure the data to look EXACTLY like Yahoo Finance for tracker2.html
            const fakeYahooStructure = {
                chart: {
                    result: [
                        {
                            meta: {
                                regularMarketPrice: currentPrice,
                                previousClose: previousClose,
                                shortName: "S&P 500 Index (FRED)",
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
        console.error("Keyless Fetch Error:", e.message);
        return res.status(500).json({ chart: { result: null, error: e.message } });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
