import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Crosshair, BarChart2, ShieldAlert, Zap, ArrowUpRight, ArrowDownRight, Globe, TrendingUp, BellRing, Terminal, CheckCircle } from 'lucide-react';

// --- Advanced Technical Indicator Utilities ---
const calculateVWAP = (history) => {
  let typicalPriceVolume = 0;
  let totalVolume = 0;
  history.forEach(candle => {
    const typicalPrice = (candle.h + candle.l + candle.c) / 3;
    typicalPriceVolume += typicalPrice * candle.v;
    totalVolume += candle.v;
  });
  return totalVolume === 0 ? null : typicalPriceVolume / totalVolume;
};

const calculateBollingerBands = (data, period = 20) => {
  if (data.length < period) return null;
  const slice = data.slice(0, period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
  const sd = Math.sqrt(variance);
  return { upper: sma + (sd * 2), lower: sma - (sd * 2), sma };
};

const calculateRSI = (data, period = 14) => {
  if (data.length < period + 1) return 50;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i - 1] - data[i]; 
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
};

const calculateATR = (history, period = 14) => {
  if (history.length < period + 1) return 0;
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    const high = history[i].h;
    const low = history[i].l;
    const prevClose = history[i + 1].c;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
};

const calculateEMA = (data, period) => {
  if (data.length < period) return null;
  const k = 2 / (period + 1);
  let ema = data[data.length - 1]; 
  for (let i = data.length - 2; i >= 0; i--) {
    ema = (data[i] * k) + (ema * (1 - k));
  }
  return ema;
};

const calculateMACD = (data) => {
  if (data.length < 26) return { macd: 0, signal: 0, histogram: 0 };
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLine = ema12 - ema26;
  const signalLine = macdLine * 0.2; 
  return { macd: macdLine, signal: signalLine, histogram: macdLine - signalLine };
};

const BULLISH_WORDS = ['surge', 'bull', 'etf', 'approve', 'buy', 'high', 'adoption', 'integration', 'soars', 'record', 'growth', 'positive'];
const BEARISH_WORDS = ['ban', 'hack', 'sec', 'drop', 'bear', 'sell', 'low', 'crackdown', 'lawsuit', 'crash', 'negative', 'plunge'];

