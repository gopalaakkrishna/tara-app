import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- 100% DEPENDENCY-FREE INLINE ICONS ---
const IconClock = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconCrosshair = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>;
const IconZap = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconTerminal = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconAlertTriangle = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconActivity = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconBell = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconTrendingUp = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-400"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconGlobe = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconMessage = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconX = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconInfo = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconVolume2 = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const IconVolumeX = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
const IconHelp = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

// --- NATIVE INTERACTIVE CANDLESTICK / LINE CHART ---
const LiveChart = ({ data, currentPrice, targetMargin, showCandles, rugPullActive }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoverPos, setHoverPos] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0) return;
    const ctx = canvas.getContext('2d');
    const rect = containerRef.current.getBoundingClientRect();
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = rect.width;
    const height = rect.height;
    const rightMargin = 65; 
    const bottomMargin = 20;
    const chartW = width - rightMargin;
    const chartH = height - bottomMargin;

    ctx.clearRect(0, 0, width, height);

    const validData = [...data].reverse().filter(d => d.h !== undefined && d.l !== undefined);
    const visibleCount = Math.max(15, Math.floor(validData.length / zoom));
    const maxPan = Math.max(0, validData.length - visibleCount);
    const currentPan = Math.max(0, Math.min(pan, maxPan));
    
    const viewData = validData.slice(currentPan, currentPan + visibleCount);
    if(viewData.length === 0) return;

    let minPrice = Math.min(...viewData.map(d => d.l));
    let maxPrice = Math.max(...viewData.map(d => d.h));
    
    // Include target margin in scale if exists so we can see the line
    if (targetMargin > 0) {
        minPrice = Math.min(minPrice, targetMargin - 50);
        maxPrice = Math.max(maxPrice, targetMargin + 50);
    }

    const padding = (maxPrice - minPrice) * 0.1 || 10;
    const scaleY = chartH / (maxPrice - minPrice + padding * 2);
    const yOffset = maxPrice + padding;

    // Background Grid & Y-Axis Prices
    ctx.strokeStyle = 'rgba(232, 233, 228, 0.05)';
    ctx.fillStyle = 'rgba(232, 233, 228, 0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    
    for(let i=0; i<=5; i++) {
        const y = (chartH / 5) * i;
        const price = maxPrice + padding - (y / scaleY);
        
        ctx.beginPath();
        ctx.moveTo(0, y); 
        ctx.lineTo(chartW, y);
        ctx.stroke();
        
        if (i < 5) ctx.fillText(price.toFixed(2), chartW + 5, y);
    }

    const spacing = chartW / viewData.length;
    const candleWidth = Math.max(1, spacing * 0.6);

    // X-Axis Times
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for(let i=1; i<5; i++) {
        const x = (chartW / 5) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0); 
        ctx.lineTo(x, chartH);
        ctx.stroke();

        const dataIndex = Math.floor(x / spacing);
        if (viewData[dataIndex] && viewData[dataIndex].time) {
            const t = viewData[dataIndex].time;
            const d = new Date(t > 1e11 ? t : t * 1000);
            ctx.fillText(d.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}), x, chartH + 5);
        }
    }

    // Target Margin Strike Line
    if (targetMargin > 0) {
        const targetY = (yOffset - targetMargin) * scaleY;
        if (targetY > 0 && targetY < chartH) {
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'; // Indigo line
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(0, targetY);
            ctx.lineTo(chartW, targetY);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
            ctx.fillRect(chartW, targetY - 10, rightMargin, 20);
            ctx.fillStyle = '#818cf8';
            ctx.textAlign = 'left';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(targetMargin.toFixed(2), chartW + 5, targetY);
        }
    }

    if (showCandles) {
      // Draw Candlesticks
      viewData.forEach((candle, i) => {
        const x = i * spacing + spacing / 2;
        const isBullish = candle.c >= candle.o;
        const color = isBullish ? '#34d399' : '#fb7185'; 

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, (yOffset - candle.h) * scaleY);
        ctx.lineTo(x, (yOffset - candle.l) * scaleY);
        ctx.stroke();

        ctx.fillStyle = color;
        const bodyY = (yOffset - Math.max(candle.o, candle.c)) * scaleY;
        const bodyHeight = Math.max(2, Math.abs(candle.c - candle.o) * scaleY);
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
      });
    } else {
      // Draw Purple Area Line Chart
      ctx.beginPath();
      viewData.forEach((candle, i) => {
         const x = i * spacing + spacing / 2;
         const y = (yOffset - candle.c) * scaleY;
         if(i === 0) ctx.moveTo(x, y);
         else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#c084fc'; 
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.lineTo(chartW, chartH);
      ctx.lineTo(0, chartH);
      ctx.closePath();
      
      const grad = ctx.createLinearGradient(0, 0, 0, chartH);
      grad.addColorStop(0, 'rgba(192, 132, 252, 0.2)');
      grad.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Draw Current Price Line
    if (currentPrice) {
      const currentY = (yOffset - currentPrice) * scaleY;
      if (currentY > 0 && currentY < chartH) {
        ctx.strokeStyle = rugPullActive ? '#fb7185' : '#34d399';
        ctx.lineWidth = rugPullActive ? 2 : 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, currentY);
        ctx.lineTo(chartW, currentY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Price Tag
        ctx.fillStyle = rugPullActive ? '#fb7185' : '#34d399';
        ctx.fillRect(chartW, currentY - 10, rightMargin, 20);
        ctx.fillStyle = '#111312';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(currentPrice.toFixed(2), chartW + 5, currentY);
      }
    }

    // RUG PULL OVERLAY
    if (rugPullActive) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.1)';
        ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fb7185';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText("🚨 RUG PULL DETECTED", width / 2, height / 2);
    }

    // Draw Hover Crosshair
    if (hoverPos && hoverPos.x < chartW && hoverPos.y < chartH) {
      ctx.strokeStyle = 'rgba(232, 233, 228, 0.2)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      ctx.beginPath();
      ctx.moveTo(hoverPos.x, 0); ctx.lineTo(hoverPos.x, chartH);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(0, hoverPos.y); ctx.lineTo(chartW, hoverPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!showCandles && !rugPullActive) {
         const dataIndex = Math.floor(hoverPos.x / spacing);
         if (viewData[dataIndex]) {
            const dotX = dataIndex * spacing + spacing / 2;
            const dotY = (yOffset - viewData[dataIndex].c) * scaleY;
            ctx.beginPath();
            ctx.arc(dotX, dotY, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#c084fc';
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#c084fc';
            ctx.stroke();
            ctx.shadowBlur = 0;
         }
      }

      const hoverPrice = yOffset - (hoverPos.y / scaleY);
      ctx.fillStyle = '#2A2D2C';
      ctx.fillRect(chartW, hoverPos.y - 10, rightMargin, 20);
      ctx.fillStyle = '#E8E9E4';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = '10px sans-serif';
      ctx.fillText(hoverPrice.toFixed(2), chartW + 5, hoverPos.y);

      const dataIndex = Math.floor(hoverPos.x / spacing);
      if (viewData[dataIndex] && viewData[dataIndex].time) {
          const t = viewData[dataIndex].time;
          const d = new Date(t > 1e11 ? t : t * 1000);
          const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
          const timeStr = d.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'});
          const fullStr = `${dateStr} ${timeStr}`;
          
          ctx.fillStyle = '#2A2D2C';
          ctx.fillRect(hoverPos.x - 50, chartH, 100, bottomMargin);
          ctx.fillStyle = '#E8E9E4';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(fullStr, hoverPos.x, chartH + (bottomMargin/2));
      }
    }

  }, [data, currentPrice, zoom, pan, hoverPos, showCandles, targetMargin, rugPullActive]);

  const handleWheel = (e) => {
      setZoom(prev => Math.max(1, Math.min(10, prev - e.deltaY * 0.005)));
  };

  const handlePointerDown = (e) => {
      isDragging.current = true;
      lastMouseX.current = e.clientX;
  };

  const handlePointerMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setHoverPos({ x, y });

      if (isDragging.current) {
          const deltaX = e.clientX - lastMouseX.current;
          setPan(prev => prev - (deltaX * 0.1));
          lastMouseX.current = e.clientX;
      }
  };

  const handlePointerUp = () => { isDragging.current = false; };
  const handlePointerLeave = () => { setHoverPos(null); isDragging.current = false; };

  return (
      <div ref={containerRef} className="w-full h-full relative cursor-crosshair">
          <canvas 
              ref={canvasRef} 
              className="absolute inset-0 w-full h-full"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerLeave}
          />
      </div>
  );
};

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
    const high = history[i].h; const low = history[i].l; const prevClose = history[i + 1]?.c || history[i].o;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trSum += tr;
  }
  return trSum / period;
};

