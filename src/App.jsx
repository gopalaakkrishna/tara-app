import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Clock, Crosshair, BarChart2, Zap, ArrowUpRight, ArrowDownRight, Globe, TrendingUp, BellRing, Terminal, CheckCircle, MessageSquare, X, DollarSign, AlertTriangle, HelpCircle, Volume2, VolumeX, Info, Layers, Activity } from 'lucide-react';

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

export default function App() {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [tickDirection, setTickDirection] = useState(null);
  
  const prevPriceRef = useRef(null);
  const currentPriceRef = useRef(null);
  const tickHistoryRef = useRef([]); 
  const prevImbalanceRef = useRef(1); 
  const lastPriceSourceRef = useRef({ source: 'none', time: 0 });

  const [history, setHistory] = useState([]); 
  const [orderBook, setOrderBook] = useState({ localBuy: 0, localSell: 0, imbalance: 1 });
  const [takerFlow, setTakerFlow] = useState({ imbalance: 1, whaleSpotted: null }); 
  const [liquidations, setLiquidations] = useState([]); 
  const [newsEvents, setNewsEvents] = useState([]);
  const [sentimentScore, setSentimentScore] = useState(0);
  
  const [brtiPremium, setBrtiPremium] = useState(0); 

  const [targetMargin, setTargetMargin] = useState(71584.69);
  const [betAmount, setBetAmount] = useState(50);
  const [maxPayout, setMaxPayout] = useState(100);
  const [currentOffer, setCurrentOffer] = useState(""); 

  const [windowType, setWindowType] = useState('15m'); 
  const [timeState, setTimeState] = useState({ currentEST: '', startWindowEST: '', nextWindowEST: '', minsRemaining: 0, secsRemaining: 0, currentHour: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const lockedPredictionRef = useRef("SIT OUT");
  const activeCallRef = useRef({ prediction: "SIT OUT", strike: 0 });
  const hasReversedRef = useRef(false); 
  const lastAdvisedRef = useRef("SIT OUT"); 
  
  const [scorecards, setScorecards] = useState(() => {
    const baseline = { '15m': { wins: 31, losses: 1 }, '5m': { wins: 0, losses: 0 } };
    try {
      const savedScore = localStorage.getItem('btcOracleScorecardV31');
      if (savedScore) {
        const parsed = JSON.parse(savedScore);
        if (parsed['15m'] && parsed['5m']) return parsed;
      }
      return baseline;
    } catch (e) { return baseline; }
  });
  
  const [manualAction, setManualAction] = useState(null);
  const [forceRender, setForceRender] = useState(0); 
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLog, setChatLog] = useState([{ role: 'tara', text: "Tara V31 Quant Composite Engine online. I no longer rely on the physical price gap. My predictions are now driven strictly by Market Regime and AggrFlow to front-run reversals." }]);
  const [chatInput, setChatInput] = useState("");
  
  const currentWindowRef = useRef("");
  const lastPredRef = useRef(null);
  const [emergencyBlink, setEmergencyBlink] = useState(false);
  const lastWindowRef = useRef("");
  
  const [userPosition, setUserPosition] = useState(null); 
  
  const [showHelp, setShowHelp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevActionRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem('btcOracleScorecardV31', JSON.stringify(scorecards)); } 
    catch (e) { console.warn("Storage restricted."); }
  }, [scorecards]);

  const playAlertSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'bell'; 
      oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); 
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch(e) {}
  };

  const handleWindowToggle = (type) => {
    if (type === windowType) return;
    setWindowType(type);
    lockedPredictionRef.current = "SIT OUT";
    activeCallRef.current = { prediction: "SIT OUT", strike: currentPrice };
    hasReversedRef.current = false; 
    lastAdvisedRef.current = "SIT OUT";
    setUserPosition(null);
    setManualAction(null);
    setCurrentOffer("");
    lastWindowRef.current = ""; 
    setForceRender(prev => prev + 1);
  };

  const updateScore = (type, winOrLoss, amount) => {
    setScorecards(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [winOrLoss]: Math.max(0, prev[type][winOrLoss] + amount)
      }
    }));
  };

  useEffect(() => {
    if (timeState.nextWindowEST && timeState.nextWindowEST !== lastWindowRef.current) {
      if (currentPrice !== null) {
        if (lastWindowRef.current !== "") {
          const prevCall = activeCallRef.current;
          if (prevCall.prediction === "YES") {
            if (currentPrice > prevCall.strike) updateScore(windowType, 'wins', 1);
            else if (currentPrice < prevCall.strike) updateScore(windowType, 'losses', 1);
          } else if (prevCall.prediction === "NO") {
            if (currentPrice < prevCall.strike) updateScore(windowType, 'wins', 1);
            else if (currentPrice > prevCall.strike) updateScore(windowType, 'losses', 1);
          }
        }
        setTargetMargin(currentPrice);
        lockedPredictionRef.current = "SIT OUT";
        activeCallRef.current = { prediction: "SIT OUT", strike: currentPrice };
        hasReversedRef.current = false; 
        lastAdvisedRef.current = "SIT OUT";
        setUserPosition(null); 
        lastWindowRef.current = timeState.nextWindowEST;
        setManualAction(null); 
        tickHistoryRef.current = []; 
        setCurrentOffer(""); 
      }
    }
  }, [timeState.nextWindowEST, currentPrice, windowType]);

  // WEBSOCKETS (Throttled UI rendering)
  useEffect(() => {
    let wsCB = null;
    let wsBinanceLiq = null;
    let lastVisualUpdate = 0; 
    
    const updateVisualPrice = (newPrice, source) => {
      currentPriceRef.current = newPrice;
      const now = Date.now();
      lastPriceSourceRef.current = { source, time: now };

      if (now - lastVisualUpdate > 300) {
        setCurrentPrice(prev => {
          if (prev !== null && newPrice !== prev) {
            setTickDirection(newPrice > prev ? 'up' : 'down');
          }
          return newPrice;
        });
        lastVisualUpdate = now;
      }
    };

    const initWebSockets = () => {
      try {
        wsCB = new WebSocket('wss://ws-feed.exchange.coinbase.com');
        wsCB.onopen = () => wsCB.send(JSON.stringify({ type: 'subscribe', product_ids: ['BTC-USD'], channels: ['ticker'] }));
        wsCB.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ticker' && data.price) {
              const newPrice = parseFloat(data.price);
              const size = parseFloat(data.last_size) || 0;
              const isTakerBuy = data.side === 'sell'; 
              
              updateVisualPrice(newPrice, 'coinbase');
              
              const now = Date.now();
              tickHistoryRef.current.push({ p: newPrice, s: size, t: isTakerBuy ? 'B' : 'S', time: now });
              tickHistoryRef.current = tickHistoryRef.current.filter(t => now - t.time < 30000);
            }
          } catch (err) {}
        };
      } catch(e) {}

      try {
        wsBinanceLiq = new WebSocket('wss://fstream.binance.com/ws/btcusdt@forceOrder');
        wsBinanceLiq.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.e === 'forceOrder') {
              const side = data.o.S; 
              const usdValue = parseFloat(data.o.q) * parseFloat(data.o.p);
              if (usdValue > 10000) { 
                setLiquidations(prev => [...prev, { side, value: usdValue, time: Date.now() }].filter(l => Date.now() - l.time < 60000));
              }
            }
          } catch (err) {}
        };
      } catch(e) {}
    }

    initWebSockets();

    return () => { 
      if (wsCB && wsCB.readyState === WebSocket.OPEN) { wsCB.send(JSON.stringify({ type: 'unsubscribe', product_ids: ['BTC-USD'], channels: ['ticker'] })); wsCB.close(); }
      if (wsBinanceLiq && wsBinanceLiq.readyState === WebSocket.OPEN) wsBinanceLiq.close();
    };
  }, []);

  // Tape Aggregation Loop
  useEffect(() => {
    const tapeInterval = setInterval(() => {
      let takerBuys = 0; let takerSells = 0; let whaleSpotted = null;
      
      tickHistoryRef.current.forEach(t => {
        const usdValue = t.s * t.p;
        if (t.t === 'B') {
          takerBuys += usdValue;
          if (t.s > 1.5) whaleSpotted = 'BUY';
        } else {
          takerSells += usdValue;
          if (t.s > 1.5) whaleSpotted = 'SELL';
        }
      });

      const tImbalance = takerSells === 0 ? (takerBuys > 0 ? 2 : 1) : takerBuys / takerSells;
      setTakerFlow({ imbalance: tImbalance, whaleSpotted });
    }, 1000);
    return () => clearInterval(tapeInterval);
  }, []);

  // Sub-Second REST Fallback
  useEffect(() => {
    let lastUiUpdate = 0;
    const fetchSpotPrice = async () => {
      try {
        const resTicker = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker');
        const dataTicker = await resTicker.json();
        if (dataTicker.price) {
          const p = parseFloat(dataTicker.price);
          const now = Date.now();
          
          if (lastPriceSourceRef.current.source !== 'coinbase' || now - lastPriceSourceRef.current.time > 2000) {
             currentPriceRef.current = p;
             lastPriceSourceRef.current = { source: 'rest', time: now };
             
             if (now - lastUiUpdate > 300) {
               setCurrentPrice(prev => {
                 if (prev !== null && p !== prev) setTickDirection(p > prev ? 'up' : 'down');
                 return p;
               });
               lastUiUpdate = now;
             }
          }
          
          tickHistoryRef.current.push({ p, s: parseFloat(dataTicker.size || 0.1), t: 'B', time: Date.now() });
          tickHistoryRef.current = tickHistoryRef.current.filter(t => Date.now() - t.time < 30000);
        }
      } catch(e) {}
    };

    fetchSpotPrice();
    const spotInterval = setInterval(fetchSpotPrice, 1500); 
    return () => clearInterval(spotInterval);
  }, []);

  // Heavy Data Polling
  useEffect(() => {
    const fetchHeavyData = async () => {
      try {
        let formattedHistory = [];
        try {
          const resCB = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60');
          if (resCB.ok) {
            const dataCB = await resCB.json();
            formattedHistory = dataCB.slice(0, 60).map(c => ({ l: parseFloat(c[1]), h: parseFloat(c[2]), c: parseFloat(c[4]), v: parseFloat(c[5]) }));
          }
        } catch (e) {}

        if (formattedHistory.length > 0) setHistory(formattedHistory);

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
          const resBRTI = await fetch('https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD');
          const dataBRTI = await resBRTI.json();
          if (dataBRTI?.USD && currentCoinbaseRef) {
            setBrtiPremium(parseFloat(dataBRTI.USD) - currentCoinbaseRef);
          }
        } catch (e) {}

        setIsLoading(false);
      } catch (err) { 
        setIsLoading(false);
      }
    };

    fetchHeavyData();
    const heavyInterval = setInterval(fetchHeavyData, 5000); 
    return () => clearInterval(heavyInterval);
  }, [targetMargin]); 

  // News Wire Generator
  useEffect(() => {
    let syntheticNews = [];
    if (orderBook.imbalance > 1.5) syntheticNews.push({ title: `🐋 Maker Alert: Massive Limit BID wall placed near $${targetMargin.toFixed(0)}`, url: "#" });
    if (orderBook.imbalance < 0.6) syntheticNews.push({ title: `🐋 Maker Alert: Heavy Limit SELL pressure defending $${targetMargin.toFixed(0)}`, url: "#" });
    if (takerFlow.imbalance > 2.0) syntheticNews.push({ title: `🚀 Taker Alert: Aggressive Market BUYING detected on the tape.`, url: "#" });
    if (takerFlow.imbalance < 0.5) syntheticNews.push({ title: `🩸 Taker Alert: Aggressive Market SELLING detected on the tape.`, url: "#" });
    
    if (syntheticNews.length < 3) syntheticNews.push({ title: `⚡ Tara Engine: Analyzing Order Book vs Tape Divergence (${windowType.toUpperCase()})...`, url: "#" });
    setNewsEvents(syntheticNews);
  }, [orderBook.imbalance, takerFlow.imbalance, targetMargin, windowType]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const msNow = now.getTime();
      const intervalMs = (windowType === '15m' ? 15 : 5) * 60 * 1000;
      
      const nextWindowMs = Math.ceil((msNow + 500) / intervalMs) * intervalMs; 
      const nextWindow = new Date(nextWindowMs);
      const startWindow = new Date(nextWindowMs - intervalMs);
      
      const diffMs = nextWindow.getTime() - now.getTime();
      
      setTimeState({ 
        currentEST: now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }), 
        startWindowEST: startWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' }), 
        nextWindowEST: nextWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' }), 
        minsRemaining: Math.floor(diffMs / 60000), 
        secsRemaining: Math.floor((diffMs % 60000) / 1000), 
        currentHour: new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' })).getHours() 
      });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [windowType]);

  // --- TARA V31 QUANT COMPOSITE ENGINE (Benchmark Match) ---
  const analysis = useMemo(() => {
    if (!currentPrice || history.length < 30 || !targetMargin) return null;

    const is5m = windowType === '5m';
    const intervalSeconds = is5m ? 300 : 900;
    
    // V31: T+ Entry Windows
    const clockSeconds = (timeState.minsRemaining * 60) + timeState.secsRemaining;
    const timeFraction = 1 - (clockSeconds / intervalSeconds);
    const isObservationPhase = timeFraction < (is5m ? 0.2 : 0.15); // Wait for open volatility
    const isEntryWindow = timeFraction >= (is5m ? 0.2 : 0.2) && timeFraction <= (is5m ? 0.7 : 0.8);
    const isEndgameLock = timeFraction > (is5m ? 0.8 : 0.85);

    let entryWindowStatus = isObservationPhase ? "Awaiting Volatility" : isEntryWindow ? "T+ Optimal Entry" : "Window Closing";

    const closes = history.map(x => x.c), volumes = history.map(x => x.v);
    const ema9 = calculateEMA(closes, 9), ema21 = calculateEMA(closes, 21);
    const rsi = calculateRSI(closes, 14);
    const atr = calculateATR(history, 14), atrBps = (atr / currentPrice) * 10000; 
    const vwap = calculateVWAP(history);
    const bb = calculateBollingerBands(closes, 20); 

    const realGapBps = ((currentPrice - targetMargin) / targetMargin) * 10000;
    const vwapGapBps = vwap ? ((currentPrice - vwap) / vwap) * 10000 : 0;
    
    const ticks = tickHistoryRef.current;
    const tickSlope = ticks.length >= 10 ? (currentPrice - ticks[0].p) : 0;
    
    // V31.1: AggrFlow (Normalized -1.0 to 1.0)
    let aggrFlow = 0;
    if (takerFlow.imbalance > 1) aggrFlow = Math.min(1.0, (takerFlow.imbalance - 1) / 1.5);
    else if (takerFlow.imbalance < 1) aggrFlow = Math.max(-1.0, (takerFlow.imbalance - 1) / 0.5);
    
    // V31.2: Regime Detection
    const bbWidthBps = bb ? ((bb.upper - bb.lower) / bb.sma) * 10000 : 0;
    let regime = "RANGE / CHOP";
    if (bbWidthBps > (is5m ? 12 : 20) && tickSlope > 1.5 && rsi < 70) regime = "TREND UP";
    else if (bbWidthBps > (is5m ? 12 : 20) && tickSlope < -1.5 && rsi > 30) regime = "TREND DOWN";
    else if (bbWidthBps > (is5m ? 15 : 25) && rsi >= 70) regime = "BLOWOFF TOP (REVERT)";
    else if (bbWidthBps > (is5m ? 15 : 25) && rsi <= 30) regime = "PANIC DUMP (REVERT)";

    let probabilityAbove = 50; 
    let reasoning = [];
    let topDriver = "Neutral";

    // V31 CORE: Decouple physical gap from probability during the entry window.
    // We only care about internal quant drivers until the very end.
    
    let quantScoreDelta = 0;

    if (regime === "TREND UP") {
      quantScoreDelta += (aggrFlow * 25); // Follow flow
      quantScoreDelta += 10; // Trend premium
      topDriver = `Trend Continuity (${aggrFlow > 0 ? '+' : ''}${aggrFlow.toFixed(2)} AggrFlow)`;
      reasoning.push(`[REGIME] TREND UP detected. Riding momentum.`);
    } 
    else if (regime === "TREND DOWN") {
      quantScoreDelta += (aggrFlow * 25); // Follow flow
      quantScoreDelta -= 10; // Trend discount
      topDriver = `Trend Continuity (${aggrFlow > 0 ? '+' : ''}${aggrFlow.toFixed(2)} AggrFlow)`;
      reasoning.push(`[REGIME] TREND DOWN detected. Riding momentum.`);
    } 
    else if (regime === "BLOWOFF TOP (REVERT)") {
      quantScoreDelta -= 20; // Hard fade
      quantScoreDelta -= (aggrFlow * 10); // Fade late buyers
      topDriver = "Mean Reversion (Overbought Fade)";
      reasoning.push(`[REGIME] BLOWOFF TOP. RSI ${rsi.toFixed(0)}. Fading the pump.`);
    } 
    else if (regime === "PANIC DUMP (REVERT)") {
      quantScoreDelta += 20; // Hard fade
      quantScoreDelta -= (aggrFlow * 10); // Fade late sellers
      topDriver = "Mean Reversion (Oversold Fade)";
      reasoning.push(`[REGIME] PANIC DUMP. RSI ${rsi.toFixed(0)}. Fading the dump.`);
    } 
    else {
      // RANGE / CHOP
      if (vwapGapBps > 4) {
        quantScoreDelta -= 15;
        topDriver = "VWAP Pullback";
        reasoning.push(`[REGIME] CHOP. Price > VWAP. Betting on pullback.`);
      } else if (vwapGapBps < -4) {
        quantScoreDelta += 15;
        topDriver = "VWAP Bounce";
        reasoning.push(`[REGIME] CHOP. Price < VWAP. Betting on bounce.`);
      } else {
        quantScoreDelta += (aggrFlow * 20);
        topDriver = `AggrFlow (${aggrFlow > 0 ? '+' : ''}${aggrFlow.toFixed(2)})`;
        reasoning.push(`[REGIME] CHOP. Trusting raw AggrFlow tape.`);
      }
    }

    // Orderbook Spoof Detection (Overrules standard flow)
    if (orderBook.imbalance > 1.8 && aggrFlow < -0.3) {
      quantScoreDelta -= 15;
      topDriver = "Spoof Detection (Fake Buy Wall)";
      reasoning.push(`⚠️ SPOOF: Huge limit buys, but market selling. Fading fake wall.`);
    } else if (orderBook.imbalance < 0.6 && aggrFlow > 0.3) {
      quantScoreDelta += 15;
      topDriver = "Spoof Detection (Fake Sell Wall)";
      reasoning.push(`⚠️ SPOOF: Huge limit sells, but market buying. Fading fake wall.`);
    }

    // Scale up 5m sensitivity
    if (is5m) quantScoreDelta *= 1.25;

    probabilityAbove += quantScoreDelta;

    // ONLY introduce the physical gap as time runs out (The convergence)
    if (isEndgameLock) {
      const gapWeight = realGapBps * (is5m ? 2.5 : 3.5);
      probabilityAbove += gapWeight;
      reasoning.push(`🛡️ ENDGAME: Physical gap (${realGapBps > 0 ? '+' : ''}${realGapBps.toFixed(1)}bps) overriding internals.`);
      topDriver = "Time Decay (Physical Gap Lock)";
    }

    let prediction = userPosition || lockedPredictionRef.current; 

    // CONVICTION BIAS: Hold position to prevent flickering
    let convictionScore = Math.abs(probabilityAbove - 50) * 2; // 0% to 100% conviction
    if (prediction === "YES") {
      probabilityAbove += 15; 
      reasoning.push("🛡️ Bias: +15% (Holding Firm)");
    } else if (prediction === "NO") {
      probabilityAbove -= 15;
      reasoning.push("🛡️ Bias: -15% (Holding Firm)");
    }

    probabilityAbove = Math.max(0, Math.min(100, probabilityAbove)); 

    let isSystemLocked = false;
    if (isEndgameLock && Math.abs(realGapBps) > (atrBps * (is5m ? 0.3 : 0.5))) {
      isSystemLocked = true;
    }

    let recommendedPrediction = prediction;       
    
    if (isObservationPhase) {
      prediction = "ANALYZING"; recommendedPrediction = "ANALYZING";
    } else {
      if (prediction === "YES") {
        if (probabilityAbove <= 25 && !hasReversedRef.current && !isSystemLocked) recommendedPrediction = "NO";
        else if (probabilityAbove <= 35) recommendedPrediction = "SIT OUT";
      } else if (prediction === "NO") {
        if (probabilityAbove >= 75 && !hasReversedRef.current && !isSystemLocked) recommendedPrediction = "YES";
        else if (probabilityAbove >= 65) recommendedPrediction = "SIT OUT";
      } else {
        if (lastAdvisedRef.current === "YES") {
          if (probabilityAbove < 55) lastAdvisedRef.current = "SIT OUT";
        } else if (lastAdvisedRef.current === "NO") {
          if (probabilityAbove > 45) lastAdvisedRef.current = "SIT OUT";
        } else {
          // V31: Require strong internal quant score to enter
          if (probabilityAbove >= 70) lastAdvisedRef.current = "YES";
          else if (probabilityAbove <= 30) lastAdvisedRef.current = "NO";
        }
        recommendedPrediction = lastAdvisedRef.current;
      }
      if (isSystemLocked) recommendedPrediction = realGapBps > 0 ? "YES" : "NO";
    }

    let predictionReason = "";
    if (prediction === "ANALYZING") predictionReason = "Calibrating early momentum indicators.";
    else if (prediction === "SIT OUT") {
      if (recommendedPrediction === "YES") predictionReason = "Quant internals flipped bullish. Securing entry.";
      else if (recommendedPrediction === "NO") predictionReason = "Quant internals flipped bearish. Securing entry.";
      else predictionReason = "Awaiting high-conviction quant divergence to enter.";
    } else if (prediction === "YES") {
      if (recommendedPrediction === "NO") predictionReason = "Internal collapse detected. Reversal mandatory.";
      else if (regime.includes("REVERT") && realGapBps > 0) predictionReason = "Price overextended. Anticipating temporary pullback. Hold firm.";
      else if (realGapBps > 0) predictionReason = "Firmly in profit. Holding position steady.";
      else predictionReason = "Position negative, holding firm through noise.";
    } else if (prediction === "NO") {
      if (recommendedPrediction === "YES") predictionReason = "Internal collapse detected. Reversal mandatory.";
      else if (regime.includes("REVERT") && realGapBps < 0) predictionReason = "Price overextended. Anticipating temporary bounce. Hold firm.";
      else if (realGapBps < 0) predictionReason = "Firmly in profit. Holding position steady.";
      else predictionReason = "Position negative, holding firm through noise.";
    }

    let tradeAction = "STAY PUT / SIT OUT"; let tradeReason = "Odds are unclear. Wait for minimum 70% quant conviction.";
    let actionColor = "text-zinc-400"; let actionBg = "bg-zinc-500/10 border-zinc-500/30";
    let hasAction = false, actionButtonLabel = "", actionTarget = "", actionProb = 0;

    const dynamicStopLoss = atrBps * (0.40 + ((1-timeFraction) * 0.40)); 
    let liveEstValue = prediction === "YES" ? maxPayout * (probabilityAbove / 100) : prediction === "NO" ? maxPayout * ((100 - probabilityAbove) / 100) : 0;
    const livePnL = liveEstValue - betAmount;

    const offerVal = parseFloat(currentOffer) || 0;

    if (prediction === "ANALYZING") {
      tradeAction = "CALIBRATING..."; actionColor = "text-blue-400"; actionBg = "bg-blue-500/10 border-blue-500/30";
    } 
    else if (prediction === "SIT OUT") {
      const isOverbought = regime === "BLOWOFF TOP (REVERT)";
      const isOversold = regime === "PANIC DUMP (REVERT)";

      if (recommendedPrediction === "YES" && !isOverbought) {
        tradeAction = "SNIPER ENTRY: YES"; tradeReason = "Quant composite supports YES. Execute before physical gap moves.";
        actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]";
        hasAction = true; actionButtonLabel = "CONFIRM ENTRY: 'YES'"; actionTarget = "YES"; actionProb = probabilityAbove;
      } else if (recommendedPrediction === "NO" && !isOversold) {
        tradeAction = "SNIPER ENTRY: NO"; tradeReason = "Quant composite supports NO. Execute before physical gap moves.";
        actionColor = "text-rose-400"; actionBg = "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(251,113,133,0.2)]";
        hasAction = true; actionButtonLabel = "CONFIRM ENTRY: 'NO'"; actionTarget = "NO"; actionProb = 100 - probabilityAbove;
      } else if (recommendedPrediction === "YES" && isOverbought) {
        tradeAction = "SIT OUT (OVERBOUGHT)"; tradeReason = "Math says YES, but regime is BLOWOFF. Wait for pullback to enter.";
        actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
      } else if (recommendedPrediction === "NO" && isOversold) {
        tradeAction = "SIT OUT (OVERSOLD)"; tradeReason = "Math says NO, but regime is PANIC DUMP. Wait for bounce to enter.";
        actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
      }
    }
    else if (prediction === "YES" || prediction === "NO") {
      const isYES = prediction === "YES";
      const isBleeding = isYES ? (realGapBps < -dynamicStopLoss || realGapBps < -6.0) : (realGapBps > dynamicStopLoss || realGapBps > 6.0);
      const isReversalRecommended = isYES ? recommendedPrediction === "NO" : recommendedPrediction === "YES";
      
      const currentOdds = isYES ? probabilityAbove : (100 - probabilityAbove);
      const momentumLosing = isYES ? (aggrFlow < -0.5) : (aggrFlow > 0.5);

      if (offerVal > 0) {
        const premium = offerVal - liveEstValue;
        if (premium > (maxPayout * 0.05)) {
          tradeAction = "SELL TO MARKET (ARBITRAGE)"; 
          tradeReason = `Market is currently overpaying by $${premium.toFixed(2)} vs True Probability. Take the free money now.`;
          actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30 animate-pulse";
          hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "CASH";
        } 
        else if (offerVal > betAmount && Math.abs(realGapBps) < atrBps * 0.5 && !isEndgameLock) {
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
      }

      if (tradeAction === "STAY PUT / SIT OUT" || tradeAction === "HOLD FIRM") {
        if (isReversalRecommended && !hasReversedRef.current) {
          tradeAction = "REVERSE POSITION"; tradeReason = `Quant collapse. Use your ONLY allowed switch to ${isYES ? 'NO' : 'YES'}.`;
          actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
          hasAction = true; actionButtonLabel = `REVERSE TO '${isYES ? 'NO' : 'YES'}'`; actionTarget = isYES ? "NO" : "YES"; actionProb = isYES ? 100 - probabilityAbove : probabilityAbove;
        }
        else if (isReversalRecommended && hasReversedRef.current) {
          tradeAction = "CUT LOSSES (RISK LIMIT)"; tradeReason = "Quant collapse, but you are out of reversals. Exit trade immediately.";
          actionColor = "text-rose-500"; actionBg = "bg-rose-500/10 border-rose-500/30";
          hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "SIT OUT";
        }
        else if (isBleeding) {
          tradeAction = "CUT LOSSES (RISK LIMIT)"; tradeReason = "Position drifted past dynamic risk tolerance. Recommend exit.";
          actionColor = "text-rose-500"; actionBg = "bg-rose-500/10 border-rose-500/30";
          hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "SIT OUT";
        }
        else if (currentOdds >= 88 && offerVal === 0) {
          tradeAction = "SECURE MAX PROFIT"; tradeReason = "Tracking perfectly. Lock in gains when ready.";
          actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
          hasAction = true; actionButtonLabel = "EXECUTE CASHOUT (PROFIT)"; actionTarget = "CASH";
        }
        else if (currentOdds >= 75 && momentumLosing && offerVal === 0) {
          tradeAction = "SCALP METHOD (CASH OUT)"; tradeReason = `Odds are strong (${currentOdds.toFixed(0)}%), but AggrFlow is flipping. Take the early scalp to protect margin.`;
          actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.15)]";
          hasAction = true; actionButtonLabel = "EXECUTE SCALP"; actionTarget = "CASH";
        }
        else if (offerVal === 0) {
          tradeAction = "HOLD FIRM"; tradeReason = "Holding position. Quant composite supports trend.";
          actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/20";
        }
      }
    } 

    let textColor = "text-zinc-500", confidenceDisplay = probabilityAbove.toFixed(1);
    if (prediction === "YES") { textColor = "text-emerald-400"; confidenceDisplay = probabilityAbove.toFixed(1); } 
    else if (prediction === "NO") { textColor = "text-rose-400"; confidenceDisplay = (100 - probabilityAbove).toFixed(1); } 

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
      realGapBps, clockSeconds, isSystemLocked, atrBps, livePnL, liveEstValue, bb, projections, liqBuys, liqSells,
      rsi, ema9, ema21, userPosition, vwapGapBps,
      regime, aggrFlow, topDriver, entryWindowStatus, convictionScore // V31 NEW EXPORTS
    };
  }, [currentPrice, history, targetMargin, timeState.minsRemaining, timeState.secsRemaining, timeState.currentHour, orderBook, brtiPremium, forceRender, betAmount, maxPayout, currentOffer, takerFlow, liquidations, userPosition, windowType]);

  useEffect(() => {
    if (analysis?.hasAction && analysis.tradeAction !== prevActionRef.current) {
      if (analysis.tradeAction !== "CALIBRATING...") {
        playAlertSound();
      }
    }
    prevActionRef.current = analysis?.tradeAction;
  }, [analysis?.tradeAction, soundEnabled]);

  const executeManualAction = (actionLabel, targetState) => {
    setManualAction(actionLabel);
    
    if (actionLabel.includes('REVERSE')) {
      hasReversedRef.current = true;
    }

    if (targetState === "CASH" || targetState === "SIT OUT") {
      setUserPosition(null); 
    }

    if (analysis && (analysis.prediction === "YES" || analysis.prediction === "NO")) {
      const isWin = (analysis.prediction === "YES" && currentPrice > targetMargin) || (analysis.prediction === "NO" && currentPrice < targetMargin);
      if (isWin) updateScore(windowType, 'wins', 1);
      else updateScore(windowType, 'losses', 1);
    }
    
    if (targetState) {
      lockedPredictionRef.current = targetState === "CASH" ? "SIT OUT" : targetState;
      lastAdvisedRef.current = "SIT OUT";
      setForceRender(prev => prev + 1);
      setCurrentOffer(""); 
    }
  };

  const handleManualSync = (dir) => {
    lockedPredictionRef.current = dir;
    activeCallRef.current = { prediction: dir, strike: targetMargin };
    setUserPosition(dir);
    setForceRender(prev => prev + 1);
  };

  const handleChatSubmit = (e) => {
    if (e.key === 'Enter' && chatInput.trim()) {
      const userText = chatInput.trim().toLowerCase();
      const currentLog = [...chatLog, { role: 'user', text: chatInput.trim() }];
      setChatLog(currentLog);
      setChatInput("");
      
      setTimeout(() => {
        let reply = "";
        
        if (userText.includes("why") || userText.includes("explain") || userText.includes("reason") || userText.includes("logic")) {
          const reasons = analysis?.reasoning?.length > 0 ? analysis.reasoning.join(" ") : "I am waiting for clearer momentum signals.";
          reply = `Currently, my odds for YES finish at ${analysis?.rawProbAbove?.toFixed(1)}%. We are in a ${analysis?.regime} regime driven by ${analysis?.topDriver}. Here is my live breakdown: ${reasons}`;
        }
        else if (userText.includes("5m") || userText.includes("5 minute") || userText.includes("15m")) {
          reply = `In V31, both windows use Quant Composite Divergence tracking. You are currently in ${windowType.toUpperCase()} mode.`;
        }
        else if (userText.includes("pnl") || userText.includes("profit") || userText.includes("loss")) {
          reply = analysis?.prediction === "SIT OUT" ? "You are not in an active trade. No PnL to track right now." : `Your current estimated contract value is ~$${analysis?.liveEstValue?.toFixed(2)}. Your live mathematical PnL is $${analysis?.livePnL?.toFixed(2)}.`;
        }
        else if (userText.includes("stop loss") || userText.includes("risk") || userText.includes("cut")) {
          reply = `My dynamic stop-loss is set around ${analysis?.atrBps?.toFixed(1)} bps based on the current Average True Range and time decay. I will trigger a 'CUT LOSSES' alert if we bleed past this point.`;
        }
        else if (userText.includes("score") || userText.includes("record")) {
          reply = `Our current recorded scorecard for the ${windowType.toUpperCase()} window is ${scorecards[windowType].wins} Wins and ${scorecards[windowType].losses} Losses.`;
        }
        else if (userText.includes("hello") || userText.includes("hi") || userText.includes("hey") || userText.includes("sup")) {
          reply = `Hello! I am actively monitoring the ${windowType.toUpperCase()} market. My current advice is to: ${analysis?.tradeAction}. Ask me 'why' if you want to see my exact mathematical breakdown.`;
        }
        else {
          reply = `My probability engine places YES at ${analysis?.rawProbAbove?.toFixed(1)}%. Currently, my advice is to: ${analysis?.tradeAction}. Ask me 'why' to see my exact mathematical reasoning.`;
        }

        setChatLog([...currentLog, { role: 'tara', text: reply }]);
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
    <div className="min-h-screen bg-[#111312] text-[#E8E9E4] font-sans p-2 sm:p-4 flex flex-col items-center selection:bg-[#E8E9E4]/20 overflow-x-hidden">
      {emergencyBlink && <div className="fixed inset-0 bg-amber-500/5 pointer-events-none z-50 animate-pulse border-[4px] border-amber-500/20 transition-all duration-500" />}

      {/* Header - FULLY RESPONSIVE */}
      <div className="w-full max-w-6xl flex flex-wrap sm:flex-nowrap justify-between items-center border-b border-[#E8E9E4]/10 pb-3 mb-4 gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-xl md:text-2xl font-serif tracking-tight text-white flex items-center gap-2">
            Tara
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V31 Composite
            </span>
          </h1>
          
          {/* Mobile Right Icons (Hidden on Desktop) */}
          <div className="flex sm:hidden items-center gap-2">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-1.5 rounded-md border ${soundEnabled ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'} transition-colors`}>
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setShowHelp(true)} className="p-1.5 rounded-md bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-white transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
        {/* Window Toggle Switch */}
        <div className="flex bg-[#111312] border border-[#E8E9E4]/20 rounded-lg p-1 shadow-inner w-full sm:w-auto justify-center">
          <button 
            onClick={() => handleWindowToggle('5m')}
            className={`flex-1 sm:flex-none px-6 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType === '5m' ? 'bg-indigo-500 text-white shadow-md' : 'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}
          >
            5 Min
          </button>
          <button 
            onClick={() => handleWindowToggle('15m')}
            className={`flex-1 sm:flex-none px-6 py-1.5 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType === '15m' ? 'bg-emerald-500 text-white shadow-md' : 'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}
          >
            15 Min
          </button>
        </div>

        {/* Desktop Right Info */}
        <div className="hidden sm:flex text-right font-sans items-center gap-4">
          <div className="flex flex-col items-end pl-4">
            <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest mb-0.5">Current EST</div>
            <div className="text-sm font-serif text-[#E8E9E4]/90">{timeState.currentEST || '--:--:--'}</div>
          </div>
          <div className="flex items-center gap-2 border-l border-[#E8E9E4]/10 pl-4">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg border ${soundEnabled ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'} transition-colors`} title="Toggle Audio Alerts">
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowHelp(true)} className="p-2 rounded-lg bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-white transition-colors" title="Operations Manual">
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl flex flex-col gap-4">
        
        {/* Top Control Bar - MOBILE OPTIMIZED */}
        <div className="bg-[#181A19] p-3 md:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col lg:flex-row items-center justify-between gap-4 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-70"></div>

           {/* Top Row on Mobile: Live Spot & Scorecard */}
           <div className="flex w-full lg:w-auto justify-between lg:justify-start items-center gap-4">
             {/* Live Spot */}
             <div className="flex items-center gap-3 w-1/2 lg:w-auto pl-1 md:pl-2">
               <div className="p-2 bg-[#111312] rounded-lg border border-[#E8E9E4]/5 shadow-inner">
                 <Zap className={`w-5 h-5 transition-colors duration-200 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-[#E8E9E4]/40'}`} />
               </div>
               <div>
                 <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-0.5">Live Spot</div>
                 <div className={`text-xl sm:text-2xl md:text-3xl font-serif tracking-tight flex items-center gap-1 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-white'}`}>
                   ${currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                 </div>
               </div>
             </div>

             {/* Dynamic Scorecard for Mobile */}
             <div className="flex lg:hidden flex-col items-center bg-[#111312] p-2 rounded-xl border border-[#E8E9E4]/5 shadow-inner w-1/2">
               <div className="flex items-center justify-between w-full px-2">
                 <div className="flex flex-col items-center">
                   <div className="text-[9px] text-emerald-400 mb-0.5">WINS</div>
                   <span className="text-xl font-serif text-emerald-400 font-bold">{scorecards[windowType].wins}</span>
                 </div>
                 <div className="h-6 w-px bg-[#E8E9E4]/10"></div>
                 <div className="flex flex-col items-center">
                   <div className="text-[9px] text-rose-400 mb-0.5">LOSS</div>
                   <span className="text-xl font-serif text-rose-400 font-bold">{scorecards[windowType].losses}</span>
                 </div>
               </div>
             </div>
           </div>
           
           <div className="w-px h-10 md:h-12 bg-[#E8E9E4]/10 hidden lg:block mx-2"></div>

           {/* Strike, Bet & Offer Setup - MOBILE OPTIMIZED */}
           <div className="flex items-center gap-3 md:gap-6 w-full lg:w-auto bg-[#111312] p-3 md:p-4 rounded-xl border border-[#E8E9E4]/5 shadow-inner justify-between overflow-x-auto">
             <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[80px]">
               <div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1.5">Strike</div>
               <div className="flex items-center">
                 <Crosshair className="w-3 h-3 md:w-4 md:h-4 text-indigo-400 mr-1 md:mr-2 opacity-80 hidden sm:block" />
                 <input type="number" value={targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="bg-transparent border-none text-white font-serif text-lg md:text-xl w-[75px] md:w-24 focus:outline-none py-1 leading-normal" />
               </div>
             </div>
             <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[90px]">
               <div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1.5">Bet / Win</div>
               <div className="flex items-center gap-1 text-white font-serif text-base md:text-lg">
                 $<input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-8 md:w-12 text-center outline-none py-1 leading-normal" />
                 <span className="text-[#E8E9E4]/40 mx-0.5">/</span>
                 $<input type="number" value={maxPayout} onChange={(e) => setMaxPayout(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-10 md:w-14 text-center outline-none py-1 leading-normal" />
               </div>
             </div>
             <div className="flex flex-col items-start pl-1 md:pl-2 min-w-[80px]">
               <div className="text-[9px] md:text-[10px] text-emerald-400/80 uppercase tracking-widest font-medium mb-1.5">Live Offer</div>
               <div className="flex items-center gap-1 text-emerald-400 font-serif text-base md:text-lg">
                 $<input type="number" value={currentOffer} onChange={(e) => setCurrentOffer(e.target.value)} placeholder="0.00" className="bg-transparent border-b border-emerald-500/30 focus:border-emerald-400 w-12 md:w-16 text-center outline-none placeholder-emerald-900 py-1 leading-normal" />
               </div>
             </div>
           </div>
           
           <div className="w-px h-10 md:h-12 bg-[#E8E9E4]/10 hidden lg:block mx-2"></div>

           {/* Scorecard for Desktop */}
           <div className="hidden lg:flex flex-col items-start bg-[#111312] p-3 rounded-xl border border-[#E8E9E4]/5 shadow-inner w-56">
             <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-2 flex justify-between w-full">
               <span className="flex items-center gap-1.5"><Terminal className="w-3.5 h-3.5"/> {windowType.toUpperCase()} Scorecard</span>
             </div>
             <div className="flex items-center justify-between w-full px-2">
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mb-1">
                   <button onClick={() => updateScore(windowType, 'wins', -1)}>-</button> WINS <button onClick={() => updateScore(windowType, 'wins', 1)}>+</button>
                 </div>
                 <span className="text-3xl font-serif text-emerald-400 font-bold">{scorecards[windowType].wins}</span>
               </div>
               <div className="h-10 w-px bg-[#E8E9E4]/10"></div>
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1.5 text-[10px] text-rose-400 mb-1">
                   <button onClick={() => updateScore(windowType, 'losses', -1)}>-</button> LOSS <button onClick={() => updateScore(windowType, 'losses', 1)}>+</button>
                 </div>
                 <span className="text-3xl font-serif text-rose-400 font-bold">{scorecards[windowType].losses}</span>
               </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* MAIN OUTCOME DISPLAY */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            <div className="bg-[#181A19] p-4 md:p-6 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[380px] md:min-h-[420px]">
               
               <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-[#111312] border border-[#E8E9E4]/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm whitespace-nowrap">
                 <Clock className="w-3 h-3" />
                 <span className="text-[#E8E9E4]/60 hidden sm:inline">{timeState.startWindowEST}-{timeState.nextWindowEST}</span>
                 <span className="text-[#E8E9E4]">{timeState.minsRemaining}m {timeState.secsRemaining}s</span>
               </div>

               {/* Force Pull Out Button */}
               {analysis && analysis.prediction !== "SIT OUT" && analysis.prediction !== "ANALYZING" && (
                 <button 
                   onClick={() => executeManualAction("MANUAL PULL OUT", "SIT OUT")}
                   className="absolute top-3 right-3 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-2 sm:px-3 py-1.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                 >
                   <AlertTriangle className="w-3 h-3" /> <span className="hidden sm:inline">Force Pull Out</span>
                 </button>
               )}

               {isLoading || !analysis ? (
                 <div className="text-xl font-serif text-[#E8E9E4]/30 animate-pulse mt-8">Connecting to Datastream...</div>
               ) : (
                 <div className="flex flex-col items-center w-full mt-8 sm:mt-6">
                   
                   {/* V31 QUANT COMPOSITE DATA BLOCK */}
                   <div className="bg-[#111312] border border-[#E8E9E4]/10 p-3 rounded-lg font-mono text-[10px] sm:text-[11px] text-[#E8E9E4]/60 mb-4 w-full max-w-[500px] mx-auto shadow-inner text-left flex flex-col gap-2">
                     <div className="flex justify-between items-center bg-[#181A19] p-2 rounded border border-[#E8E9E4]/5">
                       <div className="flex flex-col">
                         <span className="text-[8px] text-[#E8E9E4]/40 uppercase tracking-widest">Market</span>
                         <span className="text-[#E8E9E4] text-sm">${currentPrice?.toFixed(2)}</span>
                       </div>
                       <div className="flex flex-col text-center">
                         <span className="text-[8px] text-[#E8E9E4]/40 uppercase tracking-widest">Strike</span>
                         <span className="text-indigo-300 text-sm">${targetMargin.toFixed(0)}</span>
                       </div>
                       <div className="flex flex-col text-right">
                         <span className="text-[8px] text-[#E8E9E4]/40 uppercase tracking-widest">Gap</span>
                         <span className={`font-bold text-sm ${analysis.realGapBps > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {analysis.realGapBps > 0 ? '+' : ''}{analysis.realGapBps.toFixed(1)}bps
                         </span>
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-center text-[9px] opacity-90 px-1 pt-1">
                       <span className="flex items-center gap-1">
                         <Activity className="w-3 h-3 text-purple-400" />
                         REGIME: <span className="text-white font-bold">{analysis.regime}</span>
                       </span>
                       <span>
                         WINDOW: <span className={analysis.entryWindowStatus.includes("Optimal") ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{analysis.entryWindowStatus}</span>
                       </span>
                     </div>
                     <div className="flex justify-between items-center text-[9px] opacity-90 px-1 pb-1 border-b border-[#E8E9E4]/10">
                       <span className="flex items-center gap-1">
                         <Zap className="w-3 h-3 text-amber-400" />
                         TOP DRIVER: <span className="text-white">{analysis.topDriver}</span>
                       </span>
                       <span>
                         CONV: <span className="text-indigo-300 font-bold">{analysis.convictionScore.toFixed(0)}%</span>
                       </span>
                     </div>

                     <div className="flex justify-between items-center text-[8px] sm:text-[9px] opacity-60 pt-1">
                       <span>AGGR FLOW: <span className={analysis.aggrFlow > 0.3 ? 'text-emerald-400' : analysis.aggrFlow < -0.3 ? 'text-rose-400' : 'text-[#E8E9E4]'}>{analysis.aggrFlow > 0 ? '+' : ''}{analysis.aggrFlow.toFixed(2)}</span></span>
                       <span>RSI: <span className={analysis.rsi > 70 ? 'text-rose-400' : analysis.rsi < 30 ? 'text-emerald-400' : 'text-[#E8E9E4]'}>{analysis.rsi.toFixed(1)}</span></span>
                       <span>VWAP: <span className={Math.abs(analysis.vwapGapBps) > 5 ? 'text-amber-400 font-bold' : 'text-[#E8E9E4]'}>{analysis.vwapGapBps.toFixed(1)}bps</span></span>
                     </div>
                   </div>

                   <h2 className={`text-5xl sm:text-6xl font-serif font-bold leading-none tracking-tight ${analysis.textColor} mb-2 drop-shadow-sm transition-all flex items-center justify-center gap-2 sm:gap-3 uppercase`}>
                     <span className="opacity-40 text-xl sm:text-3xl font-sans">{`>>`}</span>
                     {analysis.prediction}
                     {analysis.isSystemLocked && <span className="opacity-90 text-xl sm:text-3xl"> - LOCK</span>}
                     <span className="opacity-40 text-xl sm:text-3xl font-sans">{`<<`}</span>
                   </h2>

                   <p className="text-[11px] sm:text-xs text-[#E8E9E4]/50 font-sans max-w-sm mx-auto mb-4 px-2 h-8 leading-tight">
                     {analysis.predictionReason}
                   </p>

                   {/* LIVE PnL TRACKER */}
                   {analysis.prediction !== "SIT OUT" && analysis.prediction !== "ANALYZING" && (
                     <div className={`flex items-center gap-3 sm:gap-4 mb-4 px-3 sm:px-4 py-2 rounded-lg border w-full max-w-[300px] justify-center ${analysis.livePnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                       <div className="flex flex-col text-center sm:text-left">
                         <span className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-60">Posterior Value</span>
                         <span className="font-serif text-base sm:text-lg">${analysis.liveEstValue.toFixed(2)}</span>
                       </div>
                       <div className="w-px h-6 bg-[#E8E9E4]/20"></div>
                       <div className="flex flex-col text-center sm:text-left">
                         <span className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-60">Est PnL</span>
                         <span className={`font-serif font-bold text-base sm:text-lg ${analysis.livePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {analysis.livePnL >= 0 ? '+' : '-'}${Math.abs(analysis.livePnL).toFixed(2)}
                         </span>
                       </div>
                     </div>
                   )}

                   {/* INTERACTIVE TRADE ADVISOR */}
                   <div className={`mb-4 w-full max-w-[400px] p-3 sm:p-4 rounded-xl border-[1.5px] ${analysis.actionBg} transition-colors flex flex-col items-center text-center shadow-sm`}>
                     <div className="flex items-center gap-1.5 mb-1.5">
                       <BellRing className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${analysis.actionColor}`} />
                       <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-80 text-[#E8E9E4]">Advisor</span>
                     </div>
                     <div className={`text-base sm:text-lg font-serif font-bold mb-1 ${analysis.actionColor} uppercase`}>{analysis.tradeAction}</div>
                     <p className="text-[10px] sm:text-[11px] opacity-80 text-[#E8E9E4] mb-2 sm:mb-3 leading-tight">{analysis.tradeReason}</p>

                     {analysis.hasAction && (
                       <div className="w-full pt-2 sm:pt-3 border-t border-[#E8E9E4]/10">
                          {manualAction === analysis.tradeAction ? (
                             <div className="w-full bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                               <CheckCircle className="w-3.5 h-3.5" /> Action Logged
                             </div>
                          ) : (
                             <button 
                               onClick={() => executeManualAction(analysis.tradeAction, analysis.actionTarget)}
                               className={`w-full py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest border transition-all hover:brightness-125 ${
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
                   
                   {/* MANUAL SYNC BUTTONS */}
                   {analysis.prediction === "SIT OUT" && (
                     <div className="flex flex-col items-center gap-1.5 sm:gap-2 mt-1 mb-2 sm:mb-4 w-full max-w-[400px]">
                       <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#E8E9E4]/40">Already in a trade? Sync Tara:</span>
                       <div className="flex gap-2 sm:gap-3 w-full">
                         <button onClick={() => handleManualSync("YES")} className="flex-1 py-1.5 border border-emerald-500/30 text-emerald-400 rounded-md text-[9px] sm:text-[10px] uppercase font-bold tracking-widest hover:bg-emerald-500/10 transition-colors">I Entered YES</button>
                         <button onClick={() => handleManualSync("NO")} className="flex-1 py-1.5 border border-rose-500/30 text-rose-400 rounded-md text-[9px] sm:text-[10px] uppercase font-bold tracking-widest hover:bg-rose-500/10 transition-colors">I Entered NO</button>
                       </div>
                     </div>
                   )}

                 </div>
               )}
            </div>

            {/* Hourly Forecast */}
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
                      <span className="text-[11px] sm:text-[11.5px] text-[#E8E9E4]/90 leading-tight">
                        {news.title}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 text-center">
                 <div className="text-[8px] sm:text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-1">PROB ABOVE</div>
                 <div className="text-xl sm:text-2xl font-serif text-indigo-300">{analysis ? `${analysis.rawProbAbove.toFixed(1)}%` : '--%'}</div>
              </div>
              <div className="flex-1 bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 text-center">
                 <div className="text-[8px] sm:text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-1">PROB BELOW</div>
                 <div className="text-xl sm:text-2xl font-serif text-rose-300">{analysis ? `${(100 - analysis.rawProbAbove).toFixed(1)}%` : '--%'}</div>
              </div>
            </div>

            {/* System Logs */}
            {analysis && (
              <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex-1 min-h-[150px]">
                <h2 className="text-[10px] font-medium text-[#E8E9E4]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" /> Math Engine Logs
                </h2>
                <div className="space-y-2 font-mono h-[120px] lg:h-full lg:max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
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
      <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all ${isChatOpen ? 'w-[90vw] sm:w-80' : 'w-auto'}`}>
        {isChatOpen && (
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 shadow-2xl rounded-xl w-full mb-3 overflow-hidden flex flex-col h-[60vh] sm:h-96">
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
                  <div className={`text-xs p-2.5 rounded-lg max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-tr-none' : 'bg-[#2A2D2C] text-[#E8E9E4] border border-[#E8E9E4]/10 rounded-tl-none'} ${msg.isLoading ? 'animate-pulse' : ''}`}>
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
                placeholder={`Ask Tara about the ${windowType.toUpperCase()} window...`} 
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

      {/* HELP / MANUAL MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center z-10">
              <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2">
                <Info className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /> Tara Operations Manual
              </h2>
              <button onClick={() => setShowHelp(false)} className="text-[#E8E9E4]/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 text-xs sm:text-sm text-[#E8E9E4]/80">
              
              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">1. Multi-Timeframe & Deep-Quant Divergence</h3>
                <p className="mb-3 leading-relaxed">You can toggle Tara between 5-Minute and 15-Minute mode. <br/><strong>In 15M Mode:</strong> She analyzes macro-trends, VWAP, and looks for safer, wider structural trades.<br/><strong>In 5M Mode:</strong> She becomes an aggressive scalper. She ignores slow indicators and multiplies the weight of live order flow (Tape Delta) by 1.25x.</p>
                <p className="mb-3 leading-relaxed border-l-2 border-emerald-500 pl-3 bg-emerald-500/5 p-2 rounded-r"><strong>Deep-Quant Algorithm (V31 Update):</strong> Tara completely ignores the current physical gap early in the trade. Instead of blindly chasing pumps, she determines the Market Regime (Trend vs Range) and calculates an AggrFlow score to bet on the breakout *before* it happens.</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Setup:</strong> Select your timeframe. Type in the platform's Strike Price, your Bet Size, and Max Payout.</li>
                  <li><strong>Wait:</strong> Tara begins every trade at "SIT OUT". She requires a minimum of <span className="text-emerald-300 font-mono">70% internal conviction</span> to advise an entry.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">2. The "Scalp" Method (Maximum Profit)</h3>
                <p className="leading-relaxed">If you are in a winning position (odds &gt; 75%), but Tara detects that whales are suddenly selling the momentum back down (AggrFlow flipping), she will trigger a <strong>SCALP METHOD (CASH OUT)</strong> alert. <br/><br/>If you type the platform's current "Live Market Offer" into the box, Tara will instantly calculate your true Edge. If they offer you $70 for a contract mathematically worth $50, she will scream at you to take the Arbitrage.</p>
              </section>

              <section>
                <h3 className="text-indigo-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">3. Understanding the Data Dashboard</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-2 font-mono text-[10px] sm:text-[11px]">
                  <div className="bg-[#111312] p-3 rounded border border-[#E8E9E4]/10">
                    <span className="text-indigo-300 font-bold block mb-1">REGIME:</span>
                    Categorizes the market context (TREND UP, BLOWOFF TOP, CHOP) to determine how indicators should be weighted.
                  </div>
                  <div className="bg-[#111312] p-3 rounded border border-[#E8E9E4]/10">
                    <span className="text-indigo-300 font-bold block mb-1">AGGR FLOW:</span>
                    Aggressive Taker Flow (normalized -1.0 to 1.0). The primary leading indicator for identifying where whales are pushing the price.
                  </div>
                  <div className="bg-[#111312] p-3 rounded border border-[#E8E9E4]/10">
                    <span className="text-indigo-300 font-bold block mb-1">VWAP GAP:</span>
                    Tracks the distance from the Volume Weighted Average Price. Used to predict mean-reversion pullbacks.
                  </div>
                  <div className="bg-[#111312] p-3 rounded border border-[#E8E9E4]/10">
                    <span className="text-indigo-300 font-bold block mb-1">LIQ (Liquidations):</span>
                    Tracks forced margin calls on Binance. A "BULL" liquidation means heavily shorted traders are being squeezed upward.
                  </div>
                </div>
              </section>
              
              <section>
                <h3 className="text-rose-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">4. The Jerome Filter (Endgame Logic)</h3>
                <p className="leading-relaxed">In the final moments of a round (last 3 mins for 15M, last 60s for 5M), Tara activates the <strong>Jerome Filter</strong>. The mathematical divergence takes a backseat, and the actual physical gap remaining dictates the final lock prediction.</p>
              </section>

            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(232, 233, 228, 0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(232, 233, 228, 0.2); }
      `}} />
    </div>
  );
}
