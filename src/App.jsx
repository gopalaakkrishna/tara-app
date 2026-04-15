import React, { useState, useEffect, useMemo, useRef } from 'react';

// --- 100% DEPENDENCY-FREE INLINE ICONS ---
const IconClock = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconCrosshair = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>;
const IconZap = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconTerminal = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>;
const IconAlertTriangle = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconActivity = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconBell = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconCheck = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconTrendingUp = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconGlobe = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const IconMessage = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const IconX = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconInfo = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconVolume2 = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
const IconVolumeX = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
const IconHelp = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconLink = ({className}) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className || "w-4 h-4"}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;

// --- NATIVE INTERACTIVE CANDLESTICK / LINE CHART WITH VOLUME ---
const LiveChart = ({ data, currentPrice, targetMargin, showCandles, rugPullActive }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoverPos, setHoverPos] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 }); 
  
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const maxPanRef = useRef(0);
  const spacingRef = useRef(10); 

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleNativeWheel = (e) => {
      e.preventDefault(); 
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
         setPan(prev => Math.max(0, Math.min(maxPanRef.current, prev - e.deltaX / spacingRef.current)));
      } else {
         setZoom(prev => Math.max(1, Math.min(20, prev - e.deltaY * 0.005)));
      }
    };
    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleNativeWheel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !data || data.length === 0 || dimensions.width === 0) return;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);
    
    const width = dimensions.width;
    const height = dimensions.height;
    const rightMargin = 65; 
    const bottomMargin = 28; 
    const chartW = width - rightMargin;
    const chartH = height - bottomMargin;
    const volH = chartH * 0.2; 
    const priceH = chartH - volH; 

    ctx.clearRect(0, 0, width, height);

    const validData = [...data].reverse().filter(d => d.h !== undefined && d.l !== undefined);
    const visibleCount = Math.max(15, Math.floor(validData.length / zoom));
    
    const maxPan = Math.max(0, validData.length - visibleCount);
    maxPanRef.current = maxPan;
    
    const currentPan = Math.max(0, Math.min(pan, maxPan));
    
    const startIndex = Math.max(0, validData.length - visibleCount - Math.floor(currentPan));
    const endIndex = Math.max(0, validData.length - Math.floor(currentPan));
    const viewData = validData.slice(startIndex, endIndex);

    if(viewData.length === 0) return;

    let minPrice = Math.min(...viewData.map(d => d.l));
    let maxPrice = Math.max(...viewData.map(d => d.h));
    let maxVol = Math.max(...viewData.map(d => d.v || 0.1));
    
    if (targetMargin > 0) {
        minPrice = Math.min(minPrice, targetMargin - 50);
        maxPrice = Math.max(maxPrice, targetMargin + 50);
    }

    const padding = (maxPrice - minPrice) * 0.1 || 10;
    const scaleY = priceH / (maxPrice - minPrice + padding * 2);
    const yOffset = maxPrice + padding;
    const volScale = volH / (maxVol * 1.1);

    ctx.strokeStyle = 'rgba(232, 233, 228, 0.05)';
    ctx.fillStyle = 'rgba(232, 233, 228, 0.4)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 1;
    
    for(let i=0; i<=5; i++) {
        const y = (priceH / 5) * i;
        const price = maxPrice + padding - (y / scaleY);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
        if (i < 5) ctx.fillText(price.toFixed(2), chartW + 5, y);
    }

    const spacing = chartW / viewData.length;
    spacingRef.current = spacing;
    const candleWidth = Math.max(1, spacing * 0.6);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for(let i=1; i<5; i++) {
        const x = (chartW / 5) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, chartH); ctx.stroke();

        const dataIndex = Math.floor(x / spacing);
        if (viewData[dataIndex] && viewData[dataIndex].time) {
            const t = viewData[dataIndex].time;
            const d = new Date(t > 1e11 ? t : t * 1000);
            ctx.fillText(d.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}), x, chartH + 10);
        }
    }

    if (targetMargin > 0) {
        const targetY = (yOffset - targetMargin) * scaleY;
        if (targetY > 0 && targetY < priceH) {
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'; 
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.moveTo(0, targetY); ctx.lineTo(chartW, targetY); ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
            ctx.fillRect(chartW, targetY - 10, rightMargin, 20);
            ctx.fillStyle = '#818cf8';
            ctx.textAlign = 'left';
            ctx.font = 'bold 10px sans-serif';
            ctx.fillText(targetMargin.toFixed(2), chartW + 5, targetY);
        }
    }

    viewData.forEach((candle, i) => {
        const x = i * spacing + spacing / 2;
        const isBullish = candle.c >= candle.o;
        ctx.fillStyle = isBullish ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 113, 133, 0.2)';
        const barH = (candle.v || 0) * volScale;
        ctx.fillRect(x - candleWidth / 2, chartH - barH, candleWidth, barH);
    });

    if (showCandles) {
      viewData.forEach((candle, i) => {
        const x = i * spacing + spacing / 2;
        const isBullish = candle.c >= candle.o;
        const color = isBullish ? '#34d399' : '#fb7185'; 
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(x, (yOffset - candle.h) * scaleY); ctx.lineTo(x, (yOffset - candle.l) * scaleY); ctx.stroke();
        ctx.fillStyle = color;
        const bodyY = (yOffset - Math.max(candle.o, candle.c)) * scaleY;
        const bodyHeight = Math.max(2, Math.abs(candle.c - candle.o) * scaleY);
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight);
      });
    } else {
      ctx.beginPath();
      viewData.forEach((candle, i) => {
         const x = i * spacing + spacing / 2;
         const y = (yOffset - candle.c) * scaleY;
         if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2; ctx.stroke();
      ctx.lineTo(chartW, priceH); ctx.lineTo(0, priceH); ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, priceH);
      grad.addColorStop(0, 'rgba(192, 132, 252, 0.2)'); grad.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.fillStyle = grad; ctx.fill();
    }

    if (currentPrice) {
      const currentY = (yOffset - currentPrice) * scaleY;
      if (currentY > 0 && currentY < priceH) {
        ctx.strokeStyle = rugPullActive ? '#fb7185' : '#34d399';
        ctx.lineWidth = rugPullActive ? 2 : 1;
        ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(0, currentY); ctx.lineTo(chartW, currentY); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = rugPullActive ? '#fb7185' : '#34d399';
        ctx.fillRect(chartW, currentY - 10, rightMargin, 20);
        ctx.fillStyle = '#111312'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = 'bold 11px sans-serif';
        ctx.fillText(currentPrice.toFixed(2), chartW + 5, currentY);
      }
    }

    if (rugPullActive) {
        ctx.fillStyle = 'rgba(251, 113, 133, 0.1)'; ctx.fillRect(0, 0, width, height);
        ctx.fillStyle = '#fb7185'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText("🚨 RUG PULL DETECTED", width / 2, height / 2);
    }

    if (hoverPos && hoverPos.x < chartW && hoverPos.y < chartH) {
      ctx.strokeStyle = 'rgba(232, 233, 228, 0.2)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(hoverPos.x, 0); ctx.lineTo(hoverPos.x, chartH); ctx.stroke();
      if (hoverPos.y < priceH) { ctx.beginPath(); ctx.moveTo(0, hoverPos.y); ctx.lineTo(chartW, hoverPos.y); ctx.stroke(); }
      ctx.setLineDash([]);

      if (!showCandles && !rugPullActive && hoverPos.y < priceH) {
         const dataIndex = Math.floor(hoverPos.x / spacing);
         if (viewData[dataIndex]) {
            const dotX = dataIndex * spacing + spacing / 2;
            const dotY = (yOffset - viewData[dataIndex].c) * scaleY;
            ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#c084fc'; ctx.fill(); ctx.shadowBlur = 10; ctx.shadowColor = '#c084fc'; ctx.stroke(); ctx.shadowBlur = 0;
         }
      }

      if (hoverPos.y < priceH) {
          const hoverPrice = yOffset - (hoverPos.y / scaleY);
          ctx.fillStyle = '#2A2D2C'; ctx.fillRect(chartW, hoverPos.y - 10, rightMargin, 20);
          ctx.fillStyle = '#E8E9E4'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '10px sans-serif';
          ctx.fillText(hoverPrice.toFixed(2), chartW + 5, hoverPos.y);
      }

      const dataIndex = Math.floor(hoverPos.x / spacing);
      if (viewData[dataIndex] && viewData[dataIndex].time) {
          const t = viewData[dataIndex].time;
          const d = new Date(t > 1e11 ? t : t * 1000);
          const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
          const timeStr = d.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'});
          ctx.fillStyle = '#2A2D2C'; ctx.fillRect(hoverPos.x - 50, chartH, 100, bottomMargin);
          ctx.fillStyle = '#E8E9E4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${dateStr} ${timeStr}`, hoverPos.x, chartH + (bottomMargin/2));
      }
    }
  }, [data, currentPrice, zoom, pan, hoverPos, showCandles, targetMargin, rugPullActive, dimensions]);

  const handlePointerDown = (e) => { isDragging.current = true; lastMouseX.current = e.clientX; };
  const handlePointerMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (isDragging.current) {
          setPan(prev => Math.max(0, Math.min(maxPanRef.current, prev + (e.clientX - lastMouseX.current) / spacingRef.current)));
          lastMouseX.current = e.clientX;
      }
  };
  const handlePointerUp = () => { isDragging.current = false; };
  const handlePointerLeave = () => { setHoverPos(null); isDragging.current = false; };

  return (
      <div ref={containerRef} className="w-full h-full relative cursor-crosshair" style={{ touchAction: 'none' }}>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerLeave={handlePointerLeave} />
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
  const taraAdviceRef = useRef("SIT OUT");
  
  // SSR Hydration & Baseline Setup
  const [scorecards, setScorecards] = useState({ '15m': { wins: 87, losses: 66 }, '5m': { wins: 10, losses: 7 } });
  
  useEffect(() => {
    setIsMounted(true);
    try {
      const savedScore = localStorage.getItem('btcOracleScorecardV58');
      if (savedScore) setScorecards(JSON.parse(savedScore));
    } catch (e) {}
  }, []);

  const [manualAction, setManualAction] = useState(null);
  const [forceRender, setForceRender] = useState(0); 
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLog, setChatLog] = useState([{ role: 'tara', text: "Tara V58 Engine online. Active trade management enabled. Sticky signals prevent glitching. Analysis buffer active." }]);
  const [chatInput, setChatInput] = useState("");
  
  const lastWindowRef = useRef("");
  const [userPosition, setUserPosition] = useState(null); 
  const [showHelp, setShowHelp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevActionRef = useRef(null);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try { localStorage.setItem('btcOracleScorecardV58', JSON.stringify(scorecards)); } 
      catch (e) {}
    }
  }, [scorecards, isMounted]);

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
    taraAdviceRef.current = "SIT OUT";
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
        taraAdviceRef.current = "SIT OUT";
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
          if (prev !== null && newPrice !== prev) setTickDirection(newPrice > prev ? 'up' : 'down');
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
        if (t.t === 'B') { takerBuys += usdValue; if (t.s > 1.5) whaleSpotted = 'BUY'; } 
        else { takerSells += usdValue; if (t.s > 1.5) whaleSpotted = 'SELL'; }
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
             currentPriceRef.current = p; lastPriceSourceRef.current = { source: 'rest', time: now };
             if (now - lastUiUpdate > 300) {
               setCurrentPrice(prev => { if (prev !== null && p !== prev) setTickDirection(p > prev ? 'up' : 'down'); return p; });
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

  // API Data Polling
  useEffect(() => {
    const fetchHeavyData = async () => {
      try {
        let formattedHistory = [];
        const gran = windowType === '15m' ? 900 : 300;
        try {
          const resCB = await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${gran}`);
          if (resCB.ok) {
            const dataCB = await resCB.json();
            if (Array.isArray(dataCB)) {
              formattedHistory = dataCB.slice(0, 60).map(c => ({ 
                time: c[0], l: parseFloat(c[1]), h: parseFloat(c[2]), o: parseFloat(c[3]), c: parseFloat(c[4]), v: parseFloat(c[5]) 
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
  }, [targetMargin, windowType]); 

  // Auto-Snap Target Margin on Boot
  useEffect(() => {
    if (targetMargin === 0 && currentPrice) {
      setTargetMargin(currentPrice);
    }
  }, [currentPrice, targetMargin]);

  // News Wire Generator
  useEffect(() => {
    let syntheticNews = [];
    if (orderBook.imbalance > 1.5) syntheticNews.push({ title: `Maker Alert: Limit BID wall placed near $${targetMargin.toFixed(0)}`, type: 'info' });
    if (orderBook.imbalance < 0.6) syntheticNews.push({ title: `Maker Alert: Limit SELL pressure defending $${targetMargin.toFixed(0)}`, type: 'info' });
    
    if (showWhaleAlerts) {
        if (takerFlow.imbalance > 2.0) syntheticNews.push({ title: `🐋 WHALE: Aggressive Market BUYING detected on the tape.`, type: 'whale' });
        if (takerFlow.imbalance < 0.5) syntheticNews.push({ title: `🐋 WHALE: Aggressive Market SELLING detected on the tape.`, type: 'whale' });
    }
    
    if (syntheticNews.length < 3) syntheticNews.push({ title: `Engine: Analyzing Order Book vs Tape Divergence (${String(windowType).toUpperCase()})...`, type: 'info' });
    setNewsEvents(syntheticNews);
  }, [orderBook.imbalance, takerFlow.imbalance, targetMargin, windowType, showWhaleAlerts]);

  // BULLETPROOF TIME ENGINE 
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

  // --- TARA V58: HYSTERESIS & ACTIVE MANAGEMENT ENGINE ---
  const analysis = useMemo(() => {
    if (!currentPrice || liveHistory.length < 30 || !targetMargin || !isMounted) return null;

    const is15m = windowType === '15m';
    const intervalSeconds = is15m ? 900 : 300;
    const clockSeconds = (timeState.minsRemaining * 60) + timeState.secsRemaining;
    const timeFraction = Math.max(0, Math.min(1, 1 - (clockSeconds / intervalSeconds)));
    
    const isEndgameLock = clockSeconds < 120; 
    const isCalibrating = (intervalSeconds - clockSeconds) < 25; 

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
    
    let isRugPull = false;
    if (tickSlope < -5.0 && aggrFlow < -0.6) isRugPull = true;

    const timeDecay = Math.pow(timeFraction, 2); 
    const gapWeight = realGapBps * (is15m ? 1.0 : 1.5) * (0.2 + 0.8 * timeDecay);
    baseProb += gapWeight;

    if (rsi > 65 && realGapBps > 0) {
       baseProb -= 20; regime = "OVERBOUGHT (FADE)";
       reasoning.push(`REGIME: RSI is ${rsi.toFixed(1)}. Pumping but overextended. Fading the top.`);
    } else if (rsi < 35 && realGapBps < 0) {
       baseProb += 20; regime = "OVERSOLD (FADE)";
       reasoning.push(`REGIME: RSI is ${rsi.toFixed(1)}. Dumping but overextended. Fading the bottom.`);
    } else if (Math.abs(vwapGapBps) > 2 && tickSlope > 0.5) {
       regime = "STRONG UPTREND"; baseProb += (aggrFlow * 25) + 10;
       reasoning.push(`REGIME: Strong Uptrend identified. Trusting AggrFlow.`);
    } else if (Math.abs(vwapGapBps) > 2 && tickSlope < -0.5) {
       regime = "STRONG DOWNTREND"; baseProb += (aggrFlow * 25) - 10;
       reasoning.push(`REGIME: Strong Downtrend identified. Trusting AggrFlow.`);
    } else {
       regime = "RANGE/CHOP"; baseProb += (aggrFlow * 20) + (mktImplied * 10);
       reasoning.push(`REGIME: Market ranging. Orderbook & Tape dictates path.`);
    }

    if (liqBuys > 10000) { baseProb += 15; reasoning.push(`LIQ: Shorts squeezed. Upward force applied.`); }
    if (liqSells > 10000) { baseProb -= 15; reasoning.push(`LIQ: Longs squeezed. Downward force applied.`); }

    if (isEndgameLock && userPosition === null) {
        reasoning.push(`ENDGAME: Physics overrule momentum. Physical gap locked in.`);
        baseProb = 50 + (realGapBps * 4); 
    }

    let posterior = Math.max(1, Math.min(99, baseProb)); 
    let convictionScore = Math.abs(posterior - 50) * 2; 

    // THE GLITCH FIX: HYSTERESIS ENTRY LOGIC
    if (taraAdviceRef.current === "SIT OUT") {
        if (posterior >= 68) taraAdviceRef.current = "YES";
        else if (posterior <= 32) taraAdviceRef.current = "NO";
    } else if (taraAdviceRef.current === "YES") {
        if (posterior < 48) taraAdviceRef.current = "SIT OUT"; 
    } else if (taraAdviceRef.current === "NO") {
        if (posterior > 52) taraAdviceRef.current = "SIT OUT";
    }

    let activePrediction = userPosition !== null ? userPosition : taraAdviceRef.current;

    // Overrides for Entry Mode Only
    if (userPosition === null) {
        if (isCalibrating || isEndgameLock) {
            activePrediction = "SIT OUT";
        }
    }

    let tradeAction = "WAITING / SIT OUT"; 
    let tradeReason = "Awaiting structural confirmation to signal.";
    let actionColor = "text-zinc-400"; let actionBg = "bg-zinc-500/10 border-zinc-500/30";
    let hasAction = false, actionButtonLabel = "", actionTarget = "";

    const isYES = activePrediction === "YES";
    const currentOdds = activePrediction === "SIT OUT" ? 50 : (isYES ? posterior : (100 - posterior));
    const riskPct = 100 - currentOdds;
    const metricsStr = `[Chance: ${currentOdds.toFixed(0)}% | Risk: ${riskPct.toFixed(0)}%]`;

    const dynamicStopLoss = atrBps * (0.60 + ((1-timeFraction) * 0.40)); 
    let liveEstValue = isYES ? maxPayout * (posterior / 100) : (activePrediction === "NO" ? maxPayout * ((100 - posterior) / 100) : 0);
    
    const offerVal = parseFloat(currentOffer) || 0;
    const livePnL = offerVal > 0 ? (offerVal - betAmount) : (liveEstValue - betAmount);

    if (userPosition === null) {
        if (isRugPull && showRugPullAlerts) {
            tradeAction = "🚨 RUG PULL DETECTED 🚨"; 
            tradeReason = `Massive liquidity collapse. Abort longs immediately.`;
            actionColor = "text-rose-500"; actionBg = "bg-rose-500/20 border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.4)]";
            reasoning.push(`🚨 RUG PULL: AggrFlow & TickSlope indicate severe localized crash.`);
        }
        else if (isCalibrating) {
            tradeAction = "CALIBRATING TAPE"; tradeReason = "Analyzing initial tick flow. Please wait...";
        }
        else if (isEndgameLock) {
            tradeAction = "WINDOW CLOSED"; tradeReason = "Late in round. Entering now is unsafe.";
            actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
        }
        else if (activePrediction !== "SIT OUT") {
            tradeAction = `ENTRY SIGNAL: ${activePrediction}`;
            tradeReason = `Quant composite supports entry. Execute now. ${metricsStr}`;
            actionColor = isYES ? "text-emerald-400" : "text-rose-400";
            actionBg = isYES ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(251,113,133,0.2)]";
            hasAction = true; actionButtonLabel = `CONFIRM ENTRY: '${activePrediction}'`; actionTarget = activePrediction;
        } else {
            tradeAction = "AWAITING CONVICTION"; tradeReason = "Odds below 68%. Waiting for cleaner setup.";
        }
    } 
    else {
        const isBleeding = currentOdds < 45;
        const isHardReversal = currentOdds < 30;

        if (isRugPull && showRugPullAlerts && isYES) {
            tradeAction = "🚨 RUG PULL DETECTED 🚨"; 
            tradeReason = `Massive liquidity collapse. Abort longs immediately. ${metricsStr}`;
            actionColor = "text-rose-500"; actionBg = "bg-rose-500/20 border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.4)]";
            hasAction = true; actionButtonLabel = "EMERGENCY CASHOUT"; actionTarget = "SIT OUT";
        }
        else if (offerVal > 0 && livePnL > (betAmount * 0.15) && currentOdds < 65) {
            tradeAction = "SECURE PROFIT"; 
            tradeReason = `Momentum fading while in profit. Lock in gains now. ${metricsStr}`;
            actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30 animate-pulse";
            hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "CASH";
        }
        else if (offerVal > 0 && livePnL > 0 && currentOdds < 55) {
            tradeAction = "PROTECT POSITION"; 
            tradeReason = `Edge is collapsing. Protect your breakeven. ${metricsStr}`;
            actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30";
            hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "CASH";
        }
        else if (isHardReversal && !hasReversedRef.current) {
            tradeAction = "REVERSE POSITION"; tradeReason = `Trend collapsed. Switch position. ${metricsStr}`;
            actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
            hasAction = true; actionButtonLabel = `REVERSE TO '${isYES ? 'NO' : 'YES'}'`; actionTarget = isYES ? "NO" : "YES";
        }
        else if (isBleeding) {
            tradeAction = "CUT LOSSES"; tradeReason = `Position bleeding. Edge lost. Consider exit. ${metricsStr}`;
            actionColor = "text-rose-500"; actionBg = "bg-rose-500/10 border-rose-500/30";
            hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "SIT OUT";
        }
        else if (currentOdds >= 85) {
            tradeAction = "MAX PROFIT REACHED"; tradeReason = `Odds > 85%. Stand by to lock in gains. ${metricsStr}`;
            actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
            hasAction = offerVal > 0; actionButtonLabel = "EXECUTE CASHOUT (PROFIT)"; actionTarget = "CASH";
        }
        else {
            tradeAction = "HOLD FIRM"; tradeReason = `Holding position. Quant supports trend. ${metricsStr}`;
            actionColor = "text-emerald-400"; actionBg = "bg-emerald-500/10 border-emerald-500/20";
        }
    }

    let textColor = activePrediction === "YES" ? "text-emerald-400" : activePrediction === "NO" ? "text-rose-400" : "text-zinc-500";
    if (activePrediction === "SIT OUT" && isCalibrating) {
        activePrediction = "ANALYZING";
        textColor = "text-amber-400 animate-pulse";
    }

    let entryWindowStatus = isEndgameLock ? "Window Closed" : "Active Signal Window";
    let topDriver = "";
    if (Math.abs(aggrFlow) > 0.5) topDriver = `AggrFlow (${aggrFlow > 0 ? '+' : ''}${aggrFlow.toFixed(2)})`;
    else topDriver = `CrossProb (${posterior > 50 ? '+' : ''}${(posterior/100).toFixed(2)})`;

    let convictionText = "Neutral";
    if (convictionScore > 60) convictionText = "Very Sure";
    else if (convictionScore > 35) convictionText = "Pretty Sure";
    else convictionText = "Unsure";

    let predictionReason = "";
    if (activePrediction === "SIT OUT" || activePrediction === "ANALYZING") predictionReason = "Waiting for structural divergence.";
    else if (realGapBps > 0 && activePrediction === "YES") predictionReason = "Firmly in profit. Holding steady.";
    else if (realGapBps < 0 && activePrediction === "NO") predictionReason = "Firmly in profit. Holding steady.";
    else predictionReason = "Position negative, holding firm through noise.";

    let simulatedPrice = currentPrice;
    let projections = [];
    const driftModifier = (orderBook.imbalance > 1 ? 1.2 : 0.8) * 0.6; 
    
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
    if (targetState === "CASH" || targetState === "SIT OUT") setUserPosition(null); 

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
          reply = `In V58, both windows trigger early ENTRY SIGNALS based on pure momentum. You are currently in ${windowType.toUpperCase()} mode.`;
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

  if (!isMounted) {
    return <div className="min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse">Initializing Tara Terminal...</div>;
  }

  return (
    <div className="min-h-screen lg:h-screen bg-[#111312] text-[#E8E9E4] font-sans p-2 sm:p-3 flex flex-col selection:bg-[#E8E9E4]/20 overflow-y-auto">
      
      {/* Top Header */}
      <div className="w-full max-w-[1600px] mx-auto flex flex-col h-full gap-3 min-h-0">
        
        {/* TOP HEADER: Shrink 0 */}
        <div className="flex justify-between items-center border-b border-[#E8E9E4]/10 pb-2 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h1 className="text-lg md:text-xl font-serif tracking-tight text-white flex items-center gap-2">
              Tara
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V58 Active Mgt
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
            <button onClick={() => handleWindowToggle('5m')} className={`flex-1 sm:flex-none px-6 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType === '5m' ? 'bg-indigo-500 text-white shadow-md' : 'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>
              5 Min
            </button>
            <button onClick={() => handleWindowToggle('15m')} className={`flex-1 sm:flex-none px-6 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType === '15m' ? 'bg-emerald-500 text-white shadow-md' : 'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>
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

        {/* STATS BAR: Shrink 0 */}
        <div className="bg-[#181A19] p-2 sm:px-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 shrink-0 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 via-indigo-500 to-purple-500 opacity-70"></div>

           <div className="flex w-full lg:w-auto justify-between lg:justify-start items-center gap-4">
             <div className="flex items-center gap-3 w-1/2 lg:w-auto pl-1 md:pl-2">
               <div className="p-2 bg-[#111312] rounded-lg border border-[#E8E9E4]/5 shadow-inner">
                 <IconZap className={`w-5 h-5 transition-colors duration-200 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-[#E8E9E4]/40'}`} />
               </div>
               <div>
                 <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-0.5">Live Spot</div>
                 <div className={`text-lg sm:text-2xl font-serif tracking-tight flex items-center gap-1 ${tickDirection === 'up' ? 'text-emerald-400' : tickDirection === 'down' ? 'text-rose-400' : 'text-white'}`}>
                   ${currentPrice ? currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '---'}
                 </div>
               </div>
             </div>
             {/* Mobile Scorecard */}
             <div className="flex lg:hidden flex-col items-center bg-[#111312] p-1.5 rounded-xl border border-[#E8E9E4]/5 shadow-inner w-1/2">
               <div className="flex items-center justify-between w-full px-2">
                 <div className="flex flex-col items-center">
                   <div className="text-[9px] text-emerald-400 mb-0.5">WINS</div>
                   <span className="text-lg font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins || 0)}</span>
                 </div>
                 <div className="h-6 w-px bg-[#E8E9E4]/10"></div>
                 <div className="flex flex-col items-center">
                   <div className="text-[9px] text-rose-400 mb-0.5">LOSS</div>
                   <span className="text-lg font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses || 0)}</span>
                 </div>
               </div>
             </div>
           </div>
           
           <div className="w-px h-8 bg-[#E8E9E4]/10 hidden lg:block mx-2"></div>

           <div className="flex items-center gap-3 md:gap-6 w-full lg:w-auto bg-[#111312] p-2 rounded-xl border border-[#E8E9E4]/5 shadow-inner justify-between overflow-x-auto flex-1">
             <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[120px]">
               <div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Strike</div>
               <div className="flex items-center w-full">
                 <IconCrosshair className="w-3 h-3 md:w-4 md:h-4 text-indigo-400 mr-1 md:mr-2 opacity-80 hidden sm:block" />
                 <input type="number" value={targetMargin === 0 ? '' : targetMargin} onChange={(e) => setTargetMargin(Number(e.target.value))} className="bg-transparent border-none text-white font-serif text-base md:text-lg w-full focus:outline-none py-1 leading-normal" />
               </div>
             </div>
             <div className="flex flex-col items-start pr-3 md:pr-6 border-r border-[#E8E9E4]/10 min-w-[120px]">
               <div className="text-[9px] md:text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1">Bet / Win</div>
               <div className="flex items-center gap-1 text-white font-serif text-base w-full">
                 $<input type="number" value={betAmount === 0 ? '' : betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-full text-center outline-none py-1 leading-normal" />
                 <span className="text-[#E8E9E4]/40 mx-0.5">/</span>
                 $<input type="number" value={maxPayout === 0 ? '' : maxPayout} onChange={(e) => setMaxPayout(Number(e.target.value))} className="bg-transparent border-b border-[#E8E9E4]/20 focus:border-indigo-400 w-full text-center outline-none py-1 leading-normal" />
               </div>
             </div>
             <div className="flex flex-col items-start pl-1 md:pl-2 min-w-[100px]">
               <div className="text-[9px] md:text-[10px] text-emerald-400/80 uppercase tracking-widest font-medium mb-1">Live Offer</div>
               <div className="flex items-center gap-1 text-emerald-400 font-serif text-base md:text-lg">
                 $<input type="number" value={currentOffer} onChange={(e) => setCurrentOffer(e.target.value)} placeholder="0.00" className="bg-transparent border-b border-emerald-500/30 focus:border-emerald-400 w-full text-center outline-none placeholder-emerald-900 py-1 leading-normal" />
               </div>
             </div>
           </div>
           
           <div className="w-px h-8 bg-[#E8E9E4]/10 hidden lg:block mx-2"></div>

           <div className="hidden lg:flex flex-col items-start w-48">
             <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest font-medium mb-1 flex justify-between w-full">
               <span className="flex items-center gap-1.5"><IconTerminal className="w-3.5 h-3.5"/> {String(windowType).toUpperCase()} SCORECARD</span>
             </div>
             <div className="flex items-center justify-between w-full px-2">
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1 text-[9px] text-emerald-400 mb-0.5">
                   <button onClick={() => updateScore(windowType, 'wins', -1)}>-</button> WINS <button onClick={() => updateScore(windowType, 'wins', 1)}>+</button>
                 </div>
                 <span className="text-2xl font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins || 0)}</span>
               </div>
               <div className="h-8 w-px bg-[#E8E9E4]/10"></div>
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1 text-[9px] text-rose-400 mb-0.5">
                   <button onClick={() => updateScore(windowType, 'losses', -1)}>-</button> LOSS <button onClick={() => updateScore(windowType, 'losses', 1)}>+</button>
                 </div>
                 <span className="text-2xl font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses || 0)}</span>
               </div>
             </div>
           </div>
        </div>

        {/* MIDDLE ROW: Prediction, Posteriors/Forecast, Logs/Wire. Shrink 0 on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0 lg:h-[320px]">
          
          {/* Left Column: Prediction Block */}
          <div className="lg:col-span-4 bg-[#181A19] p-3 md:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col relative overflow-hidden h-full">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30"></div>
             
             <div className="flex justify-between items-start mb-2">
               <div className="bg-[#111312] border border-[#E8E9E4]/10 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                 <IconClock className="w-3 h-3" />
                 <span className="text-[#E8E9E4]/60 hidden sm:inline">{String(timeState.startWindowEST)}-{String(timeState.nextWindowEST)}</span>
                 <span className="text-[#E8E9E4]">{Number(timeState.minsRemaining)}m {Number(timeState.secsRemaining)}s</span>
               </div>
               
               {analysis && analysis.tradeAction !== "SIT OUT" && analysis.prediction !== "ANALYZING" && (
                 <button 
                   onClick={() => executeManualAction("MANUAL PULL OUT", "SIT OUT")}
                   className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
                 >
                   <IconAlertTriangle className="w-3 h-3" /> <span>Force Exit</span>
                 </button>
               )}
             </div>

             {isLoading || !analysis ? (
               <div className="text-lg font-serif text-[#E8E9E4]/30 animate-pulse mt-4 text-center w-full">Connecting...</div>
             ) : (
               <div className="flex flex-col items-center w-full flex-1 justify-center">
                 <div className="flex flex-col items-center mb-4 mt-2">
                   <span className="text-[9px] text-[#E8E9E4]/40 uppercase tracking-[0.2em] mb-1 font-bold">Prediction</span>
                   <h2 className={`text-[64px] sm:text-[72px] font-serif font-bold leading-none tracking-tight ${analysis.textColor} drop-shadow-lg transition-all flex items-center justify-center uppercase`}>
                     {String(analysis.prediction)}
                   </h2>
                 </div>

                 <div className={`w-full p-2.5 rounded-xl border-[1.5px] ${analysis.actionBg} transition-colors flex flex-col items-center text-center shadow-sm mt-auto`}>
                   <div className="flex items-center gap-1.5 mb-1">
                     <IconBell className={`w-3.5 h-3.5 ${analysis.actionColor}`} />
                     <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-[#E8E9E4]">Advisor</span>
                   </div>
                   <div className={`text-sm sm:text-base font-serif font-bold mb-1 ${analysis.actionColor} uppercase`}>{String(analysis.tradeAction)}</div>
                   <p className="text-[9px] sm:text-[10px] opacity-80 text-[#E8E9E4] mb-2 leading-tight px-1">{String(analysis.tradeReason)}</p>

                   {analysis.hasAction && (
                     <div className="w-full pt-2 border-t border-[#E8E9E4]/10">
                        {manualAction === analysis.tradeAction ? (
                           <div className="w-full bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5">
                             <IconCheck className="w-3.5 h-3.5" /> Logged
                           </div>
                        ) : (
                           <button 
                             onClick={() => executeManualAction(analysis.tradeAction, analysis.actionTarget)}
                             className={`w-full py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all hover:brightness-125 ${
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
               </div>
             )}
          </div>

          {/* Middle Column: Posteriors, Forecast, Sync */}
          <div className="lg:col-span-4 flex flex-col gap-3 h-full">
            <div className="flex gap-3 flex-1 min-h-0">
              <div className="flex-1 bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md flex flex-col justify-center">
                 <div className="text-[9px] sm:text-[10px] text-[#E8E9E4]/50 font-bold uppercase mb-1">POSTERIOR (UP)</div>
                 <div className="text-3xl sm:text-4xl xl:text-5xl font-serif text-indigo-300">{analysis ? `${Number(analysis.rawProbAbove || 0).toFixed(1)}%` : '--%'}</div>
              </div>
              <div className="flex-1 bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md flex flex-col justify-center">
                 <div className="text-[9px] sm:text-[10px] text-[#E8E9E4]/50 font-bold uppercase mb-1">POSTERIOR (DN)</div>
                 <div className="text-3xl sm:text-4xl xl:text-5xl font-serif text-rose-300">{analysis ? `${(100 - Number(analysis.rawProbAbove || 0)).toFixed(1)}%` : '--%'}</div>
              </div>
            </div>

            {/* Restored Hourly Forecast Projections */}
            {analysis && (
              <div className="bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md shrink-0">
                <h2 className="text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5">
                  <IconTrendingUp className="w-3.5 h-3.5 text-purple-400" /> Forecast
                </h2>
                <div className="grid grid-cols-4 gap-2">
                  {analysis.projections.map((proj, idx) => (
                    <div key={idx} className="bg-[#111312] rounded-lg p-1.5 text-center border border-[#E8E9E4]/5">
                      <div className="text-[9px] text-[#E8E9E4]/40 font-bold uppercase mb-0.5">{String(proj.time)}</div>
                      <div className="text-[11px] font-serif text-purple-100">${Number(proj.price || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MANUAL SYNC BUTTONS */}
            {userPosition === null && (
              <div className="flex flex-col items-center gap-1.5 w-full shrink-0">
                <span className="text-[8px] uppercase tracking-widest text-[#E8E9E4]/40">Already in a trade? Sync Tara:</span>
                <div className="flex gap-2 w-full">
                  <button onClick={() => handleManualSync("YES")} className="flex-1 py-1.5 border border-emerald-500/30 text-emerald-400 rounded-md text-[9px] uppercase font-bold tracking-widest hover:bg-emerald-500/10 transition-colors">I Entered YES</button>
                  <button onClick={() => handleManualSync("NO")} className="flex-1 py-1.5 border border-rose-500/30 text-rose-400 rounded-md text-[9px] uppercase font-bold tracking-widest hover:bg-rose-500/10 transition-colors">I Entered NO</button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Engine Logs & Live Wire */}
          <div className="lg:col-span-4 flex flex-col gap-3 h-full">
             {/* Engine Logs */}
             {analysis && (
               <div className="bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-0">
                 <h2 className="text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-[#E8E9E4]/10 pb-1">
                   <IconTerminal className="w-3.5 h-3.5 text-amber-400" /> Engine Logs
                 </h2>
                 <div className="space-y-1.5 font-mono flex-1 overflow-y-auto pr-1 custom-scrollbar">
                   {(analysis.reasoning || []).map((reason, idx) => (
                     <div key={idx} className={`bg-[#111312] p-2 rounded-md text-[8.5px] sm:text-[9px] ${reason.includes('RUG PULL') ? 'text-rose-400 border border-rose-500/20' : 'text-[#E8E9E4]/70 border border-[#E8E9E4]/5'} flex items-start gap-1.5 uppercase`}>
                       <span className="text-emerald-500 mt-0.5">{`>`}</span>
                       <span className="leading-snug">{String(reason)}</span>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* Live Wire */}
             <div className="bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-0">
               <div className="flex justify-between items-center mb-2 border-b border-[#E8E9E4]/10 pb-1">
                 <h2 className="text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest flex items-center gap-1.5">
                   <IconGlobe className="w-3.5 h-3.5 text-blue-400" /> Live Wire
                 </h2>
               </div>
               <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                 {newsEvents.length === 0 ? (
                    <div className="text-[10px] text-[#E8E9E4]/40 italic">Generating market intel...</div>
                 ) : (
                   newsEvents.map((news, i) => (
                     <div key={i} className={`border-l-[2px] pl-2 py-0.5 ${news.type === 'rugpull' ? 'border-rose-500' : news.type === 'whale' ? 'border-purple-500' : 'border-indigo-500/40'}`}>
                       <span className={`text-[9px] sm:text-[10px] leading-tight ${news.type === 'rugpull' ? 'text-rose-400 font-bold' : news.type === 'whale' ? 'text-purple-300' : 'text-[#E8E9E4]/90'}`}>
                         {String(news.title)}
                       </span>
                     </div>
                   ))
                 )}
               </div>
             </div>
          </div>
        </div>

        {/* FULL WIDTH LIVE CHART (Flex-1 perfectly fills remaining screen on desktop) */}
        <div className="w-full bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-lg flex flex-col flex-1 min-h-[300px] mt-2 relative z-10">
          <div className="flex justify-between items-center mb-2 border-b border-[#E8E9E4]/10 pb-2">
            <h2 className="text-[10px] font-bold text-[#E8E9E4]/80 uppercase tracking-[0.2em] flex items-center gap-2">
              <IconActivity className="w-4 h-4 text-indigo-400" /> LIVE PRICE CHART
            </h2>
            <div className="flex items-center gap-3 text-[9px] text-[#E8E9E4]/60 bg-[#111312] px-3 py-1 rounded-lg border border-[#E8E9E4]/5">
              <label className="flex items-center gap-1 cursor-pointer hover:text-purple-400 transition-colors">
                <input type="checkbox" checked={showWhaleAlerts} onChange={(e) => setShowWhaleAlerts(e.target.checked)} className="accent-purple-500 w-3 h-3" /> Whale Alerts
              </label>
              <label className="flex items-center gap-1 cursor-pointer hover:text-purple-400 transition-colors">
                <input type="checkbox" checked={showRugPullAlerts} onChange={(e) => setShowRugPullAlerts(e.target.checked)} className="accent-purple-500 w-3 h-3" /> Rug Pull Alerts
              </label>
              <label className="flex items-center gap-1 cursor-pointer hover:text-purple-400 transition-colors">
                <input type="checkbox" checked={showCandles} onChange={(e) => setShowCandles(e.target.checked)} className="accent-purple-500 w-3 h-3" /> Candlesticks
              </label>
              <span className="ml-1 pl-2 border-l border-[#E8E9E4]/10 opacity-50">{liveHistory.length} pts</span>
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
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">1. Layout & Scroll Engine</h3>
                <p className="mb-3 leading-relaxed">Tara V58 is designed to fit entirely on a single screen. The Canvas chart natively supports panning (click and drag) and zooming (scroll wheel/trackpad swiping) without interrupting the page layout.</p>
              </section>
              
              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">2. Multi-Timeframe & Zero-Latency Divergence</h3>
                <p className="mb-3 leading-relaxed">You can toggle Tara between 5-Minute and 15-Minute mode. <br/><strong>In 15M Mode:</strong> She analyzes macro-trends, VWAP, and looks for safer, wider structural trades.<br/><strong>In 5M Mode:</strong> She becomes an aggressive scalper. She ignores slow indicators and multiplies the weight of live order flow (Tape Delta) by 1.25x.</p>
                <p className="mb-3 leading-relaxed border-l-2 border-emerald-500 pl-3 bg-emerald-500/5 p-2 rounded-r"><strong>Active Signal Hysteresis:</strong> Tara's brain is now sticky. If she identifies a 68% conviction entry, she locks onto it and won't drop the signal unless momentum completely collapses below 48%. This eliminates UI flickering.</p>
              </section>

              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">3. Active Trade Management</h3>
                <p className="leading-relaxed">Once you click <strong>"I Entered YES/NO"</strong>, the terminal shifts into Active Management Mode. The "Window Closed" warnings disappear. Tara will now guide you down to the final second. <br/><br/>If you input your "Live Market Offer", Tara will explicitly tell you to <strong>SECURE PROFIT</strong> if your edge begins to fade, or <strong>CUT LOSSES</strong> if momentum breaks.</p>
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
