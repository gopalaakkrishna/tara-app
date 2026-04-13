import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Crosshair, BarChart2, Zap, ArrowUpRight, ArrowDownRight, Globe, TrendingUp, BellRing, Terminal, CheckCircle, MessageSquare, X, DollarSign, AlertTriangle } from 'lucide-react';

// --- Advanced Technical Indicator Utilities ---
const calculateVWAP = (history) => {
  let typicalPriceVolume = 0; let totalVolume = 0;
  history.forEach(candle => {
    const typicalPrice = (candle.h + candle.l + candle.c) / 3;
    typicalPriceVolume += typicalPrice * candle.v; totalVolume += candle.v;
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
    if (diff > 0) gains += diff; else losses -= diff;
  }
  const avgGain = gains / period; const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
};

const calculateATR = (history, period = 14) => {
  if (history.length < period + 1) return 0;
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    const high = history[i].h; const low = history[i].l; const prevClose = history[i + 1].c;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
};

const calculateEMA = (data, period) => {
  if (data.length < period) return null;
  const k = 2 / (period + 1); let ema = data[data.length - 1]; 
  for (let i = data.length - 2; i >= 0; i--) { ema = (data[i] * k) + (ema * (1 - k)); }
  return ema;
};

const BULLISH_WORDS = ['surge', 'bull', 'etf', 'approve', 'buy', 'high', 'adoption', 'integration', 'soars', 'record', 'growth', 'positive'];
const BEARISH_WORDS = ['ban', 'hack', 'sec', 'drop', 'bear', 'sell', 'low', 'crackdown', 'lawsuit', 'crash', 'negative', 'plunge'];

export default function App() {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [tickDirection, setTickDirection] = useState(null);
  
  const prevPriceRef = useRef(null);
  const currentPriceRef = useRef(null);
  const tickHistoryRef = useRef([]); 
  const prevImbalanceRef = useRef(1); 

  const [history, setHistory] = useState([]); 
  const [orderBook, setOrderBook] = useState({ localBuy: 0, localSell: 0, imbalance: 1 });
  const [newsEvents, setNewsEvents] = useState([]);
  const [sentimentScore, setSentimentScore] = useState(0);
  
  const [binancePremium, setBinancePremium] = useState(0);
  const [fundingRate, setFundingRate] = useState(0); 

  // --- V13 User Inputs ---
  const [targetMargin, setTargetMargin] = useState(71584.69);
  const [betAmount, setBetAmount] = useState(50);
  const [maxPayout, setMaxPayout] = useState(100);
  const [currentOffer, setCurrentOffer] = useState(""); // Live Market Cashout Offer

  const [timeState, setTimeState] = useState({ currentEST: '', startWindowEST: '', nextWindowEST: '', minsRemaining: 0, secsRemaining: 0, currentHour: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const lockedPredictionRef = useRef("SIT OUT");
  const activeCallRef = useRef({ prediction: "SIT OUT", strike: 0 });
  
  // Safe Initialization of Scorecard
  const [scorecard, setScorecard] = useState(() => {
    const baseline = { wins: 32, losses: 30 };
    try {
      const savedScore = localStorage.getItem('btcOracleScorecard');
      if (savedScore) {
        const parsed = JSON.parse(savedScore);
        if (parsed && typeof parsed.wins === 'number' && typeof parsed.losses === 'number') {
          if (parsed.wins + parsed.losses < 62) return baseline;
          return parsed;
        }
      }
      return baseline;
    } catch (e) { return baseline; }
  });
  
  const [manualAction, setManualAction] = useState(null);
  const [forceRender, setForceRender] = useState(0); 
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLog, setChatLog] = useState([{ role: 'tara', text: "Tara V13.1 Arbitrage Engine online. Enter the platform's Live Offer and I will tell you if they are ripping you off or overpaying." }]);
  const [chatInput, setChatInput] = useState("");
  
  const currentWindowRef = useRef("");
  const lastPredRef = useRef(null);
  const [emergencyBlink, setEmergencyBlink] = useState(false);
  const lastWindowRef = useRef("");

  useEffect(() => {
    try { localStorage.setItem('btcOracleScorecard', JSON.stringify(scorecard)); } 
    catch (e) { console.warn("Storage restricted."); }
  }, [scorecard]);

  // Window Rollover logic
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
        tickHistoryRef.current = []; 
        setCurrentOffer(""); // Reset offer on new window
      }
    }
  }, [timeState.nextWindowEST, currentPrice]);

  // Real-time Tick Data
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
          prevPriceRef.current = newPrice; currentPriceRef.current = newPrice;
          tickHistoryRef.current.push(newPrice);
          if (tickHistoryRef.current.length > 20) tickHistoryRef.current.shift();
          setCurrentPrice(newPrice);
        }
      } catch (err) {}
    };
    return () => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'unsubscribe', product_ids: ['BTC-USD'], channels: ['ticker'] })); ws.close(); };
  }, []);

  // Data Polling & Synthetic News Generation
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        let formattedHistory = [];
        try {
          const resCB = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60');
          if (resCB.ok) {
            const dataCB = await resCB.json();
            formattedHistory = dataCB.slice(0, 60).map(c => ({ l: parseFloat(c[1]), h: parseFloat(c[2]), c: parseFloat(c[4]), v: parseFloat(c[5]) }));
          } else throw new Error("CB Blocked");
        } catch (e1) {
          try {
            const resCC = await fetch('https://min-api.cryptocompare.com/data/v2/histominute?fsym=BTC&tsym=USD&limit=60&aggregate=1');
            const dataCC = await resCC.json();
            if (dataCC?.Data?.Data) formattedHistory = dataCC.Data.Data.map(c => ({ h: parseFloat(c.high), l: parseFloat(c.low), c: parseFloat(c.close), v: parseFloat(c.volumeto) })).reverse();
          } catch (e2) {}
        }

        if (formattedHistory.length > 0) {
          setHistory(formattedHistory);
          if (currentPriceRef.current === null) { setCurrentPrice(formattedHistory[0].c); currentPriceRef.current = formattedHistory[0].c; }
        }

        let currentCoinbaseRef = currentPriceRef.current;
        let currentImbalance = 1;

        try {
          const resOb = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/book?level=2');
          const dataOb = await resOb.json();
          if (dataOb?.bids && dataOb?.asks) {
            let localBuy = 0, localSell = 0;
            dataOb.bids.forEach(([p, s]) => { if (p <= targetMargin && p >= targetMargin - 150) localBuy += parseFloat(s); });
            dataOb.asks.forEach(([p, s]) => { if (p >= targetMargin && p <= targetMargin + 150) localSell += parseFloat(s); });
            currentImbalance = localSell === 0 ? 1 : localBuy / localSell;
            prevImbalanceRef.current = orderBook.imbalance; 
            setOrderBook({ localBuy, localSell, imbalance: currentImbalance });
          }
        } catch (err) {}

        try {
          const resBinance = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
          const dataBinance = await resBinance.json();
          if (dataBinance?.price && currentCoinbaseRef) setBinancePremium(parseFloat(dataBinance.price) - currentCoinbaseRef);
        } catch (e) {}

        setIsLoading(false);
        
        let syntheticNews = [];
        if (currentImbalance > 1.5) syntheticNews.push({ title: `🐋 Whale Alert: Massive Bid wall placed near $${targetMargin.toFixed(0)}`, url: "#" });
        if (currentImbalance < 0.6) syntheticNews.push({ title: `🐋 Whale Alert: Heavy Sell pressure defending $${targetMargin.toFixed(0)}`, url: "#" });
        if (formattedHistory.length > 0) {
          const rsi = calculateRSI(formattedHistory.map(x=>x.c), 14);
          if (rsi > 70) syntheticNews.push({ title: "📉 Technicals: 1m RSI entering overbought exhaustion territory.", url: "#" });
          if (rsi < 30) syntheticNews.push({ title: "📈 Technicals: 1m RSI oversold, potential bounce incoming.", url: "#" });
        }
        if (syntheticNews.length < 3) syntheticNews.push({ title: "⚡ Tara Engine: Analyzing market microstructure...", url: "#" });
        setNewsEvents(syntheticNews);

      } catch (err) { setIsLoading(false); }
    };

    fetchMarketData();
    const fastInterval = setInterval(fetchMarketData, 8000); 
    return () => clearInterval(fastInterval);
  }, [targetMargin]);

  // Clock Sync
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const currentEST = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const next15Mins = Math.ceil((now.getMinutes() + 1) / 15) * 15;
      const nextWindow = new Date(now); nextWindow.setMinutes(next15Mins, 0, 0);
      const nextWindowEST = nextWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' });
      const startWindow = new Date(nextWindow.getTime() - 15 * 60000);
      const startWindowEST = startWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' });
      const diffMs = nextWindow.getTime() - now.getTime();
      setTimeState({ currentEST, startWindowEST, nextWindowEST, minsRemaining: Math.floor(diffMs / 60000), secsRemaining: Math.floor((diffMs % 60000) / 1000), currentHour: new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours() });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- TARA V13.1 ARBITRAGE ENGINE ---
  const analysis = useMemo(() => {
    if (!currentPrice || history.length < 30 || !targetMargin) return null;

    const closes = history.map(x => x.c), volumes = history.map(x => x.v);
    const ema9 = calculateEMA(closes, 9), ema21 = calculateEMA(closes, 21);
    const rsi = calculateRSI(closes, 14);
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

    let probabilityAbove = 50; let reasoning = [];
    if (isObservationPhase) reasoning.push(`Wait ${clockSeconds - 890}s for open volatility to settle.`);

    probabilityAbove += realGapBps * (0.5 + (timeDecayFactor * 3.5)); 

    if (shortTermSlope > 0) {
      if (volumeSurge > 1.5 || tickSlope > 1.5) { probabilityAbove += 10; reasoning.push("Confirmed volume-backed uptrend."); } else { probabilityAbove += 4; }
    } else if (shortTermSlope < 0) {
      if (volumeSurge > 1.5 || tickSlope < -1.5) { probabilityAbove -= 10; reasoning.push("Confirmed volume-backed downtrend."); } else { probabilityAbove -= 4; }
    }

    if (binancePremium > 10) { probabilityAbove += 12; } else if (binancePremium < -10) { probabilityAbove -= 12; }
    if (bb) {
      if (currentPrice >= bb.upper) { probabilityAbove -= 15; reasoning.push(`Upper BB Pierced. Resistance strong.`); } 
      else if (currentPrice <= bb.lower) { probabilityAbove += 15; reasoning.push(`Lower BB Pierced. Support strong.`); }
    }
    if (rsi > 75) { probabilityAbove -= 10; } else if (rsi < 25) { probabilityAbove += 10; }
    if (vwapGapBps > 3) probabilityAbove -= 8; else if (vwapGapBps < -3) probabilityAbove += 8;

    if (imbalanceDelta < -1.5) { probabilityAbove -= 10; reasoning.push(`Order book support withdrawing.`); } 
    else if (imbalanceDelta > 1.5) { probabilityAbove += 10; reasoning.push(`Order book resistance withdrawing.`); }

    if (orderBook.imbalance > 1.8) { probabilityAbove += 15; } else if (orderBook.imbalance < 0.5) { probabilityAbove -= 15; }

    probabilityAbove = Math.max(0, Math.min(100, probabilityAbove)); 

    let isSystemLocked = false;
    if (clockSeconds < 180 && Math.abs(realGapBps) > (atrBps * 0.8)) {
      isSystemLocked = true; reasoning.push(`LOCKED: Gap uncrossable in time.`);
    }

    let prediction = lockedPredictionRef.current;
    let recommendedPrediction = prediction;       
    
    if (isObservationPhase) {
      prediction = "ANALYZING"; recommendedPrediction = "ANALYZING";
    } else {
      if (prediction === "YES") {
        if (probabilityAbove <= 35) recommendedPrediction = "NO";
        else if (probabilityAbove <= 45) recommendedPrediction = "SIT OUT";
      } else if (prediction === "NO") {
        if (probabilityAbove >= 65) recommendedPrediction = "YES";
        else if (probabilityAbove >= 55) recommendedPrediction = "SIT OUT";
      } else {
        if (probabilityAbove >= 62) recommendedPrediction = "YES";
        else if (probabilityAbove <= 38) recommendedPrediction = "NO";
        else recommendedPrediction = "SIT OUT";
      }
      if (isSystemLocked) recommendedPrediction = realGapBps > 0 ? "YES" : "NO";
    }

    let predictionReason = "";
    if (prediction === "ANALYZING") predictionReason = "Calibrating early momentum indicators.";
    else if (prediction === "SIT OUT") {
      if (recommendedPrediction === "YES") predictionReason = "Bull trajectory detected. Ready to enter.";
      else if (recommendedPrediction === "NO") predictionReason = "Bear trajectory detected. Ready to enter.";
      else predictionReason = "Spread deadlocked near VWAP. Waiting for breakout.";
    } else if (prediction === "YES") {
      if (recommendedPrediction === "NO") predictionReason = "Trend invalidated. Reversal suggested.";
      else if (realGapBps > 0) predictionReason = "Firmly in profit. Holding position steady.";
      else predictionReason = "Position negative, but macro indicators project recovery. Holding firm.";
    } else if (prediction === "NO") {
      if (recommendedPrediction === "YES") predictionReason = "Trend invalidated. Reversal suggested.";
      else if (realGapBps < 0) predictionReason = "Firmly in profit. Holding position steady.";
      else predictionReason = "Position negative, but macro indicators project recovery. Holding firm.";
    }

    let tradeAction = "STAY PUT / SIT OUT"; let tradeReason = "Odds near 50/50. Wait for clear momentum.";
    let actionColor = "text-zinc-400"; let actionBg = "bg-zinc-500/10 border-zinc-500/30";
    let hasAction = false, actionButtonLabel = "", actionTarget = "", actionProb = 0;

    const dynamicStopLoss = atrBps * (0.25 + (timeDecayFactor * 0.50)); 
    let liveEstValue = prediction === "YES" ? maxPayout * (probabilityAbove / 100) : prediction === "NO" ? maxPayout * ((100 - probabilityAbove) / 100) : 0;
    const livePnL = liveEstValue - betAmount;

    // --- V13.1 EXPECTED VALUE (EV) MARKET OFFER TRACKER ---
    const offerVal = parseFloat(currentOffer) || 0;

    if (prediction === "ANALYZING") {
      tradeAction = "CALIBRATING..."; actionColor = "text-blue-400"; actionBg = "bg-blue-500/10 border-blue-500/30";
    } 
    else if (prediction === "SIT OUT") {
      if (recommendedPrediction === "YES") {
        tradeAction = "ENTER POSITION (FIRM)"; tradeReason = "Momentum dictates YES finish. Good odds.";
        actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
        hasAction = true; actionButtonLabel = "CONFIRM ENTRY: 'YES'"; actionTarget = "YES"; actionProb = probabilityAbove;
      } else if (recommendedPrediction === "NO") {
        tradeAction = "ENTER POSITION (FIRM)"; tradeReason = "Momentum dictates NO finish. Good odds.";
        actionColor = "text-rose-400"; actionBg = "bg-rose-500/10 border-rose-500/30";
        hasAction = true; actionButtonLabel = "CONFIRM ENTRY: 'NO'"; actionTarget = "NO"; actionProb = 100 - probabilityAbove;
      }
    }
    else if (prediction === "YES" || prediction === "NO") {
      const isYES = prediction === "YES";
      const isBleeding = isYES ? (realGapBps < -dynamicStopLoss || realGapBps < -4.5) : (realGapBps > dynamicStopLoss || realGapBps > 4.5);
      const isReversalRecommended = isYES ? recommendedPrediction === "NO" : recommendedPrediction === "YES";

      // EV OVERRIDE LOGIC
      if (offerVal > 0) {
        const premium = offerVal - liveEstValue;
        
        if (premium > (maxPayout * 0.05)) { // Market is overpaying by > 5%
          tradeAction = "SELL TO MARKET (ARBITRAGE)"; 
          tradeReason = `Market is currently overpaying by $${premium.toFixed(2)} vs True Probability. Take the free money now.`;
          actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30 animate-pulse";
          hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "CASH";
        } 
        else if (offerVal > betAmount && Math.abs(realGapBps) < atrBps * 0.6 && clockSeconds > 300) {
          tradeAction = "SECURE PROFIT (HIGH VOL)"; 
          tradeReason = `Market is offering $${(offerVal - betAmount).toFixed(2)} profit, but momentum is unstable. Cash out safely.`;
          actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
          hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "CASH";
        } 
        else if (premium < 0 && !isBleeding && !isReversalRecommended) {
          tradeAction = "HOLD FIRM (UNDERVALUED)"; 
          tradeReason = `Market offer is underpricing your true odds by $${Math.abs(premium).toFixed(2)}. Do not sell to them yet.`;
          actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/20";
        }
        else if (isBleeding || isReversalRecommended) {
           // Fall through to standard Stop Loss logic below
        }
      }

      // If EV override didn't trigger, proceed with standard Zen logic
      if (tradeAction === "STAY PUT / SIT OUT" || tradeAction === "HOLD FIRM") {
        if (isReversalRecommended) {
          tradeAction = "REVERSE POSITION"; tradeReason = `Probability shifted. Safely swap to ${isYES ? 'NO' : 'YES'}.`;
          actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
          hasAction = true; actionButtonLabel = `REVERSE TO '${isYES ? 'NO' : 'YES'}'`; actionTarget = isYES ? "NO" : "YES"; actionProb = isYES ? 100 - probabilityAbove : probabilityAbove;
        }
        else if (isBleeding) {
          tradeAction = "CUT LOSSES (RISK LIMIT)"; tradeReason = "Position drifted past risk tolerance. Recommend exit.";
          actionColor = "text-rose-500"; actionBg = "bg-rose-500/10 border-rose-500/30";
          hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "SIT OUT";
        }
        else if ((isYES ? probabilityAbove >= 85 : probabilityAbove <= 15) && offerVal === 0) {
          tradeAction = "SECURE PROFIT"; tradeReason = "Tracking perfectly. Lock in gains when ready.";
          actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
          hasAction = true; actionButtonLabel = "EXECUTE CASHOUT (PROFIT)"; actionTarget = "CASH";
        }
        else if (offerVal === 0) {
          tradeAction = "HOLD FIRM"; tradeReason = "Holding position. Ignoring minor noise.";
          actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/20";
        }
      }
    } 

    let textColor = "text-zinc-500", confidenceDisplay = probabilityAbove.toFixed(1);
    if (prediction === "YES") { textColor = "text-emerald-400"; confidenceDisplay = probabilityAbove.toFixed(1); } 
    else if (prediction === "NO") { textColor = "text-rose-400"; confidenceDisplay = (100 - probabilityAbove).toFixed(1); } 

    // --- HOURLY FORECAST (RESTORED) ---
    const price1hAgo = history[history.length - 1]?.c || currentPrice; 
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
      realGapBps, clockSeconds, isSystemLocked, atrBps, livePnL, liveEstValue, bb, projections
    };
  }, [currentPrice, history, targetMargin, timeState.minsRemaining, timeState.secsRemaining, timeState.currentHour, orderBook, binancePremium, forceRender, betAmount, maxPayout, currentOffer]);

  const executeManualAction = (actionLabel, targetState) => {
    setManualAction(actionLabel);
    if (analysis.prediction === "YES" || analysis.prediction === "NO") {
      const isWin = (analysis.prediction === "YES" && currentPrice > targetMargin) || (analysis.prediction === "NO" && currentPrice < targetMargin);
      setScorecard(s => ({ ...s, wins: (s?.wins||0) + (isWin?1:0), losses: (s?.losses||0) + (isWin?0:1) }));
    }
    if (targetState) {
      lockedPredictionRef.current = targetState === "CASH" ? "SIT OUT" : targetState;
      setForceRender(prev => prev + 1);
      setCurrentOffer(""); // Reset offer after action
    }
  };

  const handleChatSubmit = (e) => {
    if (e.key === 'Enter' && chatInput.trim()) {
      const userText = chatInput.trim().toLowerCase();
      setChatLog(prev => [...prev, { role: 'user', text: chatInput }]);
      setChatInput("");
      
      setTimeout(() => {
        let reply = "";
        if (userText.includes("why")) reply = `I'm seeing a gap of ${analysis.realGapBps.toFixed(1)} bps. ` + (analysis.reasoning.length > 0 ? analysis.reasoning.join(" ") : "Indicators are neutral.");
        else if (userText.includes("pnl") || userText.includes("profit") || userText.includes("loss")) reply = analysis.prediction === "SIT OUT" ? "You are not in a trade. No PnL to calculate." : `At current odds, your contract is worth ~$${analysis.liveEstValue.toFixed(2)}. Your PnL is $${analysis.livePnL.toFixed(2)}.`;
        else if (userText.includes("stop loss") || userText.includes("risk")) reply = `My hard bailout limit is tied to current ATR. If we bleed past ${analysis.atrBps.toFixed(1)} bps, I will force a cashout.`;
        else if (userText.includes("score")) reply = `We are currently at ${scorecard.wins} Wins and ${scorecard.losses} Losses.`;
        else reply = `My probability engine places YES at ${analysis.rawProbAbove.toFixed(1)}%. Currently, my advice is to ${analysis.tradeAction}.`;
        
        setChatLog(prev => [...prev, { role: 'tara', text: reply }]);
      }, 500);
    }
  };

  useEffect(() => { setManualAction(null); }, [analysis?.tradeAction]);
  useEffect(() => { if (analysis && (analysis.prediction === "YES" || analysis.prediction === "NO" || analysis.prediction === "SIT OUT")) activeCallRef.current = { prediction: analysis.prediction, strike: targetMargin }; }, [analysis?.prediction, targetMargin]);
  useEffect(() => {
    if (analysis && analysis.prediction) {
      if (lastPredRef.current && lastPredRef.current !== analysis.prediction && analysis.prediction !== "ANALYZING") {
        setEmergencyBlink(true); setTimeout(() => setEmergencyBlink(false), 2000);
      }
      lastPredRef.current = analysis.prediction;
    }
  }, [analysis?.prediction]);

  return (
    <div className="min-h-screen bg-[#111312] text-[#E8E9E4] font-sans p-2 md:p-4 flex flex-col items-center selection:bg-[#E8E9E4]/20 overflow-x-hidden">
      {emergencyBlink && <div className="fixed inset-0 bg-amber-500/5 pointer-events-none z-50 animate-pulse border-[4px] border-amber-500/20 transition-all duration-500" />}

      {/* Header */}
      <div className="w-full max-w-6xl flex justify-between items-end border-b border-[#E8E9E4]/10 pb-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif tracking-tight text-white flex items-center gap-2">
            Tara
            <span className="flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V13.1 EV Tracker
            </span>
          </h1>
        </div>
        <div className="text-right font-sans">
          <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest mb-0.5">Current EST</div>
          <div className="text-sm font-serif text-[#E8E9E4]/90">{timeState.currentEST || '--:--:--'}</div>
        </div>
      </div>

      <div className="w-full max-w-6xl flex flex-col gap-4">
        
        {/* Top Control Bar */}
        <div className="bg-[#181A19] p-3 md:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-70"></div>

           {/* Live Spot */}
           <div className="flex items-center gap-3 w-auto">
             <div className="p-2 bg-[#111312] rounded-lg border border-[#E8E9E4]/5 shadow-inner">
               <Zap className={`w-5 h-5 transition-colors duration-200 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-[#E8E9E4]/40'}`} />
             </div>
             <div>
               <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-0.5">Live Spot</div>
               <div className={`text-2xl md:text-3xl font-serif tracking-tight flex items-center gap-1 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-white'}`}>
                 ${currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
               </div>
             </div>
           </div>
           <div className="w-px h-10 bg-[#E8E9E4]/10 hidden lg:block"></div>

           {/* Strike, Bet & Offer Setup */}
           <div className="flex items-center gap-4 w-full lg:w-auto bg-[#111312] p-2.5 rounded-lg border border-[#E8E9E4]/5 shadow-inner flex-wrap md:flex-nowrap">
             <div className="flex flex-col items-start pr-4 border-r border-[#E8E9E4]/10">
               <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Set Strike</div>
               <div className="flex items-center">
                 <Crosshair className="w-3.5 h-3.5 text-indigo-400 mr-1.5 opacity-80" />
                 <input type="number" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="bg-transparent border-none text-white font-serif text-lg w-28 focus:outline-none p-0" />
               </div>
             </div>
             <div className="flex flex-col items-start pr-4 border-r border-[#E8E9E4]/10">
               <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Bet / Payout</div>
               <div className="flex items-center gap-1 text-white font-serif text-sm">
                 $<input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-10 text-center outline-none" />
                 <span className="text-[#E8E9E4]/40 mx-1">/</span>
                 $<input type="number" value={maxPayout} onChange={(e) => setMaxPayout(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-12 text-center outline-none" />
               </div>
             </div>
             <div className="flex flex-col items-start">
               <div className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-medium mb-1">Live Market Offer</div>
               <div className="flex items-center gap-1 text-emerald-400 font-serif text-sm">
                 $<input type="number" value={currentOffer} onChange={(e) => setCurrentOffer(e.target.value)} placeholder="0.00" className="bg-transparent border-b border-emerald-500/30 focus:border-emerald-400 w-16 text-center outline-none placeholder-emerald-900" />
               </div>
             </div>
           </div>
           <div className="w-px h-10 bg-[#E8E9E4]/10 hidden lg:block"></div>

           {/* Scorecard */}
           <div className="flex flex-col items-start bg-[#111312] p-2.5 rounded-lg border border-[#E8E9E4]/5 shadow-inner w-full lg:w-48">
             <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1 flex justify-between w-full">
               <span className="flex items-center gap-1"><Terminal className="w-3 h-3"/> Scorecard</span>
             </div>
             <div className="flex items-center justify-between w-full px-1">
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1 text-[9px] text-emerald-400 mb-0.5">
                   <button onClick={() => setScorecard(s => ({...s, wins: Math.max(0, (s?.wins||0)-1)}))}>-</button> WINS <button onClick={() => setScorecard(s => ({...s, wins: (s?.wins||0)+1}))}>+</button>
                 </div>
                 <span className="text-xl font-serif text-emerald-400 font-bold">{scorecard?.wins || 0}</span>
               </div>
               <div className="h-6 w-px bg-[#E8E9E4]/10"></div>
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1 text-[9px] text-rose-400 mb-0.5">
                   <button onClick={() => setScorecard(s => ({...s, losses: Math.max(0, (s?.losses||0)-1)}))}>-</button> LOSS <button onClick={() => setScorecard(s => ({...s, losses: (s?.losses||0)+1}))}>+</button>
                 </div>
                 <span className="text-xl font-serif text-rose-400 font-bold">{scorecard?.losses || 0}</span>
               </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* MAIN OUTCOME DISPLAY */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            <div className="bg-[#181A19] p-4 md:p-6 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[420px]">
               
               <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-[#111312] border border-[#E8E9E4]/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm whitespace-nowrap">
                 <Clock className="w-3 h-3" />
                 <span className="text-[#E8E9E4]/60">{timeState.startWindowEST}-{timeState.nextWindowEST}</span>
                 <span className="text-[#E8E9E4] ml-1">{timeState.minsRemaining}m {timeState.secsRemaining}s</span>
               </div>

               {/* Force Pull Out Button */}
               {analysis && analysis.prediction !== "SIT OUT" && analysis.prediction !== "ANALYZING" && (
                 <button 
                   onClick={() => executeManualAction("MANUAL PULL OUT", "SIT OUT")}
                   className="absolute top-3 right-3 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                 >
                   <AlertTriangle className="w-3 h-3" /> Force Pull Out
                 </button>
               )}

               {isLoading || !analysis ? (
                 <div className="text-xl font-serif text-[#E8E9E4]/30 animate-pulse mt-8">Connecting to Datastream...</div>
               ) : (
                 <div className="flex flex-col items-center w-full mt-6">
                   
                   <div className="bg-[#111312] border border-[#E8E9E4]/10 p-3 rounded-lg font-mono text-[11px] text-[#E8E9E4]/60 mb-4 w-full max-w-[400px] mx-auto shadow-inner text-left">
                     <div className="flex justify-between items-center mb-1">
                       <span>BTC: ${currentPrice?.toFixed(2)}</span>
                       <span className={`font-bold ${analysis.realGapBps > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>GAP: {analysis.realGapBps > 0 ? '+' : ''}{analysis.realGapBps.toFixed(1)} bps</span>
                     </div>
                     <div className="flex justify-between items-center">
                       <span>BINANCE: {binancePremium > 0 ? '+' : ''}${binancePremium.toFixed(1)}</span>
                       <span>L2 IMBALANCE: {orderBook.imbalance.toFixed(2)}x</span>
                     </div>
                   </div>

                   <h2 className={`text-4xl md:text-6xl font-serif font-bold leading-none tracking-tight ${analysis.textColor} mb-2 drop-shadow-sm transition-all flex items-center justify-center gap-3 uppercase`}>
                     <span className="opacity-40 text-xl md:text-3xl font-sans">{`>>`}</span>
                     {analysis.prediction}
                     {analysis.isSystemLocked && <span className="opacity-90 text-xl md:text-3xl"> - LOCK</span>}
                     <span className="opacity-40 text-xl md:text-3xl font-sans">{`<<`}</span>
                   </h2>

                   <p className="text-xs text-[#E8E9E4]/50 font-sans max-w-sm mx-auto mb-4 px-2 h-8">
                     {analysis.predictionReason}
                   </p>

                   {/* LIVE PnL TRACKER */}
                   {analysis.prediction !== "SIT OUT" && analysis.prediction !== "ANALYZING" && (
                     <div className={`flex items-center gap-4 mb-4 px-4 py-2 rounded-lg border ${analysis.livePnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                       <div className="flex flex-col">
                         <span className="text-[9px] uppercase tracking-widest opacity-60">Tara's True Value</span>
                         <span className="font-serif text-lg">${analysis.liveEstValue.toFixed(2)}</span>
                       </div>
                       <div className="w-px h-6 bg-[#E8E9E4]/20"></div>
                       <div className="flex flex-col">
                         <span className="text-[9px] uppercase tracking-widest opacity-60">Est PnL</span>
                         <span className={`font-serif font-bold text-lg ${analysis.livePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {analysis.livePnL >= 0 ? '+' : '-'}${Math.abs(analysis.livePnL).toFixed(2)}
                         </span>
                       </div>
                     </div>
                   )}

                   {/* INTERACTIVE TRADE ADVISOR */}
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
                               <CheckCircle className="w-3.5 h-3.5" /> Action Logged
                             </div>
                          ) : (
                             <button 
                               onClick={() => executeManualAction(analysis.tradeAction, analysis.actionTarget)}
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
                 </div>
               )}
            </div>

            {/* Hourly Forecast Restored */}
            {analysis && (
              <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md">
                <h2 className="text-[10px] font-medium text-[#E8E9E4]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Hourly Forecast Projections
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
            
            {/* Live Feeds */}
            <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col h-[200px]">
              <div className="flex justify-between items-center mb-3 border-b border-[#E8E9E4]/10 pb-2">
                <h2 className="text-[10px] font-medium text-[#E8E9E4]/60 uppercase tracking-widest flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" /> Tara Live Wire
                </h2>
              </div>
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
                {newsEvents.length === 0 ? (
                   <div className="text-[11px] text-[#E8E9E4]/40 italic">Generating market intel...</div>
                ) : (
                  newsEvents.map((news, i) => (
                    <div key={i} className="border-l-[2px] border-indigo-500/40 pl-2 py-0.5">
                      <span className="text-[11.5px] text-[#E8E9E4]/90 leading-tight">
                        {news.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 text-center">
                 <div className="text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-1">PROB ABOVE</div>
                 <div className="text-2xl font-serif text-indigo-300">{analysis ? `${analysis.rawProbAbove.toFixed(0)}%` : '--%'}</div>
              </div>
              <div className="flex-1 bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 text-center">
                 <div className="text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-1">PROB BELOW</div>
                 <div className="text-2xl font-serif text-rose-300">{analysis ? `${(100 - analysis.rawProbAbove).toFixed(0)}%` : '--%'}</div>
              </div>
            </div>

            {/* System Logs */}
            {analysis && (
              <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex-1">
                <h2 className="text-[10px] font-medium text-[#E8E9E4]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" /> Math Engine Logs
                </h2>
                <div className="space-y-2 font-mono h-[120px] overflow-y-auto pr-1 custom-scrollbar">
                  {analysis.reasoning.map((reason, idx) => (
                    <div key={idx} className="bg-[#111312] p-2 rounded-md text-[9px] text-[#E8E9E4]/70 flex items-start gap-2 border border-[#E8E9E4]/5 uppercase">
                      <span className="text-emerald-500 mt-0.5">{`>`}</span>
                      <span className="leading-snug">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FLOATING CHAT WIDGET */}
      <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all ${isChatOpen ? 'w-80' : 'w-auto'}`}>
        {isChatOpen && (
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 shadow-2xl rounded-xl w-full mb-3 overflow-hidden flex flex-col h-96">
            <div className="bg-[#111312] p-3 flex justify-between items-center border-b border-[#E8E9E4]/10">
              <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-400" /> Chat w/ Tara
              </span>
              <button onClick={() => setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111312]/50">
              {chatLog.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[10px] uppercase opacity-40 mb-1 ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>{msg.role}</span>
                  <div className={`text-xs p-2.5 rounded-lg max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-tr-none' : 'bg-[#2A2D2C] text-[#E8E9E4] border border-[#E8E9E4]/10 rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-[#111312] border-t border-[#E8E9E4]/10">
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyDown={handleChatSubmit}
                placeholder="Ask me about the trade..." 
                className="w-full bg-[#181A19] border border-[#E8E9E4]/20 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-white"
              />
            </div>
          </div>
        )}
        {!isChatOpen && (
          <button onClick={() => setIsChatOpen(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white p-3 rounded-full shadow-lg border border-indigo-400/50 flex items-center gap-2 transition-transform hover:scale-105">
            <MessageSquare className="w-5 h-5" />
          </button>
        )}
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