export default function App() {
  const [isMounted, setIsMounted] = useState(false);
  
  // UI Toggles
  const [showCandles, setShowCandles] = useState(true); 
  const [showWhaleAlerts, setShowWhaleAlerts] = useState(true);
  const [showRugPullAlerts, setShowRugPullAlerts] = useState(true);
  
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
  
  const [targetMargin, setTargetMargin] = useState(0); 
  const [betAmount, setBetAmount] = useState(0);
  const [maxPayout, setMaxPayout] = useState(0);
  const [currentOffer, setCurrentOffer] = useState(""); 

  const [windowType, setWindowType] = useState('15m'); 
  const [timeState, setTimeState] = useState({ currentEST: '', startWindowEST: '', nextWindowEST: '', minsRemaining: 0, secsRemaining: 0, currentHour: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const lockedPredictionRef = useRef("SIT OUT");
  const activeCallRef = useRef({ prediction: "SIT OUT", strike: 0 });
  const hasReversedRef = useRef(false); 
  
  // SSR Hydration & Baseline Setup
  const [scorecards, setScorecards] = useState({ '15m': { wins: 83, losses: 62 }, '5m': { wins: 10, losses: 7 } });
  const [prevCyclesMap, setPrevCyclesMap] = useState({ '15m': [], '5m': [] });
  
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedScore = localStorage.getItem('btcOracleScorecardV47');
      if (savedScore) setScorecards(JSON.parse(savedScore));
      
      const savedCycles = localStorage.getItem('btcOraclePrevCyclesV47');
      if (savedCycles) setPrevCyclesMap(JSON.parse(savedCycles));
    } catch (e) {}
  }, []);

  const [manualAction, setManualAction] = useState(null);
  const [forceRender, setForceRender] = useState(0); 
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLog, setChatLog] = useState([{ role: 'tara', text: "Tara V47 Layout Active. Full width native canvas chart installed. Real-time candlestick injection running. Whale & Rug Pull safety toggles engaged." }]);
  const [chatInput, setChatInput] = useState("");
  
  const lastWindowRef = useRef("");
  const [userPosition, setUserPosition] = useState(null); 
  const [showHelp, setShowHelp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevActionRef = useRef(null);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try { 
        localStorage.setItem('btcOracleScorecardV47', JSON.stringify(scorecards)); 
        localStorage.setItem('btcOraclePrevCyclesV47', JSON.stringify(prevCyclesMap));
      } 
      catch (e) {}
    }
  }, [scorecards, prevCyclesMap, isMounted]);

  // LIVE CANDLESTICK TICK INJECTION 
  const liveHistory = useMemo(() => {
    if (history.length === 0 || !currentPrice) return history;
    const updated = [...history];
    updated[0] = {
      ...updated[0],
      c: currentPrice,
      h: Math.max(updated[0].h || currentPrice, currentPrice),
      l: Math.min(updated[0].l || currentPrice, currentPrice)
    };
    return updated;
  }, [history, currentPrice]);

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
    setBetAmount(0);
    setMaxPayout(0);
    lastWindowRef.current = ""; 
    setForceRender(prev => prev + 1);
  };

  const updateScore = (type, winOrLoss, amount) => {
    setScorecards(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [winOrLoss]: Math.max(0, (prev[type]?.[winOrLoss] || 0) + amount)
      }
    }));
  };

  // Window Rollover logic & Previous Cycles Tracker
  useEffect(() => {
    if (timeState.nextWindowEST && timeState.nextWindowEST !== lastWindowRef.current) {
      if (currentPrice !== null) {
        if (lastWindowRef.current !== "") {
          const prevCall = activeCallRef.current;
          const endGap = prevCall.strike > 0 ? ((currentPrice - prevCall.strike) / prevCall.strike) * 10000 : 0;
          const outcome = currentPrice > prevCall.strike ? 'UP' : 'DOWN';
          
          setPrevCyclesMap(prev => {
             const currentList = prev[windowType] || [];
             const newCycle = {
                time: lastWindowRef.current,
                outcome: outcome,
                gapPct: (Math.abs(endGap) / 100).toFixed(2) + '%'
             };
             const updatedList = [newCycle, ...currentList].slice(0, 3);
             return { ...prev, [windowType]: updatedList };
          });

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
        setBetAmount(0); 
        setMaxPayout(0); 
      }
    }
  }, [timeState.nextWindowEST, currentPrice, windowType]);

  // WEBSOCKETS
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    let isCanvas = false;
    try { isCanvas = window.self !== window.top; } 
    catch (e) { isCanvas = true; } 
    
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
      if (isCanvas) return; 

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
              formattedHistory = dataCB.slice(0, 60).map(c => ({ 
                time: c[0], 
                l: parseFloat(c[1]), 
                h: parseFloat(c[2]), 
                o: parseFloat(c[3]), 
                c: parseFloat(c[4]), 
                v: parseFloat(c[5]) 
              }));
            }
          }
        } catch (e) {}

        if (formattedHistory.length > 0) setHistory(formattedHistory);

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

  // BULLETPROOF TIME ENGINE (100% Vercel SSR Crash Proof)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const msNow = now.getTime();
      const intervalMs = (windowType === '15m' ? 15 : 5) * 60 * 1000;
      
      const nextWindowMs = Math.ceil((msNow + 500) / intervalMs) * intervalMs; 
      const nextWindow = new Date(nextWindowMs);
      const startWindow = new Date(nextWindowMs - intervalMs);
      
      const diffMs = nextWindow.getTime() - now.getTime();
      
      let currentEST, startWindowEST, nextWindowEST;
      try {
         currentEST = now.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
         startWindowEST = startWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' });
         nextWindowEST = nextWindow.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour12: true, hour: '2-digit', minute: '2-digit' });
      } catch (e) {
         currentEST = now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
         startWindowEST = startWindow.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
         nextWindowEST = nextWindow.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit' });
      }
      
      setTimeState({ 
        currentEST, startWindowEST, nextWindowEST, 
        minsRemaining: Math.floor(diffMs / 60000), 
        secsRemaining: Math.floor((diffMs % 60000) / 1000), 
        currentHour: now.getHours() 
      });
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [windowType]);

  // --- TARA V40: ZERO-LATENCY REAL-TIME ENGINE ---
  const analysis = useMemo(() => {
    if (!currentPrice || liveHistory.length < 30 || !targetMargin || !isMounted) return null;

    const is15m = windowType === '15m';
    const intervalSeconds = is15m ? 900 : 300;
    const clockSeconds = (timeState.minsRemaining * 60) + timeState.secsRemaining;
    const timeFraction = Math.max(0, Math.min(1, 1 - (clockSeconds / intervalSeconds)));
    
    const isEndgameLock = clockSeconds < 120; 

    const closes = liveHistory.map(x => x.c);
    const rsi = calculateRSI(closes, 14) || 50;
    const atr = calculateATR(liveHistory, 14) || 10;
    const atrBps = atr > 0 ? (atr / currentPrice) * 10000 : 15; 
    const vwap = calculateVWAP(liveHistory);

    const realGapBps = ((currentPrice - targetMargin) / targetMargin) * 10000;
    const vwapGapBps = vwap ? ((currentPrice - vwap) / vwap) * 10000 : 0;
    
    const ticks = tickHistoryRef.current;
    const tickSlope = ticks.length >= 10 ? (currentPrice - ticks[0].p) : 0;
    
    let aggrFlow = (takerFlow.imbalance - 1);
    aggrFlow = Math.max(-1.0, Math.min(1.0, aggrFlow));

    let mktImplied = (orderBook.imbalance - 1);
    mktImplied = Math.max(-1.0, Math.min(1.0, mktImplied));

    let liqBuys = 0; let liqSells = 0;
    liquidations.forEach(l => {
      if (Date.now() - l.time < 60000) {
        if (l.side === 'BUY') liqBuys += l.value; 
        else liqSells += l.value; 
      }
    });

    let baseProb = 50;
    let regime = "RANGE/CHOP";
    let reasoning = [];
    
    // RUG PULL & WHALE LOGIC
    let isRugPull = false;
    if (tickSlope < -5.0 && aggrFlow < -0.6) {
        isRugPull = true;
    }

    const timeDecay = Math.pow(timeFraction, 2); 
    const gapWeight = realGapBps * (is15m ? 1.0 : 1.5) * (0.2 + 0.8 * timeDecay);
    baseProb += gapWeight;

    if (rsi > 65 && realGapBps > 0) {
       baseProb -= 20; 
       regime = "OVERBOUGHT (FADE)";
       reasoning.push(`REGIME: RSI is ${rsi.toFixed(1)}. Pumping but overextended. Fading the top.`);
    } else if (rsi < 35 && realGapBps < 0) {
       baseProb += 20; 
       regime = "OVERSOLD (FADE)";
       reasoning.push(`REGIME: RSI is ${rsi.toFixed(1)}. Dumping but overextended. Fading the bottom.`);
    } else if (Math.abs(vwapGapBps) > 2 && tickSlope > 0.5) {
       regime = "STRONG UPTREND";
       baseProb += (aggrFlow * 25) + 10;
       reasoning.push(`REGIME: Strong Uptrend identified. Trusting AggrFlow.`);
    } else if (Math.abs(vwapGapBps) > 2 && tickSlope < -0.5) {
       regime = "STRONG DOWNTREND";
       baseProb += (aggrFlow * 25) - 10;
       reasoning.push(`REGIME: Strong Downtrend identified. Trusting AggrFlow.`);
    } else {
       regime = "RANGE/CHOP";
       baseProb += (aggrFlow * 20) + (mktImplied * 10);
       reasoning.push(`REGIME: Market ranging. Orderbook & Tape dictates path.`);
    }

    if (liqBuys > 10000) { baseProb += 15; reasoning.push(`LIQ: Shorts squeezed. Upward force applied.`); }
    if (liqSells > 10000) { baseProb -= 15; reasoning.push(`LIQ: Longs squeezed. Downward force applied.`); }

    if (isEndgameLock) {
        reasoning.push(`ENDGAME: Physics overrule momentum. Physical gap locked in.`);
        baseProb = 50 + (realGapBps * 4); // Override with physical distance
    }

    let prediction = userPosition || lockedPredictionRef.current; 
    let activePrediction = prediction;

    if (activePrediction === "YES") baseProb += 10; 
    else if (activePrediction === "NO") baseProb -= 10;

    let posterior = Math.max(1, Math.min(99, baseProb)); 
    let convictionScore = Math.abs(posterior - 50) * 2; 

    // V40: ZERO LATENCY ENTRY.
    if (activePrediction === "SIT OUT" && !isEndgameLock) {
        if (posterior >= 65) activePrediction = "YES";
        else if (posterior <= 35) activePrediction = "NO";
    } else if (activePrediction !== "SIT OUT") {
        if (activePrediction === "YES" && posterior < 30) activePrediction = "SIT OUT";
        if (activePrediction === "NO" && posterior > 70) activePrediction = "SIT OUT";
    }

    if (isEndgameLock && Math.abs(realGapBps) > atrBps) {
        activePrediction = realGapBps > 0 ? "YES" : "NO";
    }

    let tradeAction = "WAITING / SIT OUT"; 
    let tradeReason = "Awaiting structural confirmation to signal.";
    let actionColor = "text-zinc-400"; let actionBg = "bg-zinc-500/10 border-zinc-500/30";
    let hasAction = false, actionButtonLabel = "", actionTarget = "";

    const dynamicStopLoss = atrBps * (0.60 + ((1-timeFraction) * 0.40)); 
    let liveEstValue = activePrediction === "YES" ? maxPayout * (posterior / 100) : activePrediction === "NO" ? maxPayout * ((100 - posterior) / 100) : 0;
    const livePnL = liveEstValue - betAmount;
    const offerVal = parseFloat(currentOffer) || 0;

    if (isRugPull && showRugPullAlerts) {
        tradeAction = "🚨 RUG PULL DETECTED 🚨"; 
        tradeReason = "Massive instantaneous liquidity collapse. Abort longs immediately.";
        actionColor = "text-rose-500"; actionBg = "bg-rose-500/20 border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.4)]";
        hasAction = true; actionButtonLabel = "EMERGENCY CASHOUT"; actionTarget = "SIT OUT";
    }
    else if (activePrediction === "SIT OUT") {
        if (isEndgameLock) {
            tradeAction = "WINDOW CLOSED"; tradeReason = "Late in round. Entering now is unsafe.";
            actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
        } else {
            tradeAction = "AWAITING CONVICTION"; tradeReason = "Odds below 65%. Waiting for cleaner setup.";
        }
    }
    else {
        const isYES = activePrediction === "YES";
        const isBleeding = isYES ? (realGapBps < -dynamicStopLoss) : (realGapBps > dynamicStopLoss);
        const isReversalRecommended = isYES ? (posterior < 35) : (posterior > 65);
        const currentOdds = isYES ? posterior : (100 - posterior);

        if (prediction === "SIT OUT") {
            tradeAction = `ENTRY SIGNAL: ${activePrediction}`;
            tradeReason = "Quant composite supports entry. Execute now.";
            actionColor = isYES ? "text-emerald-400" : "text-rose-400";
            actionBg = isYES ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(251,113,133,0.2)]";
            hasAction = true;
            actionButtonLabel = `CONFIRM ENTRY: '${activePrediction}'`;
            actionTarget = activePrediction;
        }
        else if (offerVal > 0 && offerVal - liveEstValue > (maxPayout * 0.05)) {
            tradeAction = "SELL TO MARKET (ARB)"; 
            tradeReason = `Market is overpaying. Take the free arbitrage.`;
            actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30 animate-pulse";
            hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "CASH";
        }
        else if (isReversalRecommended && !hasReversedRef.current) {
            tradeAction = "REVERSE POSITION"; tradeReason = `Trend collapsed. Switch position.`;
            actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
            hasAction = true; actionButtonLabel = `REVERSE TO '${isYES ? 'NO' : 'YES'}'`; actionTarget = isYES ? "NO" : "YES";
        }
        else if (isBleeding || (isReversalRecommended && hasReversedRef.current)) {
            tradeAction = "CUT LOSSES"; tradeReason = "Position drifted past dynamic ATR limit. Exit.";
            actionColor = "text-rose-500"; actionBg = "bg-rose-500/10 border-rose-500/30";
            hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "SIT OUT";
        }
        else if (currentOdds >= 85 && offerVal === 0) {
            tradeAction = "SECURE MAX PROFIT"; tradeReason = "Odds > 85%. Lock in gains when ready.";
            actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
            hasAction = true; actionButtonLabel = "EXECUTE CASHOUT (PROFIT)"; actionTarget = "CASH";
        }
        else if (offerVal === 0) {
            tradeAction = "HOLD FIRM"; tradeReason = "Holding position. Quant composite supports trend.";
            actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/20";
        }
    } 

    let textColor = activePrediction === "YES" ? "text-emerald-400" : activePrediction === "NO" ? "text-rose-400" : "text-zinc-500";
    let entryWindowStatus = isEndgameLock ? "Window Closed" : "Active Signal Window";

    let topDriver = "";
    if (Math.abs(aggrFlow) > 0.5) topDriver = `AggrFlow (${aggrFlow > 0 ? '+' : ''}${aggrFlow.toFixed(2)})`;
    else topDriver = `CrossProb (${posterior > 50 ? '+' : ''}${(posterior/100).toFixed(2)})`;

    let convictionText = "Neutral";
    if (convictionScore > 60) convictionText = "Very Sure";
    else if (convictionScore > 35) convictionText = "Pretty Sure";
    else convictionText = "Unsure";

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
    
    // SAFE FORECAST LOGIC
    for(let i=1; i<=4; i++) {
        const nextHour = (timeState.currentHour + i) % 24;
        let timeLabel = `${nextHour.toString().padStart(2, '0')}:00`;
        
        simulatedPrice += (tickSlope * driftModifier + (sentimentScore * 20));
        projections.push({ time: timeLabel, price: simulatedPrice });
    }

    return { 
      confidence: activePrediction === "NO" ? (100 - posterior).toFixed(1) : posterior.toFixed(1), 
      prediction: activePrediction, predictionReason, reasoning, textColor, rawProbAbove: posterior,
      tradeAction, tradeReason, actionColor, actionBg, hasAction, actionButtonLabel, actionTarget, 
      realGapBps, clockSeconds, isSystemLocked: isEndgameLock, atrBps, livePnL, liveEstValue, projections,
      vwapGapBps, regime, aggrFlow, topDriver, entryWindowStatus, convictionScore, convictionText,
      isRugPull
    };
  }, [currentPrice, liveHistory, targetMargin, timeState.minsRemaining, timeState.secsRemaining, timeState.currentHour, orderBook, forceRender, betAmount, maxPayout, currentOffer, takerFlow, liquidations, userPosition, windowType, isMounted, showRugPullAlerts]);

  // Handle News & Whale Alerts specifically
  useEffect(() => {
    let syntheticNews = [];
    if (showWhaleAlerts) {
        if (orderBook.imbalance > 1.8) syntheticNews.push({ title: `🐋 WHALE ALERT: Massive Limit BID wall placed near $${targetMargin.toFixed(0)}`, type: 'whale' });
        if (orderBook.imbalance < 0.5) syntheticNews.push({ title: `🐋 WHALE ALERT: Heavy Limit SELL pressure defending $${targetMargin.toFixed(0)}`, type: 'whale' });
        if (takerFlow.imbalance > 2.0) syntheticNews.push({ title: `🚀 WHALE ALERT: Aggressive Market BUYING detected on the tape.`, type: 'whale' });
        if (takerFlow.imbalance < 0.5) syntheticNews.push({ title: `🩸 WHALE ALERT: Aggressive Market SELLING detected on the tape.`, type: 'whale' });
    }
    if (showRugPullAlerts && analysis?.isRugPull) {
        syntheticNews.push({ title: `🚨 RUG PULL WARNING: Immediate liquidity collapse detected!`, type: 'rugpull' });
    }
    if (syntheticNews.length < 3) syntheticNews.push({ title: `Engine: Analyzing Order Book vs Tape Divergence (${String(windowType).toUpperCase()})...`, type: 'info' });
    setNewsEvents(syntheticNews);
  }, [orderBook.imbalance, takerFlow.imbalance, targetMargin, windowType, showWhaleAlerts, showRugPullAlerts, analysis?.isRugPull]);


  useEffect(() => {
    if (analysis?.hasAction && analysis.tradeAction !== prevActionRef.current) {
      if (analysis.tradeAction.includes("ENTRY SIGNAL") || analysis.tradeAction.includes("RUG PULL")) {
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
          reply = `Currently, my posterior for YES is ${Number(analysis?.rawProbAbove || 0).toFixed(1)}%. We are in a ${String(analysis?.regime || 'CHOP')} regime. I am strictly waiting for quant rules to pass before issuing an entry.`;
        }
        else if (userText.includes("5m") || userText.includes("5 minute") || userText.includes("15m")) {
          reply = `In V47, both windows trigger early ENTRY SIGNALS based on pure momentum. You are currently in ${windowType.toUpperCase()} mode.`;
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

  // PREVENT SSR HYDRATION MISMATCH WHITE SCREEN
  if (!isMounted) {
    return <div className="min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse">Initializing Tara Terminal...</div>;
  }

  return (
    <div className="min-h-screen bg-[#111312] text-[#E8E9E4] font-sans p-2 sm:p-4 flex flex-col items-center selection:bg-[#E8E9E4]/20 overflow-x-hidden">
      
      {/* Top Header */}
      <div className="w-full max-w-7xl flex flex-wrap sm:flex-nowrap justify-between items-center border-b border-[#E8E9E4]/10 pb-3 mb-4 gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <h1 className="text-xl md:text-2xl font-serif tracking-tight text-white flex items-center gap-2">
            Tara
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V47 Terminal
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

      <div className="w-full max-w-7xl flex flex-col gap-4">
        
        {/* STATS BAR */}
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
                 <input type="number" value={targetMargin === 0 ? '' : targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="bg-transparent border-none text-white font-serif text-lg md:text-xl w-[75px] md:w-24 focus:outline-none py-1 leading-normal" />
               </div>
             </div>
             <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[90px]">
               <div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1.5">Bet / Win</div>
               <div className="flex items-center gap-1 text-white font-serif text-base md:text-lg">
                 $<input type="number" value={betAmount === 0 ? '' : betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-8 md:w-12 text-center outline-none py-1 leading-normal" />
                 <span className="text-[#E8E9E4]/40 mx-0.5">/</span>
                 $<input type="number" value={maxPayout === 0 ? '' : maxPayout} onChange={(e) => setMaxPayout(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-10 md:w-14 text-center outline-none py-1 leading-normal" />
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

        {/* FULL WIDTH LIVE CHART (V47 UPDATE) */}
        <div className="w-full bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col h-[400px] sm:h-[480px]">
          <div className="flex justify-between items-center mb-3 border-b border-[#E8E9E4]/10 pb-2">
            <h2 className="text-[11px] font-bold text-[#E8E9E4]/80 uppercase tracking-[0.2em] flex items-center gap-2">
              LIVE PRICE CHART
            </h2>
            <div className="flex items-center gap-4 text-[10px] text-[#E8E9E4]/60 bg-[#111312] px-3 py-1.5 rounded-lg border border-[#E8E9E4]/5">
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-purple-400 transition-colors">
                <input type="checkbox" checked={showWhaleAlerts} onChange={(e) => setShowWhaleAlerts(e.target.checked)} className="accent-purple-500 w-3.5 h-3.5" /> Whale Alerts
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-purple-400 transition-colors">
                <input type="checkbox" checked={showRugPullAlerts} onChange={(e) => setShowRugPullAlerts(e.target.checked)} className="accent-purple-500 w-3.5 h-3.5" /> Rug Pull Alert
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer hover:text-purple-400 transition-colors">
                <input type="checkbox" checked={showCandles} onChange={(e) => setShowCandles(e.target.checked)} className="accent-purple-500 w-3.5 h-3.5" /> Candlesticks
              </label>
              <span className="ml-2 pl-3 border-l border-[#E8E9E4]/10 opacity-50">{liveHistory.length} pts</span>
            </div>
          </div>
          <div className="flex-1 w-full h-full relative rounded-md overflow-hidden bg-[#111312]" style={{ backgroundImage: 'linear-gradient(rgba(232, 233, 228, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(232, 233, 228, 0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            {liveHistory.length > 0 ? (
              <LiveChart 
                 data={liveHistory} 
                 currentPrice={currentPrice} 
                 targetMargin={targetMargin}
                 showCandles={showCandles} 
                 rugPullActive={showRugPullAlerts && analysis?.isRugPull}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#E8E9E4]/30 uppercase tracking-widest animate-pulse">
                Aggregating Ticks...
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* MAIN OUTCOME DISPLAY */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            {prevCyclesMap[windowType] && prevCyclesMap[windowType].length > 0 && (
              <div className="flex items-center justify-start gap-3 w-full pl-2 mb-2">
                <span className="text-[9px] font-bold tracking-[0.2em] text-[#E8E9E4]/30 uppercase">Prev Cycles</span>
                <div className="flex items-center gap-2">
                  {[...(prevCyclesMap[windowType] || [])].map((cycle, i) => (
                    <div key={i} className={`flex flex-col items-center justify-center px-2 py-1 rounded-md border bg-[#111312] shadow-sm ${cycle.outcome === 'UP' ? 'border-emerald-500/20 text-emerald-400' : 'border-rose-500/20 text-rose-400'}`}>
                      <div className="flex items-center gap-1 text-[10px] font-bold">
                        <span className="text-[12px] leading-none">{cycle.outcome === 'UP' ? '▲' : '▼'}</span>
                        <span>{cycle.gapPct}</span>
                      </div>
                      <span className="text-[8px] text-[#E8E9E4]/40 font-mono mt-0.5">{String(cycle.time)}</span>
                    </div>
                  ))}
                  <span className="text-[9px] font-mono text-[#E8E9E4]/30 ml-1">→ NOW</span>
                </div>
              </div>
            )}
            
            <div className="bg-[#181A19] p-4 md:p-6 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col justify-center items-center text-center relative overflow-hidden min-h-[380px] md:min-h-[420px]">
               
               <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-[#111312] border border-[#E8E9E4]/10 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-sm whitespace-nowrap">
                 <IconClock className="w-3 h-3" />
                 <span className="text-[#E8E9E4]/60 hidden sm:inline">{String(timeState.startWindowEST)}-{String(timeState.nextWindowEST)}</span>
                 <span className="text-[#E8E9E4]">{Number(timeState.minsRemaining)}m {Number(timeState.secsRemaining)}s</span>
               </div>

               {analysis && analysis.tradeAction !== "SIT OUT" && analysis.prediction !== "ANALYZING" && (
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
                   
                   <div className="flex flex-col items-center mb-6">
                     <span className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-[0.2em] mb-2 font-bold">Prediction</span>
                     <h2 className={`text-7xl sm:text-8xl font-serif font-bold leading-none tracking-tight ${analysis.textColor} drop-shadow-sm transition-all flex items-center justify-center uppercase`}>
                       {String(analysis.prediction)}
                     </h2>
                   </div>

                   <p className="text-[11px] sm:text-xs text-[#E8E9E4]/50 font-sans max-w-sm mx-auto mb-6 px-2 h-8 leading-tight">
                     {String(analysis.predictionReason)}
                   </p>

                   {userPosition !== null && (
                     <div className={`flex items-center gap-3 sm:gap-4 mb-6 px-3 sm:px-4 py-2 rounded-lg border w-full max-w-[300px] justify-center ${analysis.livePnL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
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

                   <div className={`mb-4 w-full max-w-[400px] p-3 sm:p-5 rounded-xl border-[1.5px] ${analysis.actionBg} transition-colors flex flex-col items-center text-center shadow-sm`}>
                     <div className="flex items-center gap-1.5 mb-1.5">
                       <IconBell className={`w-3.5 h-3.5 ${analysis.actionColor}`} />
                       <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-80 text-[#E8E9E4]">Advisor</span>
                     </div>
                     <div className={`text-lg sm:text-xl font-serif font-bold mb-1.5 ${analysis.actionColor} uppercase`}>{String(analysis.tradeAction)}</div>
                     <p className="text-[10px] sm:text-[11px] opacity-80 text-[#E8E9E4] mb-3 sm:mb-4 leading-tight">{String(analysis.tradeReason)}</p>

                     {analysis.hasAction && (
                       <div className="w-full pt-3 sm:pt-4 border-t border-[#E8E9E4]/10">
                          {manualAction === analysis.tradeAction ? (
                             <div className="w-full bg-emerald-500/20 text-emerald-400 py-2.5 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                               <IconCheck className="w-3.5 h-3.5" /> Action Logged
                             </div>
                          ) : (
                             <button 
                               onClick={() => executeManualAction(analysis.tradeAction, analysis.actionTarget)}
                               className={`w-full py-2.5 sm:py-3 rounded-lg text-[10px] sm:text-[11px] font-bold uppercase tracking-widest border transition-all hover:brightness-125 ${
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
                     <div className="flex flex-col items-center gap-1.5 sm:gap-2 mt-2 mb-2 sm:mb-4 w-full max-w-[400px]">
                       <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-[#E8E9E4]/40">Already in a trade? Sync Tara:</span>
                       <div className="flex gap-2 sm:gap-3 w-full">
                         <button onClick={() => handleManualSync("YES")} className="flex-1 py-2 border border-emerald-500/30 text-emerald-400 rounded-md text-[9px] sm:text-[10px] uppercase font-bold tracking-widest hover:bg-emerald-500/10 transition-colors">I Entered YES</button>
                         <button onClick={() => handleManualSync("NO")} className="flex-1 py-2 border border-rose-500/30 text-rose-400 rounded-md text-[9px] sm:text-[10px] uppercase font-bold tracking-widest hover:bg-rose-500/10 transition-colors">I Entered NO</button>
                       </div>
                     </div>
                   )}

                 </div>
               )}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-4">
            
            <div className="flex gap-4">
              <div className="flex-1 bg-[#181A19] p-4 sm:p-5 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md">
                 <div className="text-[9px] sm:text-[10px] text-[#E8E9E4]/50 font-bold uppercase mb-1.5">POSTERIOR (UP)</div>
                 <div className="text-3xl sm:text-4xl font-serif text-indigo-300">{analysis ? `${Number(analysis.rawProbAbove || 0).toFixed(1)}%` : '--%'}</div>
              </div>
              <div className="flex-1 bg-[#181A19] p-4 sm:p-5 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md">
                 <div className="text-[9px] sm:text-[10px] text-[#E8E9E4]/50 font-bold uppercase mb-1.5">POSTERIOR (DN)</div>
                 <div className="text-3xl sm:text-4xl font-serif text-rose-300">{analysis ? `${(100 - Number(analysis.rawProbAbove || 0)).toFixed(1)}%` : '--%'}</div>
              </div>
            </div>

            {analysis && (
              <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col">
                <h2 className="text-[10px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <IconTerminal className="w-3.5 h-3.5 text-amber-400" /> Math Engine Logs
                </h2>
                <div className="space-y-2 font-mono h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                  {(analysis.reasoning || []).map((reason, idx) => (
                    <div key={idx} className={`bg-[#111312] p-2.5 rounded-md text-[9px] sm:text-[10px] ${reason.includes('RUG PULL') ? 'text-rose-400 border border-rose-500/20' : 'text-[#E8E9E4]/70 border border-[#E8E9E4]/5'} flex items-start gap-2 uppercase`}>
                      <span className="text-emerald-500 mt-0.5">{`>`}</span>
                      <span className="leading-snug">{String(reason)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-[180px]">
              <div className="flex justify-between items-center mb-3 border-b border-[#E8E9E4]/10 pb-2">
                <h2 className="text-[10px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest flex items-center gap-1.5">
                  <IconGlobe className="w-3.5 h-3.5 text-blue-400" /> Tara Live Wire
                </h2>
              </div>
              <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1 flex-1">
                {newsEvents.length === 0 ? (
                   <div className="text-[11px] text-[#E8E9E4]/40 italic">Generating market intel...</div>
                ) : (
                  newsEvents.map((news, i) => (
                    <div key={i} className={`border-l-[2px] pl-2 py-0.5 ${news.type === 'rugpull' ? 'border-rose-500' : news.type === 'whale' ? 'border-purple-500' : 'border-indigo-500/40'}`}>
                      <span className={`text-[11px] sm:text-[11.5px] leading-tight ${news.type === 'rugpull' ? 'text-rose-400 font-bold' : news.type === 'whale' ? 'text-purple-300' : 'text-[#E8E9E4]/90'}`}>
                        {String(news.title)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {analysis && (
              <div className="bg-[#181A19] p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md">
                <h2 className="text-[10px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest mb-3 flex items-center gap-1.5">
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
              {(chatLog || []).map((msg, i) => (
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
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">1. Multi-Timeframe & Zero-Latency Divergence</h3>
                <p className="mb-3 leading-relaxed">You can toggle Tara between 5-Minute and 15-Minute mode. <br/><strong>In 15M Mode:</strong> She analyzes macro-trends, VWAP, and looks for safer, wider structural trades.<br/><strong>In 5M Mode:</strong> She becomes an aggressive scalper. She ignores slow indicators and multiplies the weight of live order flow (Tape Delta) by 1.25x.</p>
                <p className="mb-3 leading-relaxed border-l-2 border-emerald-500 pl-3 bg-emerald-500/5 p-2 rounded-r"><strong>Zero-Latency Algorithm (V47 Update):</strong> Tara completely ignores initial artificial time locks. From the very first second of the round, she evaluates structural setups to provide instant early entry signals, enabling you to grab extreme odds before the platform adjusts.</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li><strong>Setup:</strong> Select your timeframe. Type in the platform's Strike Price, your Bet Size, and Max Payout.</li>
                  <li><strong>Wait:</strong> Tara begins every trade at "SIT OUT". She requires a minimum of <span className="text-emerald-300 font-mono">65% internal conviction</span> to advise an entry.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">2. Early Exit</h3>
                <p className="leading-relaxed">If you are in a winning position, but Tara detects that whales are suddenly selling the momentum back down (AggrFlow flipping), she will trigger an <strong>EARLY EXIT</strong> alert. <br/><br/>If you type the platform's current "Live Market Offer" into the box, Tara will instantly calculate your true Edge. If they offer you $70 for a contract mathematically worth $50, she will advise you to take the Arbitrage.</p>
              </section>

              <section>
                <h3 className="text-indigo-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">3. Understanding the Data Dashboard</h3>
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
