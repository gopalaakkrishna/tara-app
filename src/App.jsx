import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- 100% DEPENDENCY-FREE INLINE ICONS ---
const IconClock = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconCrosshair = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>;
const IconZap = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconTerminal = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconAlertTriangle = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconActivity = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconBell = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconCheck = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconTrendingUp = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconGlobe = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconMessage = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconX = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconInfo = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconVolume2 = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const IconVolumeX = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
const IconHelp = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

// --- Advanced Technical Indicator Utilities ---
const calculateVWAP = (history) => {
  if (!history || history.length === 0) return null;
  let typicalPriceVolume = 0; let totalVolume = 0;
  history.forEach(candle => {
    const typicalPrice = (candle.h + candle.l + candle.c) / 3;
    typicalPriceVolume += typicalPrice * candle.v; totalVolume += candle.v;
  });
  return totalVolume === 0 ? null : typicalPriceVolume / totalVolume;
};

const calculateRSI = (data, period = 14) => {
  if (!data || data.length < period + 1) return 50;
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
  if (!history || history.length < period + 1) return 0;
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    const high = history[i].h; const low = history[i].l; const prevClose = history[i + 1].c;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
};

export default function App() {
  const [currentPrice, setCurrentPrice] = useState(null);
  const [tickDirection, setTickDirection] = useState(null);
  
  const currentPriceRef = useRef(null);
  const tickHistoryRef = useRef([]); 
  const lastPriceSourceRef = useRef({ source: 'none', time: 0 });

  const [history, setHistory] = useState([]); 
  const [orderBook, setOrderBook] = useState({ localBuy: 0, localSell: 0, imbalance: 1 });
  const [takerFlow, setTakerFlow] = useState({ imbalance: 1, whaleSpotted: null }); 
  const [liquidations, setLiquidations] = useState([]); 
  const [newsEvents, setNewsEvents] = useState([]);
  const [sentimentScore, setSentimentScore] = useState(0);
  const [brtiPremium, setBrtiPremium] = useState(0); 
  
  const [targetMargin, setTargetMargin] = useState(0); 
  const [betAmount, setBetAmount] = useState(50);
  const [maxPayout, setMaxPayout] = useState(100);
  const [currentOffer, setCurrentOffer] = useState(""); 

  const [windowType, setWindowType] = useState('15m'); 
  const [timeState, setTimeState] = useState({ currentEST: '', startWindowEST: '', nextWindowEST: '', minsRemaining: 0, secsRemaining: 0, currentHour: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const lockedPredictionRef = useRef("SIT OUT");
  const activeCallRef = useRef({ prediction: "SIT OUT", strike: 0 });
  const hasReversedRef = useRef(false); 
  
  // Safe SSR LocalStorage Guard
  const [scorecards, setScorecards] = useState(() => {
    const baseline = { '15m': { wins: 70, losses: 60 }, '5m': { wins: 10, losses: 7 } };
    if (typeof window === 'undefined') return baseline;
    try {
      const savedScore = localStorage.getItem('btcOracleScorecardV38');
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
  const [chatLog, setChatLog] = useState([{ role: 'tara', text: "Tara V38 Discipline Update online. Skip Round execution protocol enabled. If the market chops, I sit out instead of guessing." }]);
  const [chatInput, setChatInput] = useState("");
  
  const lastPredRef = useRef(null);
  const [emergencyBlink, setEmergencyBlink] = useState(false);
  const lastWindowRef = useRef("");
  
  const [userPosition, setUserPosition] = useState(null); 
  const [showHelp, setShowHelp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevActionRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('btcOracleScorecardV38', JSON.stringify(scorecards)); } 
      catch (e) {}
    }
  }, [scorecards]);

  const playAlertSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine'; 
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

  // Window Rollover logic
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
        setUserPosition(null); 
        lastWindowRef.current = timeState.nextWindowEST;
        setManualAction(null); 
        tickHistoryRef.current = []; 
        setCurrentOffer(""); 
      }
    }
  }, [timeState.nextWindowEST, currentPrice, windowType]);

  // WEBSOCKETS (Safe execution to prevent Canvas cross-origin crash)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let isCanvas = false;
    try { isCanvas = window.self !== window.top; } 
    catch (e) { isCanvas = true; } // If it throws SecurityError, we are in an iframe
    
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
      if (isCanvas) return; // Use REST fallback in preview environments

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
      if (wsCB && wsCB.readyState === 1) { wsCB.send(JSON.stringify({ type: 'unsubscribe', product_ids: ['BTC-USD'], channels: ['ticker'] })); wsCB.close(); }
      if (wsBinanceLiq && wsBinanceLiq.readyState === 1) wsBinanceLiq.close();
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
        if (!resTicker.ok) return;
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
            if (Array.isArray(dataCB)) {
              formattedHistory = dataCB.slice(0, 60).map(c => ({ l: parseFloat(c[1]), h: parseFloat(c[2]), c: parseFloat(c[4]), v: parseFloat(c[5]) }));
            }
          }
        } catch (e) {}

        if (formattedHistory.length > 0) setHistory(formattedHistory);

        let currentCoinbaseRef = currentPriceRef.current;
        let currentImbalance = 1;

        try {
          const resOb = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/book?level=2');
          if (resOb.ok) {
            const dataOb = await resOb.json();
            if (dataOb?.bids && dataOb?.asks) {
              let localBuy = 0, localSell = 0;
              dataOb.bids.forEach(([p, s]) => { if (p <= targetMargin && p >= targetMargin - 150) localBuy += parseFloat(s); });
              dataOb.asks.forEach(([p, s]) => { if (p >= targetMargin && p <= targetMargin + 150) localSell += parseFloat(s); });
              currentImbalance = localSell === 0 ? 1 : localBuy / localSell;
              setOrderBook({ localBuy, localSell, imbalance: currentImbalance });
            }
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

  // Auto-Snap Target Margin on Boot
  useEffect(() => {
    if (targetMargin === 0 && currentPrice) {
      setTargetMargin(currentPrice);
    }
  }, [currentPrice, targetMargin]);

  // News Wire Generator
  useEffect(() => {
    let syntheticNews = [];
    if (orderBook.imbalance > 1.5) syntheticNews.push({ title: `Maker Alert: Limit BID wall placed near $${targetMargin.toFixed(0)}`, url: "#" });
    if (orderBook.imbalance < 0.6) syntheticNews.push({ title: `Maker Alert: Limit SELL pressure defending $${targetMargin.toFixed(0)}`, url: "#" });
    if (takerFlow.imbalance > 2.0) syntheticNews.push({ title: `Taker Alert: Market BUYING detected on the tape.`, url: "#" });
    if (takerFlow.imbalance < 0.5) syntheticNews.push({ title: `Taker Alert: Market SELLING detected on the tape.`, url: "#" });
    
    if (syntheticNews.length < 3) syntheticNews.push({ title: `Engine: Analyzing Order Book vs Tape Divergence (${windowType.toUpperCase()})...`, url: "#" });
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

  // --- TARA V38: THE DISCIPLINE UPDATE (Skip Round Protocol) ---
  const analysis = useMemo(() => {
    if (!currentPrice || history.length < 30 || !targetMargin) return null;

    const is15m = windowType === '15m';
    const intervalSeconds = is15m ? 900 : 300;
    const clockSeconds = (timeState.minsRemaining * 60) + timeState.secsRemaining;
    const timeFraction = Math.max(0, Math.min(1, 1 - (clockSeconds / intervalSeconds)));
    
    // T+ Entry Windows
    const isObservationPhase = timeFraction < (is15m ? 0.08 : 0.10); 
    const isEntryWindow = timeFraction >= (is15m ? 0.08 : 0.10) && timeFraction <= (is15m ? 0.85 : 0.90);
    const isEndgameLock = timeFraction > (is15m ? 0.85 : 0.90);

    let entryWindowStatus = isObservationPhase ? "Awaiting Volatility" : isEntryWindow ? "Active Signal Window" : "Window Closing";

    const atr = calculateATR(history, 14) || 10;
    const atrBps = atr > 0 ? (atr / currentPrice) * 10000 : 15; 
    const vwap = calculateVWAP(history);

    const realGapBps = ((currentPrice - targetMargin) / targetMargin) * 10000;
    const vwapGapBps = vwap ? ((currentPrice - vwap) / vwap) * 10000 : 0;
    
    const ticks = tickHistoryRef.current;
    const tickSlope = ticks.length >= 10 ? (currentPrice - ticks[0].p) : 0;
    
    let aggrFlow = 0;
    if (takerFlow.imbalance > 1) aggrFlow = Math.min(1.0, (takerFlow.imbalance - 1) / 1.5);
    else if (takerFlow.imbalance < 1) aggrFlow = Math.max(-1.0, (takerFlow.imbalance - 1) / 0.5);

    // V38: Regime Rule
    let regime = "CHOP (NO DIRECTION)";
    if (atrBps > (is15m ? 12 : 8) && Math.abs(tickSlope) > 1.5) regime = "VOLATILE";
    else if (vwapGapBps > 1.5 && tickSlope > 0) regime = "TREND UP";
    else if (vwapGapBps < -1.5 && tickSlope < 0) regime = "TREND DN";
    else regime = "CHOP (NO DIRECTION)";

    let liqBuys = 0; let liqSells = 0;
    liquidations.forEach(l => {
      if (Date.now() - l.time < 60000) {
        if (l.side === 'BUY') liqBuys += l.value; 
        else liqSells += l.value; 
      }
    });

    // Posterior Probability Engine
    let baseProb = 50;
    baseProb += (realGapBps * (is15m ? 1.5 : 2.0)); 
    if (regime === "TREND UP") baseProb += 15;
    if (regime === "TREND DN") baseProb -= 15;
    if (regime === "VOLATILE") baseProb += (aggrFlow * 30); 
    if (liqBuys > 20000) baseProb += 10;
    if (liqSells > 20000) baseProb -= 10;
    let posterior = Math.max(0, Math.min(100, baseProb));

    // Φ3 Physics Momentum
    let phi3 = 50 + (aggrFlow * 35) + (tickSlope * 2);
    phi3 = Math.max(0, Math.min(100, phi3));

    // V38: Strict 4-Rule Checklist execution
    let passWindow = isEntryWindow;
    let passRegime = regime !== "CHOP (NO DIRECTION)";
    let passPosteriorUP = posterior >= 65; 
    let passPosteriorDN = posterior <= 35;
    let passPhi3UP = phi3 >= 55;
    let passPhi3DN = phi3 <= 45;

    let reasoning = [];
    reasoning.push(`[1] Active Window: ${passWindow ? 'PASS' : 'FAIL'} (${entryWindowStatus})`);
    reasoning.push(`[2] Trend Validation: ${passRegime ? 'PASS' : 'FAIL'} (${regime})`);
    reasoning.push(`[3] Posterior Base: ${passPosteriorUP || passPosteriorDN ? 'PASS' : 'FAIL'} (${posterior.toFixed(1)}%)`);
    reasoning.push(`[4] Flow Physics: ${passPhi3UP || passPhi3DN ? 'PASS' : 'FAIL'} (${phi3.toFixed(1)}%)`);

    let prediction = userPosition || lockedPredictionRef.current; 
    let activePrediction = prediction;

    // Execution Core
    if (activePrediction === "SIT OUT") {
        if (passWindow && passRegime) {
            if (passPosteriorUP && passPhi3UP) activePrediction = "YES";
            else if (passPosteriorDN && passPhi3DN) activePrediction = "NO";
        }
    } else {
        if (activePrediction === "YES" && posterior < 30) activePrediction = "SIT OUT";
        if (activePrediction === "NO" && posterior > 70) activePrediction = "SIT OUT";
    }

    let tradeAction = "WAITING / SIT OUT"; 
    let tradeReason = "Awaiting structural confirmation to signal.";
    let actionColor = "text-zinc-400"; let actionBg = "bg-zinc-500/10 border-zinc-500/30";
    let hasAction = false, actionButtonLabel = "", actionTarget = "";

    // V38: THE SKIP ROUND PROTOCOL
    if (activePrediction === "YES" || activePrediction === "NO") {
        tradeAction = `ENTRY SIGNAL: ${activePrediction}`;
        tradeReason = "All quant rules passed. Momentum established.";
        actionColor = activePrediction === "YES" ? "text-emerald-400" : "text-rose-400";
        actionBg = activePrediction === "YES" ? "bg-emerald-500/10 border-emerald-500/30" : "bg-rose-500/10 border-rose-500/30";
        hasAction = true;
        actionButtonLabel = `CONFIRM ENTRY: '${activePrediction}'`;
        actionTarget = activePrediction;
    } else if (!passWindow && clockSeconds > (is15m ? 600 : 200)) {
        tradeAction = "AWAITING WINDOW";
        tradeReason = "Gathering baseline volatility metrics.";
        actionColor = "text-blue-400"; actionBg = "bg-blue-500/10 border-blue-500/30";
    } else if (!passWindow) {
        tradeAction = "WINDOW CLOSED";
        tradeReason = "Late in round. Entering now is unsafe.";
        actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
    } else if (!passRegime) {
        tradeAction = "SKIPPING ROUND";
        tradeReason = "Market is wiggling with no clear direction. We sit this round out instead of guessing.";
        actionColor = "text-zinc-400"; actionBg = "bg-zinc-500/10 border-zinc-500/30";
    } else {
        tradeAction = "SKIPPING ROUND";
        tradeReason = "Quant conviction is too low to force a trade. We sit this round out instead of guessing.";
        actionColor = "text-zinc-400"; actionBg = "bg-zinc-500/10 border-zinc-500/30";
    }

    let topDriver = "";
    if (Math.abs(aggrFlow) > 0.5) topDriver = `AggrFlow (${aggrFlow > 0 ? '+' : ''}${aggrFlow.toFixed(2)})`;
    else topDriver = `CrossProb (${posterior > 50 ? '+' : ''}${(posterior/100).toFixed(2)})`;

    let convictionScore = Math.abs(posterior - 50) * 2; 
    
    let convictionText = "Neutral";
    if (convictionScore > 65) convictionText = "Very Sure";
    else if (convictionScore > 40) convictionText = "Pretty Sure";
    else convictionText = "Unsure";

    let textColor = activePrediction === "YES" ? "text-emerald-400" : activePrediction === "NO" ? "text-rose-400" : "text-zinc-500";
    
    let liveEstValue = activePrediction === "YES" ? maxPayout * (posterior / 100) : activePrediction === "NO" ? maxPayout * ((100 - posterior) / 100) : 0;
    let livePnL = liveEstValue - betAmount;

    let predictionReason = "";
    if (activePrediction === "SIT OUT") predictionReason = "Waiting for structural divergence.";
    else if (realGapBps > 0 && activePrediction === "YES") predictionReason = "Firmly in profit. Holding steady.";
    else if (realGapBps < 0 && activePrediction === "NO") predictionReason = "Firmly in profit. Holding steady.";
    else predictionReason = "Position negative, holding firm through noise.";

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
      confidence: activePrediction === "NO" ? (100 - posterior).toFixed(1) : posterior.toFixed(1), 
      prediction: activePrediction, predictionReason, reasoning, textColor, rawProbAbove: posterior,
      tradeAction, tradeReason, actionColor, actionBg, hasAction, actionButtonLabel, actionTarget, 
      realGapBps, clockSeconds, isSystemLocked: false, atrBps, livePnL, liveEstValue, projections,
      vwapGapBps, regime, aggrFlow, topDriver, entryWindowStatus, convictionScore, convictionText
    };
  }, [currentPrice, history, targetMargin, timeState.minsRemaining, timeState.secsRemaining, timeState.currentHour, orderBook, brtiPremium, forceRender, betAmount, maxPayout, currentOffer, takerFlow, liquidations, userPosition, windowType]);

  useEffect(() => {
    if (analysis?.hasAction && analysis.tradeAction !== prevActionRef.current) {
      if (analysis.tradeAction.includes("ENTRY SIGNAL")) {
        playAlertSound();
      }
    }
    prevActionRef.current = analysis?.tradeAction;
  }, [analysis?.tradeAction, soundEnabled]);

  const executeManualAction = (actionLabel, targetState) => {
    setManualAction(actionLabel);
    
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
          reply = `Currently, my posterior for YES is ${Number(analysis?.rawProbAbove || 0).toFixed(1)}%. We are in a ${String(analysis?.regime || 'CHOP')} regime. I am strictly waiting for all 4 quantitative rules to pass before issuing an entry.`;
        }
        else if (userText.includes("5m") || userText.includes("5 minute") || userText.includes("15m")) {
          reply = `In V38, if the market is chopping and the gap is too tight, I trigger a "Skip Round" protocol. You are currently in ${windowType.toUpperCase()} mode.`;
        }
        else if (userText.includes("pnl") || userText.includes("profit") || userText.includes("loss")) {
          reply = analysis?.prediction === "SIT OUT" ? "You are not in an active trade. No PnL to track right now." : `Your current estimated contract value is ~$${Number(analysis?.liveEstValue || 0).toFixed(2)}. Your live mathematical PnL is $${Number(analysis?.livePnL || 0).toFixed(2)}.`;
        }
        else if (userText.includes("score") || userText.includes("record")) {
          reply = `Our current recorded scorecard for the ${windowType.toUpperCase()} window is ${Number(scorecards[windowType]?.wins || 0)} Wins and ${Number(scorecards[windowType]?.losses || 0)} Losses.`;
        }
        else {
          reply = `My probability engine places YES at ${Number(analysis?.rawProbAbove || 0).toFixed(1)}%. Currently, my advice is to: ${String(analysis?.tradeAction || 'SIT OUT')}. Ask me 'why' to see my exact mathematical reasoning.`;
        }

        setChatLog([...currentLog, { role: 'tara', text: reply }]);
      }, 500); 
    }
  };

  useEffect(() => { setManualAction(null); }, [analysis?.tradeAction]);
  useEffect(() => { if (analysis && (analysis.prediction === "YES" || analysis.prediction === "NO" || analysis.prediction === "SIT OUT")) activeCallRef.current = { prediction: analysis.prediction, strike: targetMargin }; }, [analysis?.prediction, targetMargin]);

  return (
    <div className="min-h-screen bg-[#111312] text-[#E8E9E4] font-sans p-2 sm:p-4 flex flex-col items-center selection:bg-[#E8E9E4]/20 overflow-x-hidden">
      {/* Header - FULLY RESPONSIVE */}
      <div className="w-full max-w-6xl flex flex-wrap sm:flex-nowrap justify-between items-center border-b border-[#E8E9E4]/10 pb-3 mb-4 gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-xl md:text-2xl font-serif tracking-tight text-white flex items-center gap-2">
            Tara
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V38 Discipline
            </span>
          </h1>
          
          <div className="flex sm:hidden items-center gap-2">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-1.5 rounded-md border ${soundEnabled ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'} transition-colors`}>
              {soundEnabled ? <IconVolume2 className="w-3.5 h-3.5" /> : <IconVolumeX className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => setShowHelp(true)} className="p-1.5 rounded-md bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-white transition-colors">
              <IconHelp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        
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

        <div className="hidden sm:flex text-right font-sans items-center gap-4">
          <div className="flex flex-col items-end pl-4">
            <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest mb-0.5">Current EST</div>
            <div className="text-sm font-serif text-[#E8E9E4]/90">{String(timeState.currentEST || '--:--:--')}</div>
          </div>
          <div className="flex items-center gap-2 border-l border-[#E8E9E4]/10 pl-4">
            <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg border ${soundEnabled ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'} transition-colors`} title="Toggle Audio Alerts">
              {soundEnabled ? <IconVolume2 className="w-4 h-4" /> : <IconVolumeX className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowHelp(true)} className="p-2 rounded-lg bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-white transition-colors" title="Operations Manual">
              <IconHelp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl flex flex-col gap-4">
        
        {/* Top Control Bar */}
        <div className="bg-[#181A19] p-3 md:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col lg:flex-row items-center justify-between gap-4 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-70"></div>

           <div className="flex w-full lg:w-auto justify-between lg:justify-start items-center gap-4">
             <div className="flex items-center gap-3 w-1/2 lg:w-auto pl-1 md:pl-2">
               <div className="p-2 bg-[#111312] rounded-lg border border-[#E8E9E4]/5 shadow-inner">
                 <IconZap className={`w-5 h-5 transition-colors duration-200 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-[#E8E9E4]/40'}`} />
               </div>
               <div>
                 <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-0.5">Live Spot</div>
                 <div className={`text-xl sm:text-2xl md:text-3xl font-serif tracking-tight flex items-center gap-1 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-white'}`}>
                   ${currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                 </div>
               </div>
             </div>

             {/* Mobile Scorecard */}
             <div className="flex lg:hidden flex-col items-center bg-[#111312] p-2 rounded-xl border border-[#E8E9E4]/5 shadow-inner w-1/2">
               <div className="flex items-center justify-between w-full px-2">
                 <div className="flex flex-col items-center">
                   <div className="text-[9px] text-emerald-400 mb-0.5">WINS</div>
                   <span className="text-xl font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins || 0)}</span>
                 </div>
                 <div className="h-6 w-px bg-[#E8E9E4]/10"></div>
                 <div className="flex flex-col items-center">
                   <div className="text-[9px] text-rose-400 mb-0.5">LOSS</div>
                   <span className="text-xl font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses || 0)}</span>
                 </div>
               </div>
             </div>
           </div>
           
           <div className="w-px h-10 md:h-12 bg-[#E8E9E4]/10 hidden lg:block mx-2"></div>

           <div className="flex items-center gap-3 md:gap-6 w-full lg:w-auto bg-[#111312] p-3 md:p-4 rounded-xl border border-[#E8E9E4]/5 shadow-inner justify-between overflow-x-auto">
             <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[80px]">
               <div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1.5">Strike</div>
               <div className="flex items-center">
                 <IconCrosshair className="w-3 h-3 md:w-4 md:h-4 text-indigo-400 mr-1 md:mr-2 opacity-80 hidden sm:block" />
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

           {/* Desktop Scorecard */}
           <div className="hidden lg:flex flex-col items-start bg-[#111312] p-3 rounded-xl border border-[#E8E9E4]/5 shadow-inner w-56">
             <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-2 flex justify-between w-full">
               <span className="flex items-center gap-1.5"><IconTerminal className="w-3.5 h-3.5"/> {String(windowType).toUpperCase()} SCORECARD</span>
             </div>
             <div className="flex items-center justify-between w-full px-2">
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 mb-1">
                   <button onClick={() => updateScore(windowType, 'wins', -1)}>-</button> WINS <button onClick={() => updateScore(windowType, 'wins', 1)}>+</button>
                 </div>
                 <span className="text-3xl font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins || 0)}</span>
               </div>
               <div className="h-10 w-px bg-[#E8E9E4]/10"></div>
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1.5 text-[10px] text-rose-400 mb-1">
                   <button onClick={() => updateScore(windowType, 'losses', -1)}>-</button> LOSS <button onClick={() => updateScore(windowType, 'losses', 1)}>+</button>
                 </div>
                 <span className="text-3xl font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses || 0)}</span>
               </div>
             </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* MAIN OUTCOME DISPLAY */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            
            <div className="bg-[#181A19] p-4 md:p-6 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[380px] md:min-h-[420px]">
               
               <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-[#111312] border border-[#E8E9E4]/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm whitespace-nowrap">
                 <IconClock className="w-3 h-3" />
                 <span className="text-[#E8E9E4]/60 hidden sm:inline">{String(timeState.startWindowEST)}-{String(timeState.nextWindowEST)}</span>
                 <span className="text-[#E8E9E4]">{Number(timeState.minsRemaining)}m {Number(timeState.secsRemaining)}s</span>
               </div>

               {/* Force Pull Out */}
               {analysis && analysis.tradeAction !== "SIT OUT" && analysis.prediction !== "ANALYZING" && !analysis.tradeAction.includes("SKIPPING") && (
                 <button 
                   onClick={() => executeManualAction("MANUAL PULL OUT", "SIT OUT")}
                   className="absolute top-3 right-3 bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-2 sm:px-3 py-1.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                 >
                   <IconAlertTriangle className="w-3 h-3" /> <span className="hidden sm:inline">Force Pull Out</span>
                 </button>
               )}

               {isLoading || !analysis ? (
                 <div className="text-xl font-serif text-[#E8E9E4]/30 animate-pulse mt-8">Connecting to Datastream...</div>
               ) : (
                 <div className="flex flex-col items-center w-full mt-8 sm:mt-6">
                   
                   {/* V38 DATA BLOCK */}
                   <div className="bg-[#111312] border border-[#E8E9E4]/10 p-3 rounded-lg font-mono text-[10px] sm:text-[11px] text-[#E8E9E4]/60 mb-4 w-full max-w-[500px] mx-auto shadow-inner text-left flex flex-col gap-2">
                     <div className="flex justify-between items-center bg-[#181A19] p-2 rounded border border-[#E8E9E4]/5">
                       <div className="flex flex-col">
                         <span className="text-[8px] text-[#E8E9E4]/40 uppercase tracking-widest">Market</span>
                         <span className="text-[#E8E9E4] text-sm">${Number(currentPrice || 0).toFixed(2)}</span>
                       </div>
                       <div className="flex flex-col text-center">
                         <span className="text-[8px] text-[#E8E9E4]/40 uppercase tracking-widest">Strike</span>
                         <span className="text-indigo-300 text-sm">${Number(targetMargin || 0).toFixed(0)}</span>
                       </div>
                       <div className="flex flex-col text-right">
                         <span className="text-[8px] text-[#E8E9E4]/40 uppercase tracking-widest">Gap</span>
                         <span className={`font-bold text-sm ${analysis.realGapBps > 0 ? 'text-emerald-400' : analysis.realGapBps < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                           {analysis.realGapBps > 0 ? '+' : ''}{Number(analysis.realGapBps || 0).toFixed(1)}bps
                         </span>
                       </div>
                       {/* BRTI Fix implemented here */}
                       <div className="flex flex-col text-right border-l border-[#E8E9E4]/10 pl-2">
                         <span className="text-[8px] text-[#E8E9E4]/40 uppercase tracking-widest">BRTI</span>
                         <span className="text-[#E8E9E4] text-sm">{brtiPremium > 0 ? '+' : ''}{Number(brtiPremium || 0).toFixed(1)}</span>
                       </div>
                     </div>
                     
                     <div className="flex justify-between items-center text-[9px] opacity-90 px-1 pt-1">
                       <span className="flex items-center gap-1">
                         <IconActivity className="w-3 h-3 text-purple-400" />
                         REGIME: <span className="text-white font-bold">{String(analysis.regime)}</span>
                       </span>
                       <span>
                         WINDOW: <span className={String(analysis.entryWindowStatus).includes("Active") ? 'text-emerald-400 font-bold' : 'text-amber-400'}>{String(analysis.entryWindowStatus)}</span>
                       </span>
                     </div>
                     <div className="flex justify-between items-center text-[9px] opacity-90 px-1 pb-1 border-b border-[#E8E9E4]/10">
                       <span className="flex items-center gap-1">
                         <IconZap className="w-3 h-3 text-amber-400" />
                         TOP DRIVER: <span className="text-white">{String(analysis.topDriver)}</span>
                       </span>
                       <span>
                         CONV: <span className="text-indigo-300 font-bold">{Number(analysis.convictionScore || 0).toFixed(0)}% ({analysis.convictionText})</span>
                       </span>
                     </div>
                   </div>

                   <div className="flex flex-col items-center mb-2">
                     <span className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest mb-1">Prediction</span>
                     <h2 className={`text-6xl sm:text-7xl font-serif font-bold leading-none tracking-tight ${analysis.textColor} drop-shadow-sm transition-all flex items-center justify-center gap-2 uppercase`}>
                       {String(analysis.prediction)}
                     </h2>
                   </div>

                   <p className="text-[11px] sm:text-xs text-[#E8E9E4]/50 font-sans max-w-sm mx-auto mb-4 px-2 h-8 leading-tight">
                     {String(analysis.predictionReason)}
                   </p>

                   {/* LIVE PnL TRACKER */}
                   {userPosition !== null && (
                     <div className={`flex items-center gap-3 sm:gap-4 mb-4 px-3 sm:px-4 py-2 rounded-lg border w-full max-w-[300px] justify-center ${analysis.livePnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                       <div className="flex flex-col text-center sm:text-left">
                         <span className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-60">Contract Value</span>
                         <span className="font-serif text-base sm:text-lg">${Number(analysis.liveEstValue || 0).toFixed(2)}</span>
                       </div>
                       <div className="w-px h-6 bg-[#E8E9E4]/20"></div>
                       <div className="flex flex-col text-center sm:text-left">
                         <span className="text-[8px] sm:text-[9px] uppercase tracking-widest opacity-60">Est PnL</span>
                         <span className={`font-serif font-bold text-base sm:text-lg ${analysis.livePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {analysis.livePnL >= 0 ? '+' : '-'}${Math.abs(Number(analysis.livePnL || 0)).toFixed(2)}
                         </span>
                       </div>
                     </div>
                   )}

                   {/* INTERACTIVE TRADE ADVISOR */}
                   <div className={`mb-4 w-full max-w-[400px] p-3 sm:p-4 rounded-xl border-[1.5px] ${analysis.actionBg} transition-colors flex flex-col items-center text-center shadow-sm`}>
                     <div className="flex items-center gap-1.5 mb-1.5">
                       <IconBell className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${analysis.actionColor}`} />
                       <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-80 text-[#E8E9E4]">Advisor</span>
                     </div>
                     <div className={`text-base sm:text-lg font-serif font-bold mb-1 ${analysis.actionColor} uppercase`}>{String(analysis.tradeAction)}</div>
                     <p className="text-[10px] sm:text-[11px] opacity-80 text-[#E8E9E4] mb-2 sm:mb-3 leading-tight">{String(analysis.tradeReason)}</p>

                     {analysis.hasAction && (
                       <div className="w-full pt-2 sm:pt-3 border-t border-[#E8E9E4]/10">
                          {manualAction === analysis.tradeAction ? (
                             <div className="w-full bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                               <IconCheck className="w-3.5 h-3.5" /> Action Logged
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
                               {String(analysis.actionButtonLabel)}
                             </button>
                          )}
                       </div>
                     )}
                   </div>
                   
                   {/* MANUAL SYNC BUTTONS */}
                   {userPosition === null && (
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
                  <IconTrendingUp className="w-3.5 h-3.5 text-purple-400" /> Hourly Forecast Projections
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {analysis.projections.map((proj, idx) => (
                    <div key={idx} className="bg-[#111312] rounded-lg p-2 text-center border border-[#E8E9E4]/5">
                      <div className="text-[9px] text-[#E8E9E4]/40 font-bold uppercase mb-1">{String(proj.time)}</div>
                      <div className="text-sm font-serif text-purple-100">${Number(proj.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-4">
            
            <div className="flex gap-4">
              <div className="flex-1 bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 text-center">
                 <div className="text-[8px] sm:text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-1">POSTERIOR (UP)</div>
                 <div className="text-xl sm:text-2xl font-serif text-indigo-300">{analysis ? `${Number(analysis.rawProbAbove || 0).toFixed(1)}%` : '--%'}</div>
              </div>
              <div className="flex-1 bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 text-center">
                 <div className="text-[8px] sm:text-[9px] text-[#E8E9E4]/50 font-bold uppercase mb-1">POSTERIOR (DN)</div>
                 <div className="text-xl sm:text-2xl font-serif text-rose-300">{analysis ? `${(100 - Number(analysis.rawProbAbove || 0)).toFixed(1)}%` : '--%'}</div>
              </div>
            </div>

            {/* Strict 4-Rule Logic Logs */}
            {analysis && (
              <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex-1 min-h-[150px]">
                <h2 className="text-[10px] font-medium text-[#E8E9E4]/60 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <IconTerminal className="w-3.5 h-3.5 text-amber-400" /> Math Engine Logs
                </h2>
                <div className="space-y-2 font-mono h-[120px] lg:h-full lg:max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                  {analysis.reasoning.map((reason, idx) => (
                    <div key={idx} className="bg-[#111312] p-2 rounded-md text-[9px] text-[#E8E9E4]/70 flex items-start gap-2 border border-[#E8E9E4]/5 uppercase">
                      <span className="text-emerald-500 mt-0.5">{`>`}</span>
                      <span className="leading-snug">{String(reason)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Live Feeds */}
            <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col h-[200px]">
              <div className="flex justify-between items-center mb-3 border-b border-[#E8E9E4]/10 pb-2">
                <h2 className="text-[10px] font-medium text-[#E8E9E4]/60 uppercase tracking-widest flex items-center gap-1.5">
                  <IconGlobe className="w-3.5 h-3.5 text-blue-400" /> Tara Live Wire
                </h2>
              </div>
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
                {newsEvents.length === 0 ? (
                   <div className="text-[11px] text-[#E8E9E4]/40 italic">Generating market intel...</div>
                ) : (
                  newsEvents.map((news, i) => (
                    <div key={i} className="border-l-[2px] border-indigo-500/40 pl-2 py-0.5">
                      <span className="text-[11px] sm:text-[11.5px] text-[#E8E9E4]/90 leading-tight">
                        {String(news.title)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* FLOATING CHAT WIDGET */}
      <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all ${isChatOpen ? 'w-[90vw] sm:w-80' : 'w-auto'}`}>
        {isChatOpen && (
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 shadow-2xl rounded-xl w-full mb-3 overflow-hidden flex flex-col h-[60vh] sm:h-96">
            <div className="bg-[#111312] p-3 flex justify-between items-center border-b border-[#E8E9E4]/10">
              <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                <IconMessage className="w-3.5 h-3.5 text-indigo-400" /> Chat w/ Tara
              </span>
              <button onClick={() => setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><IconX className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111312]/50">
              {chatLog.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[10px] uppercase opacity-40 mb-1 ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>{String(msg.role)}</span>
                  <div className={`text-xs p-2.5 rounded-lg max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-tr-none' : 'bg-[#2A2D2C] text-[#E8E9E4] border border-[#E8E9E4]/10 rounded-tl-none'} ${msg.isLoading ? 'animate-pulse' : ''}`}>
                    {String(msg.text)}
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
            <IconMessage className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* HELP / MANUAL MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center z-10">
              <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2">
                <IconInfo className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /> Tara Operations Manual
              </h2>
              <button onClick={() => setShowHelp(false)} className="text-[#E8E9E4]/50 hover:text-white"><IconX className="w-5 h-5" /></button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 text-xs sm:text-sm text-[#E8E9E4]/80">
              
              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">1. The 4-Rule Quant Algorithm</h3>
                <p className="mb-3 leading-relaxed">Tara uses strict gating logic to mimic an institutional 90% WR benchmark. A call is only issued if <strong>ALL 4 rules pass simultaneously:</strong></p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Active Entry Window:</strong> The trade must occur after the initial open volatility settles.</li>
                  <li><strong>Regime Validation:</strong> The market must NOT be in a "CHOP" regime.</li>
                  <li><strong>Posterior Check:</strong> The mathematical baseline probability must be over 65% for UP, or under 35% for DOWN.</li>
                  <li><strong>Φ3 Physics:</strong> Raw tape momentum (AggrFlow) must explicitly agree with the physical gap direction.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">2. Skip Round Protocol (V38)</h3>
                <p className="leading-relaxed">Sometimes the best trade is no trade. If Tara is in the Active Entry window but detects that the market is "wiggling with no clear direction" (CHOP regime) or lacks conviction, she will trigger a <strong>SKIPPING ROUND</strong> alert. Do not guess. Close the app and come back next round.</p>
              </section>

              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">3. Early Exit</h3>
                <p className="leading-relaxed">If you are in a winning position, but Tara detects that whales are suddenly selling the momentum back down (AggrFlow flipping), she will trigger an <strong>EARLY EXIT</strong> alert. <br/><br/>If you type the platform's current "Live Market Offer" into the box, Tara will instantly calculate your true Edge. If they offer you $70 for a contract mathematically worth $50, she will advise you to take the Arbitrage.</p>
              </section>

              <section>
                <h3 className="text-indigo-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">4. Understanding the Data Dashboard</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 mt-2 font-mono text-[10px] sm:text-[11px]">
                  <div className="bg-[#111312] p-3 rounded border border-[#E8E9E4]/10">
                    <span className="text-indigo-300 font-bold block mb-1">REGIME:</span>
                    Categorizes the market context (TREND UP, TREND DN, CHOP, VOLATILE) to dynamically determine indicator weights.
                  </div>
                  <div className="bg-[#111312] p-3 rounded border border-[#E8E9E4]/10">
                    <span className="text-indigo-300 font-bold block mb-1">AGGR FLOW:</span>
                    Aggressive Taker Flow (normalized -1.0 to 1.0). The primary leading indicator for identifying where whales are pushing the price.
                  </div>
                  <div className="bg-[#111312] p-3 rounded border border-[#E8E9E4]/10">
                    <span className="text-indigo-300 font-bold block mb-1">VWAP GAP:</span>
                    Tracks the distance from the Volume Weighted Average Price.
                  </div>
                  <div className="bg-[#111312] p-3 rounded border border-[#E8E9E4]/10">
                    <span className="text-indigo-300 font-bold block mb-1">CONV (Conviction):</span>
                    How strongly the current math favors the prediction based on the divergence score.
                  </div>
                </div>
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
