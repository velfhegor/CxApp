const express = require('express');
const app = express();

app.get('/stock/:ticker', async (req, res) => {
    const ticker = req.params.ticker.toUpperCase();

    try {
        // Grab stable data using Finnhub's permanent free public test token
        const sandboxToken = "sandbox_c866hi2ad3iefg797u0g";
        const targetUrl = `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${sandboxToken}`;
        
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`Finnhub returned status ${response.status}`);
        
        const finnhubData = await response.json();

        // Check if we received valid market data (c is current price)
        if (finnhubData && finnhubData.c !== 0 && finnhubData.c !== undefined) {
            
            // Build a fake Yahoo Finance JSON structure
            const fakeYahooStructure = {
                chart: {
                    result: [
                        {
                            meta: {
                                regularMarketPrice: finnhubData.c,
                                previousClose: finnhubData.pc,
                                shortName: `${ticker} Inc.`,
                                marketState: "REGULAR"
                            },
                            // Creating mock arrays so your intraday loops don't crash
                            timestamp: [Math.floor(Date.now() / 1000)],
                            indicators: {
                                quote: [
                                    {
                                        open: [finnhubData.o],
                                        close: [finnhubData.c]
                                    }
                                ]
                            }
                        }
                    ],
                    error: null
                }
            };

            // Send the faked Yahoo layout straight back to tracker2.html
            return res.json(fakeYahooStructure);

        } else {
            return res.status(404).json({ chart: { result: null, error: "Ticker not found" } });
        }

    } catch (e) {
        console.error("Backend Error:", e.message);
        // Fallback error format mimicking an expected failure structure
        return res.status(500).json({ chart: { result: null, error: e.message } });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