export default function App() {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [tickDirection, setTickDirection] = useState(null);
  
  const prevPriceRef = useRef(null);
  const currentPriceRef = useRef(null);
  const tickHistoryRef = useRef([]); // Tracks sub-minute tick velocity
  const prevImbalanceRef = useRef(1); // Tracks Order Book Spoofing Vacuum

  const [history, setHistory] = useState([]); 
  const [orderBook, setOrderBook] = useState({ localBuy: 0, localSell: 0, imbalance: 1 });
  const [newsEvents, setNewsEvents] = useState([]);
  const [sentimentScore, setSentimentScore] = useState(0);
  
  const [binancePremium, setBinancePremium] = useState(0);
  const [fundingRate, setFundingRate] = useState(0); // V11 Futures Squeeze Tracker

  const [targetMargin, setTargetMargin] = useState(71584.69);
  const [timeState, setTimeState] = useState({ currentEST: '', startWindowEST: '', nextWindowEST: '', minsRemaining: 0, secsRemaining: 0, currentHour: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const lockedPredictionRef = useRef("SIT OUT");
  const activeCallRef = useRef({ prediction: "SIT OUT", strike: 0 });
  
  // Safe Initialization of Scorecard 
  const [scorecard, setScorecard] = useState(() => {
    const baseline = { wins: 29, losses: 21 };
    try {
      const savedScore = localStorage.getItem('btcOracleScorecard');
      if (savedScore) {
        const parsed = JSON.parse(savedScore);
        if (parsed && typeof parsed.wins === 'number' && typeof parsed.losses === 'number') {
          if (parsed.wins + parsed.losses < 50) return baseline;
          return parsed;
        }
      }
      return baseline;
    } catch (e) {
      return baseline;
    }
  });
  
  const [manualAction, setManualAction] = useState(null);
  const [forceRender, setForceRender] = useState(0); 
  
  const currentWindowRef = useRef("");
  const lastPredRef = useRef(null);
  const [emergencyBlink, setEmergencyBlink] = useState(false);
  const lastWindowRef = useRef("");

  // Persist Scorecard Changes
  useEffect(() => {
    try { localStorage.setItem('btcOracleScorecard', JSON.stringify(scorecard)); } 
    catch (e) { console.warn("Storage access restricted."); }
  }, [scorecard]);

  // Auto-Set Target Margin & Scorecard Eval on Window Rollover
  useEffect(() => {
    if (timeState.nextWindowEST && timeState.nextWindowEST !== lastWindowRef.current) {
      if (currentPrice !== null) {
        if (lastWindowRef.current !== "") {
          const prevCall = activeCallRef.current;
          if (prevCall.prediction === "YES") {
            if (currentPrice > prevCall.strike) setScorecard(s => ({ ...s, wins: s.wins + 1 }));
            else if (currentPrice < prevCall.strike) setScorecard(s => ({ ...s, losses: s.losses + 1 }));
          } else if (prevCall.prediction === "NO") {
            if (currentPrice < prevCall.strike) setScorecard(s => ({ ...s, wins: s.wins + 1 }));
            else if (currentPrice > prevCall.strike) setScorecard(s => ({ ...s, losses: s.losses + 1 }));
          }
        }
        setTargetMargin(currentPrice);
        lockedPredictionRef.current = "SIT OUT";
        activeCallRef.current = { prediction: "SIT OUT", strike: currentPrice };
        lastWindowRef.current = timeState.nextWindowEST;
        setManualAction(null); 
        tickHistoryRef.current = []; // Reset tick momentum
      }
    }
  }, [timeState.nextWindowEST, currentPrice]);

  // Real-time Tick Data & Velocity Tracker
  useEffect(() => {
    const ws = new WebSocket('wss://ws-feed.exchange.coinbase.com');
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe', product_ids: ['BTC-USD'], channels: ['ticker'] }));

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'ticker' && data.price) {
          const newPrice = parseFloat(data.price);
          if (prevPriceRef.current !== null) {
            if (newPrice > prevPriceRef.current) setTickDirection('up');
            else if (newPrice < prevPriceRef.current) setTickDirection('down');
          }
          prevPriceRef.current = newPrice;
          currentPriceRef.current = newPrice;
          
          tickHistoryRef.current.push(newPrice);
          if (tickHistoryRef.current.length > 20) tickHistoryRef.current.shift();

          setCurrentPrice(newPrice);
        }
      } catch (err) {}
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe', product_ids: ['BTC-USD'], channels: ['ticker'] }));
      }
      ws.close();
    };
  }, []);

  // --- V11.11 DUAL-SOURCED DATA POLLING (ANTI-CALIBRATION BUG FIX) ---
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        let formattedHistory = [];
        
        // 1. Primary API: Coinbase (Rock solid, no US Geo-blocks, no CORS issues)
        try {
          const resCB = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60');
          if (resCB.ok) {
            const dataCB = await resCB.json();
            // Coinbase returns newest to oldest, so we just take the top 60
            formattedHistory = dataCB.slice(0, 60).map(c => ({
              l: parseFloat(c[1]), h: parseFloat(c[2]), c: parseFloat(c[4]), v: parseFloat(c[5])
            }));
          } else throw new Error("Coinbase Blocked");
        } catch (e1) {
          // 2. Secondary API: CryptoCompare (Fallback)
          try {
            const resCC = await fetch('https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=60&aggregate=1');
            const dataCC = await resCC.json();
            if (dataCC && dataCC.Data && Array.isArray(dataCC.Data.Data)) {
              formattedHistory = dataCC.Data.Data.map(c => ({
                h: parseFloat(c.high), l: parseFloat(c.low), c: parseFloat(c.close), v: parseFloat(c.volumeto)
              })).reverse();
            } else throw new Error("CC Blocked");
          } catch (e2) {
            // 3. Tertiary API: Binance (Often Geo-blocked in US, but good global fallback)
            try {
              const resBin = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=60');
              if (resBin.ok) {
                const dataBin = await resBin.json();
                formattedHistory = dataBin.map(k => ({
                  h: parseFloat(k[2]), l: parseFloat(k[3]), c: parseFloat(k[4]), v: parseFloat(k[5])
                })).reverse();
              }
            } catch (e3) {
              console.warn("All History APIs failed.");
            }
          }
        }

        if (formattedHistory.length > 0) {
          setHistory(formattedHistory);
          // V11 WebSocket Bypass: If socket is blocked by Brave/VPN, seed price from API so it never gets stuck
          if (currentPriceRef.current === null) {
            setCurrentPrice(formattedHistory[0].c);
            currentPriceRef.current = formattedHistory[0].c;
          }
        }

        let currentCoinbaseRef = currentPriceRef.current;

        // Wrapped in try/catch so a rate-limit here doesn't crash the history loop
        try {
          const resOb = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/book?level=2');
          const dataOb = await resOb.json();
          if (dataOb && Array.isArray(dataOb.bids) && Array.isArray(dataOb.asks)) {
            let localBuy = 0, localSell = 0;
            dataOb.bids.forEach(([price, size]) => {
              const p = parseFloat(price), s = parseFloat(size);
              if (p <= targetMargin && p >= targetMargin - 150) localBuy += s;
            });
            dataOb.asks.forEach(([price, size]) => {
              const p = parseFloat(price), s = parseFloat(size);
              if (p >= targetMargin && p <= targetMargin + 150) localSell += s;
            });
            const imbalance = localSell === 0 ? 1 : localBuy / localSell;
            prevImbalanceRef.current = orderBook.imbalance; // Track Vacuum Delta
            setOrderBook({ localBuy, localSell, imbalance });
          }
        } catch (err) {
          console.warn("OrderBook fetch failed, skipping cycle.");
        }

        try {
          const resBinance = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
          const dataBinance = await resBinance.json();
          if (dataBinance && dataBinance.price && currentCoinbaseRef) {
            const binPrice = parseFloat(dataBinance.price);
            setBinancePremium(binPrice - currentCoinbaseRef);
          }
        } catch (e) {}

        // V11: Funding Rate Squeeze Detection
        try {
          const resFund = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
          const dataFund = await resFund.json();
          if (dataFund && dataFund.lastFundingRate) setFundingRate(parseFloat(dataFund.lastFundingRate));
        } catch (e) {}

        setIsLoading(false);
      } catch (err) { setIsLoading(false); }
    };

    const fetchNewsSentiment = async () => {
      try {
        const res = await fetch('https://min-api.cryptocompare.com/data/v2/news/?lang=EN&categories=BTC');
        const data = await res.json();
        if (data && data.Data && Array.isArray(data.Data)) {
          const topNews = data.Data.slice(0, 4);
          setNewsEvents(topNews);
          let score = 0;
          topNews.forEach(article => {
            const title = article.title?.toLowerCase() || "";
            BULLISH_WORDS.forEach(word => { if (title.includes(word)) score += 1; });
            BEARISH_WORDS.forEach(word => { if (title.includes(word)) score -= 1; });
          });
          setSentimentScore(score);
        }
      } catch (err) {}
    };

    fetchMarketData(); fetchNewsSentiment();
    const fastInterval = setInterval(fetchMarketData, 8000); 
    const macroInterval = setInterval(fetchNewsSentiment, 60000); 

    return () => { clearInterval(fastInterval); clearInterval(macroInterval); };
  }, [targetMargin]);

  // Clock Sync
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const currentEST = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const next15Mins = Math.ceil((now.getMinutes() + 1) / 15) * 15;
      const nextWindow = new Date(now);
      nextWindow.setMinutes(next15Mins, 0, 0);
      const nextWindowEST = nextWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' });
      
      const startWindow = new Date(nextWindow.getTime() - 15 * 60000);
      const startWindowEST = startWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' });
      
      const diffMs = nextWindow.getTime() - now.getTime();
      
      setTimeState({ 
        currentEST, startWindowEST, nextWindowEST, 
        minsRemaining: Math.floor(diffMs / 60000), 
        secsRemaining: Math.floor((diffMs % 60000) / 1000),
        currentHour: new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours()
      });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- TARA V11.11 WISH-GRANTED ENGINE ---
  const analysis = useMemo(() => {
    if (!currentPrice || history.length < 30 || !targetMargin) return null;

    const closes = history.map(x => x.c), volumes = history.map(x => x.v);
    const ema9 = calculateEMA(closes, 9), ema21 = calculateEMA(closes, 21);
    const macd = calculateMACD(closes), rsi = calculateRSI(closes, 14);
    const atr = calculateATR(history, 14), atrBps = (atr / currentPrice) * 10000; 
    const vwap = calculateVWAP(history);
    const bb = calculateBollingerBands(closes, 20); 
    
    const currentVol = volumes[0] || 0, avgVol = volumes.slice(1, 10).reduce((a, b) => a + b, 0) / 9 || 1;
    const volumeSurge = currentVol / avgVol; 

    const realGapBps = ((currentPrice - targetMargin) / targetMargin) * 10000;
    const vwapGapBps = vwap ? ((currentPrice - vwap) / vwap) * 10000 : 0;
    const clockSeconds = (timeState.minsRemaining * 60) + timeState.secsRemaining;

    const shortTermSlope = history.length >= 3 ? (history[0].c - history[2].c) : 0;
    
    const ticks = tickHistoryRef.current;
    const tickSlope = ticks.length >= 10 ? (currentPrice - ticks[0]) : 0;
    const imbalanceDelta = orderBook.imbalance - prevImbalanceRef.current;

    const timeDecayFactor = Math.max(0, 1 - (clockSeconds / 900));
    let isObservationPhase = clockSeconds > 890; 

    let probabilityAbove = 50; 
    let reasoning = [];
    if (isObservationPhase) reasoning.push(`Wait ${clockSeconds - 890}s for open volatility to settle.`);

    probabilityAbove += realGapBps * (0.5 + (timeDecayFactor * 3.5)); 

    const isBullishTrend = ema9 > ema21;
    if (shortTermSlope > 0) {
      if (volumeSurge > 1.2 || tickSlope > 1.0) { probabilityAbove += 15; reasoning.push("Fast volume/tick upward slope detected."); } 
      else { probabilityAbove += 5; }
    } else if (shortTermSlope < 0) {
      if (volumeSurge > 1.2 || tickSlope < -1.0) { probabilityAbove -= 15; reasoning.push("Fast volume/tick downward slope detected."); } 
      else { probabilityAbove -= 5; }
    }

    if (binancePremium > 10) {
      probabilityAbove += 12; reasoning.push(`Binance leads +$${binancePremium.toFixed(1)}. Arb squeeze up.`);
    } else if (binancePremium < -10) {
      probabilityAbove -= 12; reasoning.push(`Binance drags -$${Math.abs(binancePremium).toFixed(1)}. Arb dump down.`);
    }

    // V11 Funding Rate Squeeze
    if (fundingRate > 0.0003) {
      probabilityAbove -= 10; reasoning.push("High Funding Rate. Long squeeze (dump) likely.");
    } else if (fundingRate < -0.0003) {
      probabilityAbove += 10; reasoning.push("Negative Funding Rate. Short squeeze (pump) likely.");
    }

    if (bb) {
      if (currentPrice >= bb.upper) {
         probabilityAbove -= 25; reasoning.push(`Upper BB Pierced. Elastic snap-back imminent.`);
      } else if (currentPrice <= bb.lower) {
         probabilityAbove += 25; reasoning.push(`Lower BB Pierced. Elastic bounce imminent.`);
      }
    }

    if (rsi > 75) {
      probabilityAbove -= 10; reasoning.push(`RSI Overbought (${rsi.toFixed(0)}). Exhaustion dump likely.`);
    } else if (rsi < 25) {
      probabilityAbove += 10; reasoning.push(`RSI Oversold (${rsi.toFixed(0)}). Exhaustion pump likely.`);
    }

    if (vwapGapBps > 3) probabilityAbove -= 8;
    else if (vwapGapBps < -3) probabilityAbove += 8;

    // V11 SPOOFING VACUUM DETECTION
    const isSpoofingBids = orderBook.imbalance > 1.5 && shortTermSlope < 0 && tickSlope < -0.5;
    const isSpoofingAsks = orderBook.imbalance < 0.6 && shortTermSlope > 0 && tickSlope > 0.5;

    if (imbalanceDelta < -1.0) {
      probabilityAbove -= 15; reasoning.push(`🚨 MASSIVE BUY WALL PULLED (Spoof Vacuum).`);
    } else if (imbalanceDelta > 1.0) {
      probabilityAbove += 15; reasoning.push(`🚨 MASSIVE SELL WALL PULLED (Spoof Vacuum).`);
    }

    if (isSpoofingBids) {
       probabilityAbove -= 25; reasoning.push(`FAKE BIDS DETECTED. Price bleeding through L2 walls.`);
    } else if (isSpoofingAsks) {
       probabilityAbove += 25; reasoning.push(`FAKE ASKS DETECTED. Price breaking through L2 ceiling.`);
    } else {
       if (orderBook.imbalance > 1.8) { probabilityAbove += 15; reasoning.push(`Heavy Bid Support. L2 floor holding.`); } 
       else if (orderBook.imbalance < 0.5) { probabilityAbove -= 15; reasoning.push(`Heavy Ask Resistance. L2 ceiling cap.`); }
    }

    probabilityAbove = Math.max(0, Math.min(100, probabilityAbove)); 

    let isSystemLocked = false;
    if (clockSeconds < 180 && Math.abs(realGapBps) > (atrBps * 0.8)) {
      isSystemLocked = true;
      reasoning.push(`LOCKED: Gap uncrossable within remaining time decay.`);
    } else if (probabilityAbove >= 95 || probabilityAbove <= 5) {
      isSystemLocked = true;
    }

    let prediction = lockedPredictionRef.current;
    let recommendedPrediction = prediction;       
    
    if (isObservationPhase) {
      prediction = "ANALYZING";
      recommendedPrediction = "ANALYZING";
    } else {
      if (prediction === "YES") {
        if (probabilityAbove <= 25) recommendedPrediction = "NO";
        else if (probabilityAbove <= 45) recommendedPrediction = "SIT OUT";
      } else if (prediction === "NO") {
        if (probabilityAbove >= 75) recommendedPrediction = "YES";
        else if (probabilityAbove >= 55) recommendedPrediction = "SIT OUT";
      } else {
        if (probabilityAbove >= 58) recommendedPrediction = "YES";
        else if (probabilityAbove <= 42) recommendedPrediction = "NO";
        else recommendedPrediction = "SIT OUT";
      }
      if (isSystemLocked) recommendedPrediction = realGapBps > 0 ? "YES" : "NO";
    }

    let predictionReason = "";
    if (prediction === "ANALYZING") {
      predictionReason = "Calibrating early momentum indicators.";
    } else if (prediction === "SIT OUT") {
      if (recommendedPrediction === "YES") predictionReason = "Bull trajectory detected. Await confirmation.";
      else if (recommendedPrediction === "NO") predictionReason = "Bear trajectory detected. Await confirmation.";
      else predictionReason = "Spread deadlocked near VWAP.";
    } else if (prediction === "YES") {
      if (recommendedPrediction === "NO") predictionReason = "REVERSAL DETECTED! Awaiting confirmation to flip NO.";
      else if (realGapBps > 0) predictionReason = "Position safe. Volume accelerating trend to window close.";
      else predictionReason = "Position negative, but indicators predict recovery sweep.";
    } else if (prediction === "NO") {
      if (recommendedPrediction === "YES") predictionReason = "REVERSAL DETECTED! Awaiting confirmation to flip YES.";
      else if (realGapBps < 0) predictionReason = "Position safe. Volume accelerating trend to window close.";
      else predictionReason = "Position negative, but indicators predict recovery dump.";
    }

    // --- V11 TARA TIME-DECAYED ADVISOR LOGIC ---
    let tradeAction = "STAY PUT / SIT OUT";
    let tradeReason = "Odds near 50/50. Wait for clear momentum.";
    let actionColor = "text-zinc-400";
    let actionBg = "bg-zinc-500/10 border-zinc-500/30";
    
    let hasAction = false, actionButtonLabel = "", actionTarget = "", actionProb = 0;

    const bbOverbought = bb && currentPrice >= bb.upper;
    const bbOversold = bb && currentPrice <= bb.lower;
    
    // V11 Dynamic Stop Loss: Starts at 0.55x ATR, strangles tightly to 0.15x ATR at window end
    const dynamicStopLoss = atrBps * (0.15 + (timeDecayFactor * 0.40)); 

    if (prediction === "ANALYZING") {
      tradeAction = "CALIBRATING..."; tradeReason = "Parsing first 10s of data.";
      actionColor = "text-blue-400"; actionBg = "bg-blue-500/10 border-blue-500/30";
    } 
    else if (prediction === "SIT OUT") {
      if (recommendedPrediction === "YES") {
        tradeAction = "ENTER EARLY (MAX ODDS)"; tradeReason = "Fast momentum dictates YES finish.";
        actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
        hasAction = true; actionButtonLabel = "CONFIRM ENTRY: 'YES'"; actionTarget = "YES"; actionProb = probabilityAbove;
      } else if (recommendedPrediction === "NO") {
        tradeAction = "ENTER EARLY (MAX ODDS)"; tradeReason = "Fast momentum dictates NO finish.";
        actionColor = "text-rose-400"; actionBg = "bg-rose-500/10 border-rose-500/30";
        hasAction = true; actionButtonLabel = "CONFIRM ENTRY: 'NO'"; actionTarget = "NO"; actionProb = 100 - probabilityAbove;
      }
    }
    else if (prediction === "YES") {
      const isBleeding = realGapBps < -dynamicStopLoss || realGapBps < -3.5;
      
      if (recommendedPrediction === "NO" || (shortTermSlope < 0 && (volumeSurge > 1.3 || tickSlope < -0.8)) || bbOverbought || imbalanceDelta < -1.5) {
        tradeAction = "FAST REVERSAL (SHIFT)"; tradeReason = bbOverbought ? "Bollinger pierced. Snap-back incoming." : "Momentum collapse/spoofing detected. Reverse to NO.";
        actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
        hasAction = true; actionButtonLabel = "REVERSE TO 'NO'"; actionTarget = "NO"; actionProb = 100 - probabilityAbove;
      }
      else if (isBleeding && tickSlope < 0) {
        tradeAction = "🚨 EMERGENCY BAILOUT"; tradeReason = `Bleeding past hard stop (-${dynamicStopLoss.toFixed(1)} bps). Cut immediately.`;
        actionColor = "text-rose-500"; actionBg = "bg-rose-500/20 border-rose-500/50 animate-pulse";
        hasAction = true; actionButtonLabel = "BAILOUT NOW"; actionTarget = "SIT OUT";
      }
      else if (probabilityAbove <= 30) {
        tradeAction = "CUT LOSSES"; tradeReason = "Thesis invalidated. Cash out.";
        actionColor = "text-rose-500"; actionBg = "bg-rose-500/10 border-rose-500/30";
        hasAction = true; actionButtonLabel = "CASHOUT (SIT OUT)"; actionTarget = "SIT OUT";
      }
      else if (probabilityAbove >= 75) {
        tradeAction = "SECURE PROFIT"; tradeReason = "Tracking perfectly. Lock in gains early.";
        actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
        hasAction = true; actionButtonLabel = "EXECUTE CASHOUT (PROFIT)"; actionTarget = "CASH";
      }
      else {
        tradeAction = "HOLD POSITION"; tradeReason = "Momentum holding trajectory.";
        actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/20";
      }
    } 
    else if (prediction === "NO") {
      const isBleeding = realGapBps > dynamicStopLoss || realGapBps > 3.5;

      if (recommendedPrediction === "YES" || (shortTermSlope > 0 && (volumeSurge > 1.3 || tickSlope > 0.8)) || bbOversold || imbalanceDelta > 1.5) {
        tradeAction = "FAST REVERSAL (SHIFT)"; tradeReason = bbOversold ? "Bollinger pierced. Snap-up incoming." : "Momentum surge/spoofing detected. Reverse to YES.";
        actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
        hasAction = true; actionButtonLabel = "REVERSE TO 'YES'"; actionTarget = "YES"; actionProb = probabilityAbove;
      }
      else if (isBleeding && tickSlope > 0) {
        tradeAction = "🚨 EMERGENCY BAILOUT"; tradeReason = `Bleeding past hard stop (+${dynamicStopLoss.toFixed(1)} bps). Cut immediately.`;
        actionColor = "text-rose-500"; actionBg = "bg-rose-500/20 border-rose-500/50 animate-pulse";
        hasAction = true; actionButtonLabel = "BAILOUT NOW"; actionTarget = "SIT OUT";
      }
      else if (probabilityAbove >= 70) {
        tradeAction = "CUT LOSSES"; tradeReason = "Thesis invalidated. Cash out.";
        actionColor = "text-rose-500"; actionBg = "bg-rose-500/10 border-rose-500/30";
        hasAction = true; actionButtonLabel = "CASHOUT (SIT OUT)"; actionTarget = "SIT OUT";
      }
      else if (probabilityAbove <= 25) {
        tradeAction = "SECURE PROFIT"; tradeReason = "Tracking perfectly. Lock in gains early.";
        actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
        hasAction = true; actionButtonLabel = "EXECUTE CASHOUT (PROFIT)"; actionTarget = "CASH";
      }
      else {
        tradeAction = "HOLD POSITION"; tradeReason = "Momentum holding trajectory.";
        actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/20";
      }
    } 

    let textColor = "text-zinc-500", confidenceDisplay = probabilityAbove.toFixed(1);
    if (prediction === "YES") { textColor = "text-emerald-400"; confidenceDisplay = probabilityAbove.toFixed(1); } 
    else if (prediction === "NO") { textColor = "text-rose-400"; confidenceDisplay = (100 - probabilityAbove).toFixed(1); } 
    else if (prediction === "ANALYZING") { textColor = "text-blue-400"; confidenceDisplay = (probabilityAbove > 50 ? probabilityAbove : 100 - probabilityAbove).toFixed(1); } 
    else { textColor = "text-zinc-400"; confidenceDisplay = (probabilityAbove > 50 ? probabilityAbove : 100 - probabilityAbove).toFixed(1); }

    const price1hAgo = history[4]?.c || currentPrice; 
    const hourlySlope = currentPrice - price1hAgo;
    let simulatedPrice = currentPrice;
    let projections = [];
    const driftModifier = (orderBook.imbalance > 1 ? 1.2 : 0.8) * 0.6; 

    for(let i=1; i<=4; i++) {
        const projTime = new Date(); projTime.setHours(timeState.currentHour + i, 0, 0, 0);
        const timeLabel = projTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        simulatedPrice += (hourlySlope * driftModifier + (sentimentScore * 20));
        projections.push({ time: timeLabel, price: simulatedPrice });
    }

    return { 
      confidence: confidenceDisplay, prediction, predictionReason, reasoning, textColor, rawProbAbove: probabilityAbove,
      tradeAction, tradeReason, actionColor, actionBg, hasAction, actionButtonLabel, actionTarget, actionProb,
      realGapBps, clockSeconds, isSystemLocked, atrBps, vwap, vwapGapBps, projections, binancePremium
    };
  }, [currentPrice, history, targetMargin, timeState.minsRemaining, timeState.secsRemaining, timeState.currentHour, orderBook, sentimentScore, binancePremium, fundingRate, timeState.nextWindowEST, forceRender]);

  useEffect(() => { setManualAction(null); }, [analysis?.tradeAction]);

  useEffect(() => {
    if (analysis && (analysis.prediction === "YES" || analysis.prediction === "NO" || analysis.prediction === "SIT OUT")) {
      activeCallRef.current = { prediction: analysis.prediction, strike: targetMargin };
    }
  }, [analysis?.prediction, targetMargin]);

  useEffect(() => {
    if (analysis && analysis.prediction) {
      if (lastPredRef.current && lastPredRef.current !== analysis.prediction && analysis.prediction !== "ANALYZING") {
        setEmergencyBlink(true);
        const timer = setTimeout(() => setEmergencyBlink(false), 2000);
        lastPredRef.current = analysis.prediction;
        return () => clearTimeout(timer);
      }
      lastPredRef.current = analysis.prediction;
    }
  }, [analysis?.prediction]);

  return (
    <div className="min-h-screen bg-[#111312] text-[#E8E9E4] font-sans p-2 md:p-4 flex flex-col items-center selection:bg-[#E8E9E4]/20 overflow-x-hidden">
      
      {emergencyBlink && <div className="fixed inset-0 bg-amber-500/10 pointer-events-none z-50 animate-pulse border-[8px] border-amber-500/40 transition-all duration-300" />}

      {/* --- Header --- */}
      <div className="w-full max-w-6xl flex justify-between items-end border-b border-[#E8E9E4]/10 pb-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif tracking-tight text-white flex items-center gap-2">
            Tara
            <span className="flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Tara v11.11
            </span>
          </h1>
        </div>
        <div className="text-right font-sans">
          <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest mb-0.5">Current EST</div>
          <div className="text-sm font-serif text-[#E8E9E4]/90">{timeState.currentEST || '--:--:--'}</div>
        </div>
      </div>

      <div className="w-full max-w-6xl flex flex-col gap-4">
        
        {/* --- Top Control Bar (COMPACT) --- */}
        <div className="bg-[#181A19] p-3 md:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col md:flex-row items-center justify-between gap-3 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-70"></div>

           <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="p-2 bg-[#111312] rounded-lg border border-[#E8E9E4]/5 shadow-inner">
               <Zap className={`w-5 h-5 transition-colors duration-200 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-[#E8E9E4]/40'}`} />
             </div>
             <div>
               <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-0.5">Live Spot</div>
               <div className={`text-2xl md:text-3xl font-serif tracking-tight flex items-center gap-1
                 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-white'}`}>
                 ${currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
               </div>
             </div>
           </div>

           <div className="w-px h-10 bg-[#E8E9E4]/10 hidden md:block"></div>

           <div className="flex flex-col items-start bg-[#111312] p-2.5 rounded-lg border border-[#E8E9E4]/5 shadow-inner w-full md:w-64">
             <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Set Strike</div>
             <div className="flex items-center w-full">
               <Crosshair className="w-4 h-4 text-indigo-400 mr-2 opacity-80" />
               <input
                 type="number"
                 value={targetMargin}
                 onChange={(e) => setTargetMargin(Number(e.target.value))}
                 className="bg-transparent border-none text-white font-serif text-xl w-full focus:outline-none focus:ring-0 p-0"
               />
             </div>
           </div>
           
           <div className="w-px h-10 bg-[#E8E9E4]/10 hidden md:block"></div>

           {/* --- SCORECARD (COMPACT) --- */}
           <div className="flex flex-col items-start bg-[#111312] p-2.5 rounded-lg border border-[#E8E9E4]/5 shadow-inner w-full md:w-56">
             <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1 flex justify-between w-full">
               <span className="flex items-center gap-1"><Terminal className="w-3 h-3"/> Scorecard</span>
               <button onClick={() => setScorecard({wins: 0, losses: 0})} className="hover:text-[#E8E9E4]/80">RESET</button>
             </div>
             <div className="flex items-center justify-between w-full px-1">
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1 text-[9px] text-emerald-400 mb-0.5">
                   <button onClick={() => setScorecard(s => ({...s, wins: Math.max(0, (s?.wins||0)-1)}))}>-</button>
                   WINS
                   <button onClick={() => setScorecard(s => ({...s, wins: (s?.wins||0)+1}))}>+</button>
                 </div>
                 <span className="text-xl font-serif text-emerald-400 font-bold">{scorecard?.wins || 0}</span>
               </div>
               <div className="h-6 w-px bg-[#E8E9E4]/10"></div>
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1 text-[9px] text-rose-400 mb-0.5">
                   <button onClick={() => setScorecard(s => ({...s, losses: Math.max(0, (s?.losses||0)-1)}))}>-</button>
                   LOSS
                   <button onClick={() => setScorecard(s => ({...s, losses: (s?.losses||0)+1}))}>+</button>
                 </div>
                 <span className="text-xl font-serif text-rose-400 font-bold">{scorecard?.losses || 0}</span>
               </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* MAIN OUTCOME DISPLAY */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            <div className="bg-[#181A19] p-4 md:p-6 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[380px]">
               
               <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-[#111312] border border-[#E8E9E4]/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm whitespace-nowrap">
                 <Clock className="w-3 h-3" />
                 <span className="text-[#E8E9E4]/60">{timeState.startWindowEST}-{timeState.nextWindowEST}</span>
                 <span className="text-[#E8E9E4] ml-1">{timeState.minsRemaining}m {timeState.secsRemaining}s</span>
               </div>

               {isLoading || !analysis ? (
                 <div className="text-xl font-serif text-[#E8E9E4]/30 animate-pulse mt-8 flex flex-col items-center">
                    <span className="mb-2">Booting Primary Engine...</span>
                    <span className="text-[10px] font-sans opacity-50 uppercase tracking-widest">Routing through Coinbase API</span>
                 </div>
               ) : (
                 <div className="flex flex-col items-center w-full mt-6">
                   
                   <div className="bg-[#111312] border border-[#E8E9E4]/10 p-3 rounded-lg font-mono text-[11px] text-[#E8E9E4]/60 mb-4 w-full max-w-[400px] mx-auto shadow-inner text-left">
                     <div className="flex justify-between items-center mb-1">
                       <span>BTC: ${currentPrice?.toFixed(2)}</span>
                       <span className={`font-bold ${analysis.realGapBps > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>GAP: {analysis.realGapBps > 0 ? '+' : ''}{analysis.realGapBps.toFixed(1)} bps</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span>BINANCE: {analysis.binancePremium > 0 ? '+' : ''}${analysis.binancePremium.toFixed(1)}</span>
                       <span>VWAP: {analysis.vwapGapBps > 0 ? '+' : ''}{analysis.vwapGapBps.toFixed(1)} bps</span>
                     </div>
                   </div>

                   <h2 className={`text-3xl md:text-5xl font-serif font-bold leading-none tracking-tight ${analysis.textColor} mb-2 drop-shadow-sm transition-all flex items-center justify-center gap-3 uppercase`}>
                     <span className="opacity-40 text-xl md:text-2xl font-sans">{`>>`}</span>
                     {analysis.prediction}
                     {analysis.isSystemLocked && <span className="opacity-90 text-xl md:text-2xl"> - LOCK</span>}
                     <span className="opacity-40 text-xl md:text-2xl font-sans">{`<<`}</span>
                   </h2>

                   <p className="text-xs text-[#E8E9E4]/50 font-sans max-w-sm mx-auto mb-4 px-2">
                     {analysis.predictionReason}
                   </p>

                   {/* INTERACTIVE TRADE ADVISOR (COMPACT) */}
                   <div className={`mb-4 w-full max-w-[400px] p-4 rounded-xl border-[1.5px] ${analysis.actionBg} transition-colors flex flex-col items-center text-center shadow-sm`}>
                     <div className="flex items-center gap-1.5 mb-1.5">
                       <BellRing className={`w-3.5 h-3.5 ${analysis.actionColor}`} />
                       <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 text-[#E8E9E4]">Advisor</span>
                     </div>
                     <div className={`text-lg font-serif font-bold mb-1 ${analysis.actionColor} uppercase`}>{analysis.tradeAction}</div>
                     <p className="text-[11px] opacity-80 text-[#E8E9E4] mb-3">{analysis.tradeReason}</p>

                     {analysis.hasAction && (
                       <div className="w-full pt-3 border-t border-[#E8E9E4]/10">
                          {manualAction === analysis.tradeAction ? (
                             <div className="w-full bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                               <CheckCircle className="w-3.5 h-3.5" /> Executed
                             </div>
                          ) : (
                             <button 
                               onClick={() => {
                                 setManualAction(analysis.tradeAction);
                                 if (analysis.prediction === "YES" || analysis.prediction === "NO") {
                                   const isWin = (analysis.prediction === "YES" && currentPrice > targetMargin) || (analysis.prediction === "NO" && currentPrice < targetMargin);
                                   setScorecard(s => ({ ...s, wins: (s?.wins||0) + (isWin?1:0), losses: (s?.losses||0) + (isWin?0:1) }));
                                 }
                                 if (analysis.actionTarget) {
                                   lockedPredictionRef.current = analysis.actionTarget === "CASH" ? "SIT OUT" : analysis.actionTarget;
                                   setForceRender(prev => prev + 1);
                                 }
                               }}
                               className={`w-full py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest border transition-all hover:brightness-125 ${
                                 analysis.actionColor.includes('rose') ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                                 analysis.actionColor.includes('amber') ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                                 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                               }`}
                             >
                               {analysis.actionButtonLabel}
                             </button>
                          )}
                       </div>
                     )}
                   </div>

                   <div className="flex items-center justify-center gap-6 border-t border-[#E8E9E4]/10 pt-4 mt-auto w-full">
                     <div>
                       <div className="text-[9px] font-bold uppercase tracking-widest opacity-50">Confidence</div>
                       <div className="text-xl font-serif text-white">{analysis.confidence}%</div>
                     </div>
                     <div className="w-px h-6 bg-[#E8E9E4]/10"></div>
                     <div>
                       <div className="text-[9px] font-bold uppercase tracking-widest opacity-50">L2 Imbalance</div>
                       <div className="text-xl font-serif text-white">{orderBook.imbalance.toFixed(2)}x</div>
                     </div>
                   </div>
                 </div>
               )}
            </div>

            {/* Hourly Forecast */}
            {analysis && (
              <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md">
                <h2 className="text-[10px] font-medium text-[#E8E9E4]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Forecast
                </h2>
                <div className="grid grid-cols-4 gap-2">
                  {analysis.projections.map((proj, idx) => (
                    <div key={idx} className="bg-[#111312] rounded-lg p-2 text-center border border-[#E8E9E4]/5">
                      <div className="text-[9px] text-[#E8E9E4]/40 font-bold uppercase mb-1">{proj.time}</div>
                      <div className="text-sm font-serif text-purple-100">${proj.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            {/* System Logs */}
            {analysis && (
              <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex-1">
                <h2 className="text-[10px] font-medium text-[#E8E9E4]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" /> Tara Logs
                </h2>
                <div className="space-y-2 font-mono h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                  {analysis.reasoning.map((reason, idx) => (
                    <div key={idx} className="bg-[#111312] p-2.5 rounded-lg text-[9.5px] text-[#E8E9E4]/70 flex items-start gap-2 border border-[#E8E9E4]/5 uppercase">
                      <span className="text-emerald-500 mt-0.5">{`>`}</span>
                      <span className="leading-snug">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <div className="flex-1 bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 text-center">
                 <div className="text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-1">PROB ABOVE</div>
                 <div className="text-xl font-serif text-indigo-200">{analysis ? `${analysis.rawProbAbove.toFixed(0)}%` : '--%'}</div>
              </div>
              <div className="flex-1 bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 text-center">
                 <div className="text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-1">PROB BELOW</div>
                 <div className="text-xl font-serif text-indigo-200">{analysis ? `${(100 - analysis.rawProbAbove).toFixed(0)}%` : '--%'}</div>
              </div>
            </div>

            {/* News */}
            <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-[10px] font-medium text-[#E8E9E4]/60 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" /> Live Feeds
                </h2>
              </div>
              <div className="space-y-3">
                {newsEvents.length === 0 ? (
                   <div className="text-xs text-[#E8E9E4]/40 italic">Scanning...</div>
                ) : (
                  newsEvents.slice(0,3).map((news, i) => (
                    <div key={i} className="border-l-[1.5px] border-[#E8E9E4]/20 pl-2 py-0.5">
                      <a href={news.url} target="_blank" rel="noreferrer" className="text-[11px] text-[#E8E9E4]/90 hover:text-white line-clamp-2 leading-tight">
                        {news.title}
                      </a>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(232, 233, 228, 0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(232, 233, 228, 0.2); }
      `}} />
    </div>
  );
}
