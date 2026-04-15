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
const IconTarget = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;

// ═══════════════════════════════════════════════════
// V60 TECHNICAL INDICATORS — COMPLETE SUITE
// ═══════════════════════════════════════════════════

const calcEMA = (data, period) => {
  if (!data || data.length < period) return [];
  const k = 2 / (period + 1);
  const result = new Array(data.length).fill(null);
  result[data.length - 1] = data[data.length - 1];
  for (let i = data.length - 2; i >= 0; i--) {
    result[i] = data[i] * k + result[i + 1] * (1 - k);
  }
  return result;
};

const calculateVWAP = (history) => {
  if (!history || history.length === 0) return null;
  let tpv = 0, tv = 0;
  history.forEach(c => { const tp = (c.h + c.l + c.c) / 3; tpv += tp * c.v; tv += c.v; });
  return tv === 0 ? null : tpv / tv;
};

const calculateRSI = (data, period = 14) => {
  if (!data || data.length < period + 1) return 50;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = data[i - 1] - data[i];
    if (diff > 0) avgGain += diff; else avgLoss -= diff;
  }
  avgGain /= period; avgLoss /= period;
  for (let i = period + 1; i < Math.min(data.length, period + 30); i++) {
    const diff = data[i - 1] - data[i];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + (avgGain / avgLoss)));
};

const calculateATR = (history, period = 14) => {
  if (!history || history.length < period + 1) return 0;
  let trSum = 0;
  for (let i = 0; i < period; i++) {
    const h = history[i].h, l = history[i].l, pc = history[i + 1]?.c || history[i].o;
    trSum += Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
  }
  return trSum / period;
};

const calculateMACD = (closes) => {
  if (!closes || closes.length < 26) return { line: 0, signal: 0, hist: 0 };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (ema12.length === 0 || ema26.length === 0) return { line: 0, signal: 0, hist: 0 };
  const macdLine = ema12.map((v, i) => (v !== null && ema26[i] !== null) ? v - ema26[i] : 0);
  const signalLine = calcEMA(macdLine, 9);
  const line = macdLine[0] || 0;
  const signal = signalLine[0] || 0;
  return { line, signal, hist: line - signal };
};

const calculateBB = (closes, period = 20) => {
  if (!closes || closes.length < period) return { upper: 0, mid: 0, lower: 0, pctB: 0.5, width: 0 };
  const slice = closes.slice(0, period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const std = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period);
  const upper = mean + 2 * std, lower = mean - 2 * std;
  const pctB = (upper - lower) > 0 ? (closes[0] - lower) / (upper - lower) : 0.5;
  const width = mean > 0 ? ((upper - lower) / mean) * 10000 : 0;
  return { upper, mid: mean, lower, pctB, width };
};

// ═══════════════════════════════════════════════════
// V60 VELOCITY ENGINE — Tracks speed & acceleration
// of price movement relative to strike. This is the
// core innovation: instead of asking "where is price?"
// we ask "where is price GOING and how FAST?"
// ═══════════════════════════════════════════════════
const useVelocityEngine = (tickHistory, currentPrice, targetMargin, windowType) => {
  const velocityRef = useRef({ v1s: 0, v5s: 0, v15s: 0, v30s: 0, accel: 0, jerk: 0, peakPnL: 0, troughPnL: 0, pnlSlope: 0 });
  const pnlHistory = useRef([]); // track PnL over time for cashout logic
  
  useEffect(() => {
    const interval = setInterval(() => {
      if (!currentPrice || !targetMargin) return;
      const now = Date.now();
      const ticks = tickHistory.current || [];
      
      // Velocity at multiple timeframes
      const getAvgPrice = (ms) => {
        const relevant = ticks.filter(t => now - t.time >= ms - 500 && now - t.time <= ms + 500);
        if (relevant.length === 0) {
          const fallback = ticks.filter(t => now - t.time <= ms + 2000 && now - t.time >= ms - 2000);
          return fallback.length > 0 ? fallback[Math.floor(fallback.length / 2)].p : null;
        }
        return relevant.reduce((a, b) => a + b.p, 0) / relevant.length;
      };
      
      const p1s = getAvgPrice(1000);
      const p5s = getAvgPrice(5000);
      const p15s = getAvgPrice(15000);
      const p30s = getAvgPrice(30000);
      
      const v1s = p1s ? (currentPrice - p1s) : 0;
      const v5s = p5s ? (currentPrice - p5s) / 5 : 0;
      const v15s = p15s ? (currentPrice - p15s) / 15 : 0;
      const v30s = p30s ? (currentPrice - p30s) / 30 : 0;
      
      // Acceleration: is velocity increasing or decreasing?
      const accel = v5s - v15s; // positive = accelerating in current direction
      const jerk = v1s - v5s; // rate of change of acceleration (snap moves)
      
      // PnL tracking for cashout timing
      const currentPnLBps = ((currentPrice - targetMargin) / targetMargin) * 10000;
      pnlHistory.current.push({ pnl: currentPnLBps, time: now });
      pnlHistory.current = pnlHistory.current.filter(p => now - p.time < 120000);
      
      // Track peak and trough PnL this window
      const peakPnL = Math.max(...pnlHistory.current.map(p => p.pnl), currentPnLBps);
      const troughPnL = Math.min(...pnlHistory.current.map(p => p.pnl), currentPnLBps);
      
      // PnL slope: is our profit growing or shrinking? (last 10s)
      const recentPnL = pnlHistory.current.filter(p => now - p.time < 10000);
      let pnlSlope = 0;
      if (recentPnL.length >= 3) {
        const first = recentPnL[0].pnl;
        const last = recentPnL[recentPnL.length - 1].pnl;
        pnlSlope = last - first;
      }
      
      velocityRef.current = { v1s, v5s, v15s, v30s, accel, jerk, peakPnL, troughPnL, pnlSlope };
    }, 500);
    
    return () => clearInterval(interval);
  }, [currentPrice, targetMargin, windowType]);
  
  return velocityRef;
};

// ═══════════════════════════════════════════════════
// NATIVE INTERACTIVE CANDLESTICK / LINE CHART
// ═══════════════════════════════════════════════════
const LiveChart = ({ data, currentPrice, targetMargin, showCandles, rugPullActive }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [hoverPos, setHoverPos] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const isDragging = useRef(false);
  const lastMouseX = useRef(0);
  const lastTouchX = useRef(null);
  const initialPinchDist = useRef(null);
  const maxPanRef = useRef(0);
  const spacingRef = useRef(10); 

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(entries => {
      for (let entry of entries) setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handleNativeWheel = (e) => {
      e.preventDefault(); 
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setPan(prev => Math.max(0, Math.min(maxPanRef.current, prev - e.deltaX / spacingRef.current)));
      else setZoom(prev => Math.max(1, Math.min(20, prev - e.deltaY * 0.005)));
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
    const width = dimensions.width, height = dimensions.height;
    const rightMargin = 65, bottomMargin = 20;
    const chartW = width - rightMargin, chartH = height - bottomMargin;
    const volH = chartH * 0.2, priceH = chartH - volH;
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
    if (targetMargin > 0) { minPrice = Math.min(minPrice, targetMargin - 50); maxPrice = Math.max(maxPrice, targetMargin + 50); }
    const padding = (maxPrice - minPrice) * 0.1 || 10;
    const scaleY = priceH / (maxPrice - minPrice + padding * 2);
    const yOffset = maxPrice + padding;
    const volScale = volH / (maxVol * 1.1);

    ctx.strokeStyle = 'rgba(232, 233, 228, 0.05)'; ctx.fillStyle = 'rgba(232, 233, 228, 0.4)';
    ctx.font = '10px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 1;
    for(let i=0; i<=5; i++) {
        const y = (priceH / 5) * i; const price = maxPrice + padding - (y / scaleY);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
        if (i < 5) ctx.fillText(price.toFixed(2), chartW + 5, y);
    }
    const spacing = chartW / viewData.length; spacingRef.current = spacing;
    const candleWidth = Math.max(1, spacing * 0.6);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for(let i=1; i<5; i++) {
        const x = (chartW / 5) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, chartH); ctx.stroke();
        const dataIndex = Math.floor(x / spacing);
        if (viewData[dataIndex]?.time) {
            const t = viewData[dataIndex].time; const d = new Date(t > 1e11 ? t : t * 1000);
            ctx.fillText(d.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}), x, chartH + 5);
        }
    }
    if (targetMargin > 0) {
        const targetY = (yOffset - targetMargin) * scaleY;
        if (targetY > 0 && targetY < priceH) {
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)'; ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]); ctx.beginPath(); ctx.moveTo(0, targetY); ctx.lineTo(chartW, targetY); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(99, 102, 241, 0.2)'; ctx.fillRect(chartW, targetY - 10, rightMargin, 20);
            ctx.fillStyle = '#818cf8'; ctx.textAlign = 'left'; ctx.font = 'bold 10px sans-serif';
            ctx.fillText(targetMargin.toFixed(2), chartW + 5, targetY);
        }
    }
    viewData.forEach((candle, i) => {
        const x = i * spacing + spacing / 2; const isBullish = candle.c >= candle.o;
        ctx.fillStyle = isBullish ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 113, 133, 0.2)';
        ctx.fillRect(x - candleWidth / 2, chartH - (candle.v || 0) * volScale, candleWidth, (candle.v || 0) * volScale);
    });
    if (showCandles) {
      viewData.forEach((candle, i) => {
        const x = i * spacing + spacing / 2; const isBullish = candle.c >= candle.o;
        const color = isBullish ? '#34d399' : '#fb7185'; 
        ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
        ctx.moveTo(x, (yOffset - candle.h) * scaleY); ctx.lineTo(x, (yOffset - candle.l) * scaleY); ctx.stroke();
        ctx.fillStyle = color;
        const bodyY = (yOffset - Math.max(candle.o, candle.c)) * scaleY;
        ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(2, Math.abs(candle.c - candle.o) * scaleY));
      });
    } else {
      ctx.beginPath();
      viewData.forEach((candle, i) => { const x = i * spacing + spacing / 2; const y = (yOffset - candle.c) * scaleY; if(i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
      ctx.strokeStyle = '#c084fc'; ctx.lineWidth = 2; ctx.stroke();
      ctx.lineTo(chartW, priceH); ctx.lineTo(0, priceH); ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, priceH);
      grad.addColorStop(0, 'rgba(192, 132, 252, 0.2)'); grad.addColorStop(1, 'rgba(192, 132, 252, 0)');
      ctx.fillStyle = grad; ctx.fill();
    }
    if (currentPrice) {
      const currentY = (yOffset - currentPrice) * scaleY;
      if (currentY > 0 && currentY < priceH) {
        ctx.strokeStyle = rugPullActive ? '#fb7185' : '#34d399'; ctx.lineWidth = rugPullActive ? 2 : 1;
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
         const di = Math.floor(hoverPos.x / spacing);
         if (viewData[di]) {
            const dotX = di * spacing + spacing / 2; const dotY = (yOffset - viewData[di].c) * scaleY;
            ctx.beginPath(); ctx.arc(dotX, dotY, 4, 0, 2 * Math.PI);
            ctx.fillStyle = '#c084fc'; ctx.fill(); ctx.shadowBlur = 10; ctx.shadowColor = '#c084fc'; ctx.stroke(); ctx.shadowBlur = 0;
         }
      }
      if (hoverPos.y < priceH) {
          const hp = yOffset - (hoverPos.y / scaleY);
          ctx.fillStyle = '#2A2D2C'; ctx.fillRect(chartW, hoverPos.y - 10, rightMargin, 20);
          ctx.fillStyle = '#E8E9E4'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '10px sans-serif';
          ctx.fillText(hp.toFixed(2), chartW + 5, hoverPos.y);
      }
      const di = Math.floor(hoverPos.x / spacing);
      if (viewData[di]?.time) {
          const t = viewData[di].time; const d = new Date(t > 1e11 ? t : t * 1000);
          const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
          const timeStr = d.toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'});
          ctx.fillStyle = '#2A2D2C'; ctx.fillRect(hoverPos.x - 50, chartH, 100, bottomMargin);
          ctx.fillStyle = '#E8E9E4'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(`${dateStr} ${timeStr}`, hoverPos.x, chartH + (bottomMargin/2));
      }
    }
  }, [data, currentPrice, zoom, pan, hoverPos, showCandles, targetMargin, rugPullActive, dimensions]);

  const handleMouseDown = (e) => { isDragging.current = true; lastMouseX.current = e.clientX; };
  const handleMouseMove = (e) => {
      const rect = containerRef.current.getBoundingClientRect();
      setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (isDragging.current) { setPan(prev => Math.max(0, Math.min(maxPanRef.current, prev + (e.clientX - lastMouseX.current) / spacingRef.current))); lastMouseX.current = e.clientX; }
  };
  const handleMouseUp = () => { isDragging.current = false; };
  const handleMouseLeave = () => { setHoverPos(null); isDragging.current = false; };
  const handleTouchStart = (e) => {
      if (e.touches.length === 1) { isDragging.current = true; lastTouchX.current = e.touches[0].clientX; const rect = containerRef.current.getBoundingClientRect(); setHoverPos({ x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }); }
      else if (e.touches.length === 2) { const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY; initialPinchDist.current = Math.sqrt(dx*dx + dy*dy); setHoverPos(null); }
  };
  const handleTouchMove = (e) => {
      if (e.touches.length === 1 && isDragging.current) {
          const dx = e.touches[0].clientX - lastTouchX.current;
          setPan(prev => Math.max(0, Math.min(maxPanRef.current, prev + dx / spacingRef.current)));
          lastTouchX.current = e.touches[0].clientX;
          const rect = containerRef.current.getBoundingClientRect();
          setHoverPos({ x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top });
      } else if (e.touches.length === 2 && initialPinchDist.current) {
          const dx = e.touches[0].clientX - e.touches[1].clientX; const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.sqrt(dx*dx + dy*dy);
          setZoom(prev => Math.max(1, Math.min(20, prev + (dist - initialPinchDist.current) * 0.05)));
          initialPinchDist.current = dist;
      }
  };
  const handleTouchEnd = () => { isDragging.current = false; initialPinchDist.current = null; setHoverPos(null); };

  return (
      <div ref={containerRef} className="w-full h-full relative cursor-crosshair" style={{ touchAction: 'none' }}>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full"
              onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd}
          />
      </div>
  );
};


// ═══════════════════════════════════════════════════
// MAIN APPLICATION
// ═══════════════════════════════════════════════════
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
  const lastAdvisedRef = useRef("SIT OUT");
  const [scorecards, setScorecards] = useState({ '15m': { wins: 91, losses: 71 }, '5m': { wins: 10, losses: 7 } });
  
  useEffect(() => {
    setIsMounted(true);
    try { const s = localStorage.getItem('btcOracleScorecardV60'); if (s) setScorecards(JSON.parse(s)); } catch (e) {}
  }, []);

  const [manualAction, setManualAction] = useState(null);
  const [forceRender, setForceRender] = useState(0); 
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatLog, setChatLog] = useState([{ role: 'tara', text: "Tara V60 online. Velocity engine active. Momentum-based predictions with early cashout detection. PnL slope tracking enabled." }]);
  const [chatInput, setChatInput] = useState("");
  const lastWindowRef = useRef("");
  const [userPosition, setUserPosition] = useState(null); 
  const [showHelp, setShowHelp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const prevActionRef = useRef(null);

  // V60 Velocity Engine
  const velocityRef = useVelocityEngine(tickHistoryRef, currentPrice, targetMargin, windowType);

  useEffect(() => {
    if (isMounted && typeof window !== 'undefined') {
      try { localStorage.setItem('btcOracleScorecardV60', JSON.stringify(scorecards)); } catch (e) {}
    }
  }, [scorecards, isMounted]);

  const liveHistory = useMemo(() => {
    if (history.length === 0 || !currentPrice) return history;
    const updated = [...history];
    updated[0] = { ...updated[0], c: currentPrice, h: Math.max(updated[0].h || currentPrice, currentPrice), l: Math.min(updated[0].l || currentPrice, currentPrice) };
    return updated;
  }, [history, currentPrice]);

  const playAlertSound = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ac.createOscillator(); const gain = ac.createGain();
      osc.type = 'sine'; osc.frequency.setValueAtTime(587.33, ac.currentTime); 
      gain.gain.setValueAtTime(0.1, ac.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5);
      osc.connect(gain); gain.connect(ac.destination); osc.start(); osc.stop(ac.currentTime + 0.5);
    } catch(e) {}
  };

  const handleWindowToggle = (type) => {
    if (type === windowType) return;
    setWindowType(type); lockedPredictionRef.current = "SIT OUT";
    activeCallRef.current = { prediction: "SIT OUT", strike: currentPrice };
    hasReversedRef.current = false; lastAdvisedRef.current = "SIT OUT";
    setUserPosition(null); setManualAction(null); setCurrentOffer(""); setBetAmount(0); setMaxPayout(0);
    lastWindowRef.current = ""; setForceRender(prev => prev + 1);
  };

  const updateScore = (type, winOrLoss, amount) => {
    setScorecards(prev => ({ ...prev, [type]: { ...prev[type], [winOrLoss]: Math.max(0, (prev[type]?.[winOrLoss] || 0) + amount) } }));
  };

  // Window Rollover
  useEffect(() => {
    if (timeState.nextWindowEST && timeState.nextWindowEST !== lastWindowRef.current) {
      if (currentPrice !== null) {
        if (lastWindowRef.current !== "") {
          const prevCall = activeCallRef.current;
          if (prevCall.prediction === "YES") { if (currentPrice > prevCall.strike) updateScore(windowType, 'wins', 1); else if (currentPrice < prevCall.strike) updateScore(windowType, 'losses', 1); }
          else if (prevCall.prediction === "NO") { if (currentPrice < prevCall.strike) updateScore(windowType, 'wins', 1); else if (currentPrice > prevCall.strike) updateScore(windowType, 'losses', 1); }
        }
        setTargetMargin(currentPrice); lockedPredictionRef.current = "SIT OUT";
        activeCallRef.current = { prediction: "SIT OUT", strike: currentPrice };
        hasReversedRef.current = false; lastAdvisedRef.current = "SIT OUT";
        setUserPosition(null); lastWindowRef.current = timeState.nextWindowEST;
        setManualAction(null); tickHistoryRef.current = []; setCurrentOffer(""); setBetAmount(0); setMaxPayout(0);
      }
    }
  }, [timeState.nextWindowEST, currentPrice, windowType]);

  // WebSockets
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let isCanvas = false; try { isCanvas = window.self !== window.top; } catch (e) { isCanvas = true; }
    let wsCB = null, wsBinanceLiq = null, lastVisualUpdate = 0;
    
    const updateVisualPrice = (newPrice, source) => {
      currentPriceRef.current = newPrice; const now = Date.now();
      lastPriceSourceRef.current = { source, time: now };
      if (now - lastVisualUpdate > 300) {
        setCurrentPrice(prev => { if (prev !== null && newPrice !== prev) setTickDirection(newPrice > prev ? 'up' : 'down'); return newPrice; });
        lastVisualUpdate = now;
      }
    };

    const initWS = () => {
      if (isCanvas) return;
      try {
        wsCB = new WebSocket('wss://ws-feed.exchange.coinbase.com');
        wsCB.onopen = () => wsCB.send(JSON.stringify({ type: 'subscribe', product_ids: ['BTC-USD'], channels: ['ticker'] }));
        wsCB.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'ticker' && data.price) {
              const p = parseFloat(data.price); const size = parseFloat(data.last_size) || 0;
              updateVisualPrice(p, 'coinbase');
              const now = Date.now();
              tickHistoryRef.current.push({ p, s: size, t: data.side === 'sell' ? 'B' : 'S', time: now });
              tickHistoryRef.current = tickHistoryRef.current.filter(t => now - t.time < 60000);
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
              const usdValue = parseFloat(data.o.q) * parseFloat(data.o.p);
              if (usdValue > 10000) setLiquidations(prev => [...prev, { side: data.o.S, value: usdValue, time: Date.now() }].filter(l => Date.now() - l.time < 60000));
            }
          } catch (err) {}
        };
      } catch(e) {}
    };
    initWS();
    return () => { 
      if (wsCB?.readyState === 1) { wsCB.send(JSON.stringify({ type: 'unsubscribe', product_ids: ['BTC-USD'], channels: ['ticker'] })); wsCB.close(); }
      if (wsBinanceLiq?.readyState === 1) wsBinanceLiq.close();
    };
  }, []);

  // Tape Aggregation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      let takerBuys = 0, takerSells = 0, whaleSpotted = null;
      tickHistoryRef.current.forEach(t => {
        if (now - t.time > 30000) return;
        const usd = t.s * t.p;
        if (t.t === 'B') { takerBuys += usd; if (t.s > 1.5) whaleSpotted = 'BUY'; } 
        else { takerSells += usd; if (t.s > 1.5) whaleSpotted = 'SELL'; }
      });
      setTakerFlow({ imbalance: takerSells === 0 ? (takerBuys > 0 ? 2 : 1) : takerBuys / takerSells, whaleSpotted });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // REST Fallback
  useEffect(() => {
    let lastUiUpdate = 0;
    const fetchSpot = async () => {
      try {
        const res = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/ticker');
        if (!res.ok) return; const d = await res.json();
        if (d.price) {
          const p = parseFloat(d.price); const now = Date.now();
          if (lastPriceSourceRef.current.source !== 'coinbase' || now - lastPriceSourceRef.current.time > 2000) {
             currentPriceRef.current = p; lastPriceSourceRef.current = { source: 'rest', time: now };
             if (now - lastUiUpdate > 300) { setCurrentPrice(prev => { if (prev !== null && p !== prev) setTickDirection(p > prev ? 'up' : 'down'); return p; }); lastUiUpdate = now; }
          }
          tickHistoryRef.current.push({ p, s: parseFloat(d.size || 0.1), t: 'B', time: Date.now() });
          tickHistoryRef.current = tickHistoryRef.current.filter(t => Date.now() - t.time < 60000);
        }
      } catch(e) {}
    };
    fetchSpot(); const interval = setInterval(fetchSpot, 1500);
    return () => clearInterval(interval);
  }, []);

  // Heavy Polling
  useEffect(() => {
    const fetchHeavy = async () => {
      try {
        const gran = windowType === '15m' ? 900 : 300;
        try {
          const res = await fetch(`https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=${gran}`);
          if (res.ok) { const d = await res.json(); if (Array.isArray(d)) { const f = d.slice(0, 60).map(c => ({ time: c[0], l: parseFloat(c[1]), h: parseFloat(c[2]), o: parseFloat(c[3]), c: parseFloat(c[4]), v: parseFloat(c[5]) })); if (f.length > 0) setHistory(f); }}
        } catch (e) {}
        try {
          const res = await fetch('https://api.exchange.coinbase.com/products/BTC-USD/book?level=2');
          if (res.ok) { const d = await res.json(); if (d?.bids && d?.asks) {
            let localBuy = 0, localSell = 0;
            d.bids.forEach(([p, s]) => { if (p <= targetMargin && p >= targetMargin - 150) localBuy += parseFloat(s); });
            d.asks.forEach(([p, s]) => { if (p >= targetMargin && p <= targetMargin + 150) localSell += parseFloat(s); });
            setOrderBook({ localBuy, localSell, imbalance: localSell === 0 ? 1 : localBuy / localSell });
          }}
        } catch (e) {}
        setIsLoading(false);
      } catch (e) { setIsLoading(false); }
    };
    fetchHeavy(); const interval = setInterval(fetchHeavy, 5000);
    return () => clearInterval(interval);
  }, [targetMargin, windowType]);

  useEffect(() => { if (targetMargin === 0 && currentPrice) setTargetMargin(currentPrice); }, [currentPrice, targetMargin]);

  // News Wire
  useEffect(() => {
    let news = [];
    if (orderBook.imbalance > 1.5) news.push({ title: `Maker Alert: Limit BID wall placed near $${targetMargin.toFixed(0)}`, type: 'info' });
    if (orderBook.imbalance < 0.6) news.push({ title: `Maker Alert: Limit SELL pressure defending $${targetMargin.toFixed(0)}`, type: 'info' });
    if (showWhaleAlerts) {
        if (takerFlow.imbalance > 2.0) news.push({ title: `🐋 WHALE: Aggressive Market BUYING detected on the tape.`, type: 'whale' });
        if (takerFlow.imbalance < 0.5) news.push({ title: `🐋 WHALE: Aggressive Market SELLING detected on the tape.`, type: 'whale' });
    }
    if (news.length < 3) news.push({ title: `Engine: Analyzing Order Book vs Tape Divergence (${String(windowType).toUpperCase()})...`, type: 'info' });
    setNewsEvents(news);
  }, [orderBook.imbalance, takerFlow.imbalance, targetMargin, windowType, showWhaleAlerts]);

  // Time Engine
  useEffect(() => {
    const update = () => {
      const now = new Date(); const msNow = now.getTime();
      const intervalMs = (windowType === '15m' ? 15 : 5) * 60 * 1000;
      const nextWindowMs = Math.ceil((msNow + 500) / intervalMs) * intervalMs;
      const nextWindow = new Date(nextWindowMs); const startWindow = new Date(nextWindowMs - intervalMs);
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
      setTimeState({ currentEST, startWindowEST, nextWindowEST, minsRemaining: Math.floor(diffMs / 60000), secsRemaining: Math.floor((diffMs % 60000) / 1000), currentHour: now.getHours() });
    };
    update(); const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [windowType]);

  // ═══════════════════════════════════════════════════════════
  // V60 PREDICTION ENGINE — COMPLETELY REWRITTEN
  // 
  // Core philosophy changes from V55:
  // 1. VELOCITY over position — "where is price GOING" not "where IS it"
  // 2. Multi-timeframe momentum confirmation (1s, 5s, 15s, 30s)
  // 3. Acceleration tracking — detect momentum decay BEFORE reversal
  // 4. PnL-aware cashout — track your peak profit, exit on decay
  // 5. Distinct 5m vs 15m weighting (not just threshold changes)
  // 6. Candle structure analysis (wicks, body ratio)
  // 7. Volume-price divergence detection
  // ═══════════════════════════════════════════════════════════
  const analysis = useMemo(() => {
    if (!currentPrice || liveHistory.length < 20 || !targetMargin || !isMounted) return null;

    const is15m = windowType === '15m';
    const intervalSeconds = is15m ? 900 : 300;
    const clockSeconds = (timeState.minsRemaining * 60) + timeState.secsRemaining;
    const timeFraction = Math.max(0, Math.min(1, 1 - (clockSeconds / intervalSeconds)));
    const isEndgameLock = clockSeconds < (is15m ? 90 : 45);

    // --- INDICATORS ---
    const closes = liveHistory.map(x => x.c);
    const rsi = calculateRSI(closes, 14);
    const atr = calculateATR(liveHistory, 14) || 10;
    const atrBps = atr > 0 ? (atr / currentPrice) * 10000 : 15;
    const vwap = calculateVWAP(liveHistory);
    const macd = calculateMACD(closes);
    const bb = calculateBB(closes, 20);

    const realGapBps = ((currentPrice - targetMargin) / targetMargin) * 10000;
    const vwapGapBps = vwap ? ((currentPrice - vwap) / vwap) * 10000 : 0;

    // --- VELOCITY DATA ---
    const vel = velocityRef.current;
    const { v1s, v5s, v15s, v30s, accel, jerk, peakPnL, troughPnL, pnlSlope } = vel;

    // --- TAPE FLOW ---
    let aggrFlow = Math.max(-1.0, Math.min(1.0, (takerFlow.imbalance - 1)));
    let mktImplied = Math.max(-1.0, Math.min(1.0, (orderBook.imbalance - 1)));

    // --- LIQUIDATIONS ---
    let liqBuys = 0, liqSells = 0;
    liquidations.forEach(l => { if (Date.now() - l.time < 60000) { if (l.side === 'BUY') liqBuys += l.value; else liqSells += l.value; }});

    // --- CANDLE STRUCTURE (last 5 candles) ---
    let bullishCandles = 0, bearishCandles = 0, avgWickRatio = 0;
    const recentCandles = liveHistory.slice(0, Math.min(5, liveHistory.length));
    recentCandles.forEach(c => {
      if (c.c > c.o) bullishCandles++; else bearishCandles++;
      const body = Math.abs(c.c - c.o);
      const range = c.h - c.l;
      if (range > 0) avgWickRatio += (range - body) / range;
    });
    avgWickRatio /= recentCandles.length || 1;
    const candleBias = (bullishCandles - bearishCandles) / (recentCandles.length || 1); // -1 to +1

    // --- VOLUME-PRICE DIVERGENCE ---
    let volPriceDivergence = false;
    if (liveHistory.length >= 10) {
      const recentVol = liveHistory.slice(0, 5).reduce((a, b) => a + b.v, 0);
      const priorVol = liveHistory.slice(5, 10).reduce((a, b) => a + b.v, 0);
      const priceUp = closes[0] > closes[4];
      const volDown = recentVol < priorVol * 0.7;
      volPriceDivergence = priceUp && volDown; // price up on decreasing volume = weak
    }

    // ═══════════════════════════════════════════
    // REGIME DETECTION (V60: Velocity-based)
    // ═══════════════════════════════════════════
    let regime = "RANGE/CHOP";
    let reasoning = [];

    // Rug pull: multi-confirmation
    const rugConfirm = [v1s < -2, v5s < -0.8, aggrFlow < -0.5, macd.hist < -3, bb.pctB < 0.05].filter(Boolean).length;
    const isRugPull = rugConfirm >= 3;

    // Momentum alignment: are all velocity timeframes agreeing?
    const allVelUp = v1s > 0 && v5s > 0 && v15s > 0;
    const allVelDown = v1s < 0 && v5s < 0 && v15s < 0;
    const velAligned = allVelUp || allVelDown;
    const velDirection = allVelUp ? 1 : allVelDown ? -1 : 0;

    // Is momentum accelerating or decelerating?
    const isAccelerating = (velDirection > 0 && accel > 0) || (velDirection < 0 && accel < 0);
    const isDecelerating = (velDirection > 0 && accel < 0) || (velDirection < 0 && accel > 0);

    if (isRugPull) {
      regime = "CRASH/RUG"; reasoning.push(`REGIME: CRASH (${rugConfirm}/5 confirms). All velocities negative.`);
    } else if (rsi > 72 && bb.pctB > 0.95 && isDecelerating) {
      regime = "OVERBOUGHT REVERSAL"; reasoning.push(`REGIME: RSI ${rsi.toFixed(0)}, BB%B ${(bb.pctB*100).toFixed(0)}%, momentum decelerating. Fade.`);
    } else if (rsi < 28 && bb.pctB < 0.05 && isDecelerating) {
      regime = "OVERSOLD REVERSAL"; reasoning.push(`REGIME: RSI ${rsi.toFixed(0)}, BB%B ${(bb.pctB*100).toFixed(0)}%, momentum decelerating. Fade.`);
    } else if (velAligned && isAccelerating && macd.hist * velDirection > 0) {
      regime = velDirection > 0 ? "STRONG MOMENTUM UP" : "STRONG MOMENTUM DOWN";
      reasoning.push(`REGIME: ${regime}. All velocities aligned + accelerating + MACD confirms.`);
    } else if (velAligned && !isAccelerating) {
      regime = velDirection > 0 ? "FADING UP MOVE" : "FADING DOWN MOVE";
      reasoning.push(`REGIME: ${regime}. Velocity aligned but decelerating. Momentum exhausting.`);
    } else if (bb.width < atrBps * 0.7) {
      regime = "SQUEEZE"; reasoning.push(`REGIME: Bollinger Squeeze. Width ${bb.width.toFixed(0)}bps vs ATR ${atrBps.toFixed(0)}bps. Breakout imminent.`);
    } else {
      regime = "RANGE/CHOP"; reasoning.push(`REGIME: Choppy. Velocities disagree. No clear direction.`);
    }

    // ═══════════════════════════════════════════
    // PROBABILITY ENGINE (V60: Velocity-weighted)
    // ═══════════════════════════════════════════
    let prob = 50;

    // 1. Physical gap (time-decayed, but less dominant now)
    const timeDecay = Math.pow(timeFraction, is15m ? 1.8 : 1.3);
    prob += realGapBps * (is15m ? 0.6 : 0.8) * (0.15 + 0.85 * timeDecay);

    // 2. VELOCITY COMPOSITE — the big change
    // Weight recent velocity more, but require multi-timeframe confirmation
    if (is15m) {
      // 15m: Trust slower velocities more, need confirmation
      prob += v30s * 8;   // base drift
      prob += v15s * 5;   // medium momentum
      prob += v5s * 3;    // recent push
      if (velAligned) prob += velDirection * 12; // alignment bonus
      if (isAccelerating) prob += velDirection * 8; // acceleration bonus
    } else {
      // 5m: Trust fast velocities, react quickly
      prob += v5s * 12;   // recent push is king
      prob += v1s * 8;    // snap velocity matters
      prob += v15s * 3;   // background drift
      if (velAligned) prob += velDirection * 15; // stronger alignment bonus
      if (isAccelerating) prob += velDirection * 10;
    }

    // 3. Jerk detection — sudden momentum shifts
    if (Math.abs(jerk) > 1.0) {
      prob += jerk * (is15m ? 3 : 5);
      reasoning.push(`JERK: Sudden momentum ${jerk > 0 ? 'spike UP' : 'spike DOWN'} (${jerk.toFixed(2)}). React.`);
    }

    // 4. RSI extremes (mean reversion)
    if (rsi > 70) prob -= (rsi - 70) * (is15m ? 1.5 : 1.0);
    else if (rsi < 30) prob += (30 - rsi) * (is15m ? 1.5 : 1.0);

    // 5. MACD confirmation
    prob += macd.hist * (is15m ? 0.4 : 0.8);

    // 6. Tape flow
    prob += aggrFlow * (is15m ? 12 : 18);
    prob += mktImplied * (is15m ? 6 : 4);

    // 7. Candle structure
    prob += candleBias * (is15m ? 5 : 8);

    // 8. Volume-price divergence (bearish signal)
    if (volPriceDivergence && realGapBps > 0) {
      prob -= 8; reasoning.push(`VOL-DIV: Price up on declining volume. Weak rally.`);
    }

    // 9. Bollinger position
    if (bb.pctB > 0.92) prob -= (bb.pctB - 0.92) * 100;
    else if (bb.pctB < 0.08) prob += (0.08 - bb.pctB) * 100;

    // 10. Liquidation cascades
    if (liqBuys > 10000) { prob += 10; reasoning.push(`LIQ: $${(liqBuys/1000).toFixed(0)}K shorts squeezed.`); }
    if (liqSells > 10000) { prob -= 10; reasoning.push(`LIQ: $${(liqSells/1000).toFixed(0)}K longs liquidated.`); }

    // 11. Endgame: physical distance dominates entirely
    if (isEndgameLock) {
        reasoning.push(`ENDGAME: ${clockSeconds}s left. Physical gap locked.`);
        prob = 50 + (realGapBps * (is15m ? 5 : 8));
    }

    // --- PREDICTION LOGIC ---
    let prediction = userPosition || lockedPredictionRef.current;
    let activePrediction = prediction;
    if (activePrediction === "YES") prob += 6;
    else if (activePrediction === "NO") prob -= 6;

    let posterior = Math.max(1, Math.min(99, prob));
    let convictionScore = Math.abs(posterior - 50) * 2;

    // Entry thresholds: require strong conviction
    const entryThreshold = is15m ? 62 : 60;
    if (activePrediction === "SIT OUT" && !isEndgameLock) {
        if (posterior >= entryThreshold && velAligned && velDirection > 0) activePrediction = "YES";
        else if (posterior <= (100 - entryThreshold) && velAligned && velDirection < 0) activePrediction = "NO";
        else if (posterior >= 68) activePrediction = "YES"; // strong prob even without vel alignment
        else if (posterior <= 32) activePrediction = "NO";
    } else if (activePrediction !== "SIT OUT") {
        if (activePrediction === "YES" && posterior < 33) activePrediction = "SIT OUT";
        if (activePrediction === "NO" && posterior > 67) activePrediction = "SIT OUT";
    }
    if (isEndgameLock && Math.abs(realGapBps) > atrBps * 0.4) {
        activePrediction = realGapBps > 0 ? "YES" : "NO";
    }

    // Add indicator readout to reasoning
    reasoning.push(`VEL: 1s=${v1s.toFixed(2)} 5s=${v5s.toFixed(2)} 15s=${v15s.toFixed(2)} 30s=${v30s.toFixed(2)} | Accel=${accel.toFixed(2)}`);
    reasoning.push(`IND: RSI ${rsi.toFixed(0)} | MACD H: ${macd.hist > 0 ? '+' : ''}${macd.hist.toFixed(2)} | BB%B ${(bb.pctB*100).toFixed(0)}% | Tape ${aggrFlow > 0 ? '+' : ''}${aggrFlow.toFixed(2)}`);

    // ═══════════════════════════════════════════
    // V60 TRADE ADVISOR — PnL-AWARE CASHOUT
    // ═══════════════════════════════════════════
    let tradeAction = "WAITING / SIT OUT";
    let tradeReason = "Awaiting velocity alignment to signal.";
    let actionColor = "text-zinc-400", actionBg = "bg-zinc-500/10 border-zinc-500/30";
    let hasAction = false, actionButtonLabel = "", actionTarget = "";

    const dynamicStopLoss = atrBps * (0.50 + ((1-timeFraction) * 0.50));
    let liveEstValue = activePrediction === "YES" ? maxPayout * (posterior / 100) : activePrediction === "NO" ? maxPayout * ((100 - posterior) / 100) : 0;
    const livePnL = liveEstValue - betAmount;
    const offerVal = parseFloat(currentOffer) || 0;

    const riskPct = activePrediction === "YES" ? (100 - posterior) : posterior;
    const chancePct = activePrediction === "YES" ? posterior : (100 - posterior);
    const metricsStr = `[${chancePct.toFixed(0)}% chance | ${riskPct.toFixed(0)}% risk]`;

    // PnL decay detection for cashout timing
    const pnlDrawdown = peakPnL - realGapBps; // how far have we fallen from peak profit
    const isPnLDecaying = pnlSlope < -0.3 && pnlDrawdown > 2; // profit actively shrinking

    if (isRugPull && showRugPullAlerts) {
        tradeAction = "🚨 RUG PULL DETECTED 🚨";
        tradeReason = `${rugConfirm}/5 crash signals. Exit ALL positions. ${metricsStr}`;
        actionColor = "text-rose-500"; actionBg = "bg-rose-500/20 border-rose-500/50 animate-pulse shadow-[0_0_20px_rgba(225,29,72,0.4)]";
        hasAction = true; actionButtonLabel = "EMERGENCY CASHOUT"; actionTarget = "SIT OUT";
        reasoning.push(`🚨 RUG PULL: Multi-confirmation crash detected.`);
    }
    else if (activePrediction === "SIT OUT") {
        if (isEndgameLock) { tradeAction = "WINDOW CLOSED"; tradeReason = "Too late to enter. Wait for next round."; actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30"; }
        else if (regime === "SQUEEZE") { tradeAction = "SQUEEZE — STANDBY"; tradeReason = "Volatility compression. Breakout imminent. Waiting for direction."; actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30"; }
        else { tradeAction = "AWAITING CONVICTION"; tradeReason = `Need velocity alignment + ${entryThreshold}% prob. Currently ${posterior.toFixed(0)}%.`; }
    }
    else {
        const isYES = activePrediction === "YES";
        const currentDir = isYES ? 1 : -1;
        const isBleeding = isYES ? (realGapBps < -dynamicStopLoss) : (realGapBps > dynamicStopLoss);
        const isReversalRecommended = isYES ? (posterior < 33) : (posterior > 67);
        const currentOdds = isYES ? posterior : (100 - posterior);

        // V60 EARLY CASHOUT: detect when your profit is decaying
        const isInProfit = betAmount > 0 && livePnL > 0;
        const profitDropPercent = peakPnL > 0 ? (pnlDrawdown / peakPnL) * 100 : 0;
        const momentumAgainstPosition = (isYES && v5s < -0.3 && accel < 0) || (!isYES && v5s > 0.3 && accel > 0);

        if (prediction === "SIT OUT") {
            tradeAction = `ENTRY: ${activePrediction}`;
            tradeReason = `Velocity aligned. ${regime}. ${metricsStr}`;
            actionColor = isYES ? "text-emerald-400" : "text-rose-400";
            actionBg = isYES ? "bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(52,211,153,0.2)]" : "bg-rose-500/10 border-rose-500/30 shadow-[0_0_15px_rgba(251,113,133,0.2)]";
            hasAction = true; actionButtonLabel = `CONFIRM ENTRY: '${activePrediction}'`; actionTarget = activePrediction;
        }
        // NEW: Early profit protection
        else if (isInProfit && isPnLDecaying && momentumAgainstPosition) {
            tradeAction = "⚡ TAKE PROFIT NOW";
            tradeReason = `Profit decaying. Peak was +${peakPnL.toFixed(0)}bps, now +${realGapBps.toFixed(0)}bps. Momentum reversing. ${metricsStr}`;
            actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/15 border-emerald-500/40 animate-pulse shadow-[0_0_15px_rgba(52,211,153,0.3)]";
            hasAction = true; actionButtonLabel = "CASHOUT PROFIT"; actionTarget = "CASH";
            reasoning.push(`CASHOUT: PnL dropped ${profitDropPercent.toFixed(0)}% from peak. Momentum flipping against you.`);
        }
        // Arb detection
        else if (offerVal > 0 && offerVal - liveEstValue > (maxPayout * 0.04)) {
            tradeAction = "SELL TO MARKET (ARB)";
            tradeReason = `Market overpaying by $${(offerVal - liveEstValue).toFixed(2)}. Free money. ${metricsStr}`;
            actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30 animate-pulse";
            hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "CASH";
        }
        // NEW: Early loss cut — don't wait for ATR limit
        else if (isBleeding && momentumAgainstPosition) {
            tradeAction = "🔻 CUT LOSSES NOW";
            tradeReason = `Past stop + momentum against you. Vel: ${v5s.toFixed(2)}/s. Don't wait. ${metricsStr}`;
            actionColor = "text-rose-500"; actionBg = "bg-rose-500/15 border-rose-500/40 shadow-[0_0_15px_rgba(251,113,133,0.3)]";
            hasAction = true; actionButtonLabel = "CASHOUT (STOP LOSS)"; actionTarget = "SIT OUT";
            reasoning.push(`STOP: Bleeding ${Math.abs(realGapBps).toFixed(0)}bps + velocity against position.`);
        }
        else if (isReversalRecommended && !hasReversedRef.current) {
            tradeAction = "REVERSE POSITION";
            tradeReason = `Regime flipped. Switch sides. ${metricsStr}`;
            actionColor = "text-amber-400"; actionBg = "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(251,191,36,0.2)]";
            hasAction = true; actionButtonLabel = `REVERSE TO '${isYES ? 'NO' : 'YES'}'`; actionTarget = isYES ? "NO" : "YES";
        }
        else if (isBleeding || (isReversalRecommended && hasReversedRef.current)) {
            tradeAction = "CUT LOSSES";
            tradeReason = `Position drifting. ATR stop at ${dynamicStopLoss.toFixed(0)}bps. ${metricsStr}`;
            actionColor = "text-rose-500"; actionBg = "bg-rose-500/10 border-rose-500/30";
            hasAction = true; actionButtonLabel = "EXECUTE CASHOUT"; actionTarget = "SIT OUT";
        }
        else if (currentOdds >= 82 && offerVal === 0) {
            tradeAction = "LOCK IN PROFIT";
            tradeReason = `Odds ${currentOdds.toFixed(0)}%. Secure gains. ${metricsStr}`;
            actionColor = "text-emerald-300"; actionBg = "bg-emerald-500/10 border-emerald-500/30";
            hasAction = true; actionButtonLabel = "CASHOUT (PROFIT)"; actionTarget = "CASH";
        }
        else if (offerVal === 0) {
            // Show position health
            const healthEmoji = currentOdds > 65 ? "💪" : currentOdds > 55 ? "👌" : "⚠️";
            tradeAction = `${healthEmoji} HOLD — ${currentOdds.toFixed(0)}%`;
            tradeReason = `Vel ${v5s > 0 ? '↑' : '↓'}${Math.abs(v5s).toFixed(1)}/s. ${regime}. ${metricsStr}`;
            actionColor = currentOdds > 60 ? "text-emerald-400" : "text-amber-400";
            actionBg = currentOdds > 60 ? "bg-emerald-500/10 border-emerald-500/20" : "bg-amber-500/10 border-amber-500/20";
        }
    }

    let textColor = activePrediction === "YES" ? "text-emerald-400" : activePrediction === "NO" ? "text-rose-400" : "text-zinc-500";

    let convictionText = convictionScore > 60 ? "Very Sure" : convictionScore > 35 ? "Pretty Sure" : "Unsure";
    let topDriver = Math.abs(v5s) > 0.5 ? `Velocity (${v5s > 0 ? '+' : ''}${v5s.toFixed(2)}/s)` : Math.abs(aggrFlow) > 0.5 ? `AggrFlow (${aggrFlow > 0 ? '+' : ''}${aggrFlow.toFixed(2)})` : `Composite (${posterior.toFixed(0)}%)`;

    let predictionReason = "";
    if (activePrediction === "SIT OUT") predictionReason = "Waiting for multi-timeframe velocity alignment.";
    else if (velAligned && isAccelerating) predictionReason = "All velocities aligned + accelerating. Strong.";
    else if (velAligned) predictionReason = "Velocities aligned but decelerating. Watch for exit.";
    else predictionReason = "Holding through chop. Monitoring velocity.";

    // Forecast
    let simulatedPrice = currentPrice;
    let projections = [];
    for(let i=1; i<=4; i++) {
        const nextHour = (timeState.currentHour + i) % 24;
        const decay = Math.pow(0.82, i);
        simulatedPrice += (v15s * 3 + (mktImplied * 0.5) + (macd.hist * 0.1)) * decay * (is15m ? 1.5 : 0.8);
        projections.push({ time: `${nextHour.toString().padStart(2, '0')}:00`, price: simulatedPrice });
    }

    return {
      confidence: activePrediction === "NO" ? (100 - posterior).toFixed(1) : posterior.toFixed(1),
      prediction: activePrediction, predictionReason, reasoning, textColor, rawProbAbove: posterior,
      tradeAction, tradeReason, actionColor, actionBg, hasAction, actionButtonLabel, actionTarget,
      realGapBps, clockSeconds, isSystemLocked: isEndgameLock, atrBps, livePnL, liveEstValue, projections,
      vwapGapBps, regime, aggrFlow, topDriver, entryWindowStatus: isEndgameLock ? "Window Closed" : "Active Signal Window",
      convictionScore, convictionText, isRugPull,
      // V60 extras for display
      vel, rsi, macd, bb, chancePct, riskPct, pnlSlope, peakPnL
    };
  }, [currentPrice, liveHistory, targetMargin, timeState.minsRemaining, timeState.secsRemaining, timeState.currentHour, orderBook, forceRender, betAmount, maxPayout, currentOffer, takerFlow, liquidations, userPosition, windowType, isMounted, showRugPullAlerts, velocityRef]);

  useEffect(() => {
    if (analysis?.hasAction && analysis.tradeAction !== prevActionRef.current) {
      if (analysis.tradeAction.includes("ENTRY") || analysis.tradeAction.includes("TAKE PROFIT") || analysis.tradeAction.includes("CUT LOSSES NOW")) playAlertSound();
    }
    prevActionRef.current = analysis?.tradeAction;
  }, [analysis?.tradeAction, soundEnabled]);

  const executeManualAction = (actionLabel, targetState) => {
    setManualAction(actionLabel);
    if (targetState === "CASH" || targetState === "SIT OUT") setUserPosition(null);
    if (analysis && (analysis.prediction === "YES" || analysis.prediction === "NO")) {
      const isWin = (analysis.prediction === "YES" && currentPrice > targetMargin) || (analysis.prediction === "NO" && currentPrice < targetMargin);
      if (isWin) updateScore(windowType, 'wins', 1); else updateScore(windowType, 'losses', 1);
    }
    if (targetState) {
      lockedPredictionRef.current = targetState === "CASH" ? "SIT OUT" : targetState;
      lastAdvisedRef.current = "SIT OUT";
      if (targetState !== "CASH" && targetState !== "SIT OUT") hasReversedRef.current = true;
      setForceRender(prev => prev + 1); setCurrentOffer("");
    }
  };

  const handleManualSync = (dir) => {
    lockedPredictionRef.current = dir; activeCallRef.current = { prediction: dir, strike: targetMargin };
    setUserPosition(dir); setForceRender(prev => prev + 1);
  };

  const handleChatSubmit = (e) => {
    if (e.key === 'Enter' && chatInput.trim()) {
      const userText = chatInput.trim().toLowerCase();
      const currentLog = [...chatLog, { role: 'user', text: chatInput.trim() }];
      setChatLog(currentLog); setChatInput("");
      setTimeout(() => {
        let reply = "";
        const a = analysis;
        const v = velocityRef.current;
        if (userText.includes("why") || userText.includes("explain") || userText.includes("reason") || userText.includes("logic")) {
          reply = a ? `Posterior: ${Number(a.rawProbAbove||0).toFixed(1)}% YES. Regime: ${a.regime}. Velocity 5s: ${v.v5s.toFixed(2)}/s, 15s: ${v.v15s.toFixed(2)}/s. Accel: ${v.accel.toFixed(2)}. RSI: ${a.rsi?.toFixed(0)||50}. MACD H: ${a.macd?.hist?.toFixed(2)||0}. AggrFlow: ${a.aggrFlow?.toFixed(2)||0}. PnL slope: ${v.pnlSlope.toFixed(2)}.` : "Calculating...";
        }
        else if (userText.includes("velocity") || userText.includes("speed") || userText.includes("momentum")) {
          reply = `Velocity: 1s=${v.v1s.toFixed(2)} | 5s=${v.v5s.toFixed(2)} | 15s=${v.v15s.toFixed(2)} | 30s=${v.v30s.toFixed(2)}. Acceleration: ${v.accel.toFixed(2)}. Jerk: ${v.jerk.toFixed(2)}. Peak PnL: ${v.peakPnL.toFixed(1)}bps. PnL slope: ${v.pnlSlope.toFixed(2)}.`;
        }
        else if (userText.includes("pnl") || userText.includes("profit") || userText.includes("loss") || userText.includes("cashout")) {
          reply = a?.prediction === "SIT OUT" ? "No active trade." : `Est value: ~$${Number(a?.liveEstValue||0).toFixed(2)}. Live PnL: $${Number(a?.livePnL||0).toFixed(2)}. Peak PnL: ${v.peakPnL.toFixed(1)}bps. PnL slope: ${v.pnlSlope > 0 ? '↑ growing' : '↓ shrinking'} (${v.pnlSlope.toFixed(2)}). ${a?.chancePct?.toFixed(0)}% chance, ${a?.riskPct?.toFixed(0)}% risk.`;
        }
        else if (userText.includes("score") || userText.includes("record")) {
          reply = `${windowType.toUpperCase()} scorecard: ${Number(scorecards[windowType]?.wins||0)} Wins / ${Number(scorecards[windowType]?.losses||0)} Losses.`;
        }
        else {
          reply = `YES posterior: ${Number(a?.rawProbAbove||0).toFixed(1)}%. Regime: ${a?.regime||'CHOP'}. Velocity: ${v.v5s > 0 ? '↑' : '↓'}${Math.abs(v.v5s).toFixed(2)}/s. Advice: ${a?.tradeAction||'SIT OUT'}. Ask 'why' for reasoning or 'velocity' for speed data.`;
        }
        setChatLog([...currentLog, { role: 'tara', text: reply }]);
      }, 400);
    }
  };

  useEffect(() => { setManualAction(null); }, [analysis?.tradeAction]);
  useEffect(() => { if (analysis && (analysis.prediction === "YES" || analysis.prediction === "NO" || analysis.prediction === "SIT OUT")) activeCallRef.current = { prediction: analysis.prediction, strike: targetMargin }; }, [analysis?.prediction, targetMargin]);

  if (!isMounted) {
    return <div className="min-h-screen bg-[#111312] flex items-center justify-center text-[#E8E9E4]/50 font-serif text-xl animate-pulse">Initializing Tara V60...</div>;
  }

  return (
    <div className="min-h-screen lg:h-screen bg-[#111312] text-[#E8E9E4] font-sans p-2 sm:p-3 flex flex-col selection:bg-[#E8E9E4]/20 overflow-y-auto">
      <div className="w-full max-w-[1600px] mx-auto flex flex-col h-full gap-3 min-h-0">

        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-[#E8E9E4]/10 pb-2 shrink-0">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <h1 className="text-lg md:text-xl font-serif tracking-tight text-white flex items-center gap-2">
              Tara
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-sans bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> V60 Terminal
              </span>
            </h1>
            <div className="flex sm:hidden items-center gap-2">
              <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-1.5 rounded-md border ${soundEnabled ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'} transition-colors`}>{soundEnabled ? <IconVolume2 /> : <IconVolumeX />}</button>
              <button onClick={() => setShowHelp(true)} className="p-1.5 rounded-md bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-white transition-colors"><IconHelp /></button>
            </div>
          </div>
          <div className="flex bg-[#111312] border border-[#E8E9E4]/20 rounded-lg p-1 shadow-inner w-full sm:w-auto justify-center">
            <button onClick={() => handleWindowToggle('5m')} className={`flex-1 sm:flex-none px-6 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType === '5m' ? 'bg-indigo-500 text-white shadow-md' : 'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>5 Min</button>
            <button onClick={() => handleWindowToggle('15m')} className={`flex-1 sm:flex-none px-6 py-1 text-[10px] uppercase font-bold tracking-widest rounded-md transition-all ${windowType === '15m' ? 'bg-emerald-500 text-white shadow-md' : 'text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'}`}>15 Min</button>
          </div>
          <div className="hidden sm:flex text-right font-sans items-center gap-4">
            <div className="flex flex-col items-end pl-4">
              <div className="text-[10px] text-[#E8E9E4]/40 uppercase tracking-widest mb-0.5">Current EST</div>
              <div className="text-sm font-serif text-[#E8E9E4]/90">{String(timeState.currentEST || '--:--:--')}</div>
            </div>
            <div className="flex items-center gap-2 border-l border-[#E8E9E4]/10 pl-4">
              <button onClick={() => setSoundEnabled(!soundEnabled)} className={`p-2 rounded-lg border ${soundEnabled ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-[#111312] border-[#E8E9E4]/10 text-[#E8E9E4]/40 hover:text-[#E8E9E4]/80'} transition-colors`} title="Toggle Audio">{soundEnabled ? <IconVolume2 /> : <IconVolumeX />}</button>
              <button onClick={() => setShowHelp(true)} className="p-2 rounded-lg bg-[#111312] border border-[#E8E9E4]/10 text-[#E8E9E4]/60 hover:text-white transition-colors" title="Manual"><IconHelp /></button>
            </div>
          </div>
        </div>

        {/* STATS BAR */}
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
             <div className="flex lg:hidden flex-col items-center bg-[#111312] p-1.5 rounded-xl border border-[#E8E9E4]/5 shadow-inner w-1/2">
               <div className="flex items-center justify-between w-full px-2">
                 <div className="flex flex-col items-center"><div className="text-[9px] text-emerald-400 mb-0.5">WINS</div><span className="text-lg font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins || 0)}</span></div>
                 <div className="h-6 w-px bg-[#E8E9E4]/10"></div>
                 <div className="flex flex-col items-center"><div className="text-[9px] text-rose-400 mb-0.5">LOSS</div><span className="text-lg font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses || 0)}</span></div>
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
                 <div className="flex items-center gap-1 text-[9px] text-emerald-400 mb-0.5"><button onClick={() => updateScore(windowType, 'wins', -1)}>-</button> WINS <button onClick={() => updateScore(windowType, 'wins', 1)}>+</button></div>
                 <span className="text-2xl font-serif text-emerald-400 font-bold">{Number(scorecards[windowType]?.wins || 0)}</span>
               </div>
               <div className="h-8 w-px bg-[#E8E9E4]/10"></div>
               <div className="flex flex-col items-center">
                 <div className="flex items-center gap-1 text-[9px] text-rose-400 mb-0.5"><button onClick={() => updateScore(windowType, 'losses', -1)}>-</button> LOSS <button onClick={() => updateScore(windowType, 'losses', 1)}>+</button></div>
                 <span className="text-2xl font-serif text-rose-400 font-bold">{Number(scorecards[windowType]?.losses || 0)}</span>
               </div>
             </div>
           </div>
        </div>

        {/* MIDDLE ROW */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0 lg:h-[250px]">
          {/* Prediction */}
          <div className="lg:col-span-4 bg-[#181A19] p-3 md:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col relative overflow-hidden h-full">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-transparent opacity-30"></div>
             <div className="flex justify-between items-start mb-2">
               <div className="bg-[#111312] border border-[#E8E9E4]/10 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 shadow-sm whitespace-nowrap">
                 <IconClock className="w-3 h-3" />
                 <span className="text-[#E8E9E4]/60 hidden sm:inline">{String(timeState.startWindowEST)}-{String(timeState.nextWindowEST)}</span>
                 <span className="text-[#E8E9E4]">{Number(timeState.minsRemaining)}m {Number(timeState.secsRemaining)}s</span>
               </div>
               {analysis && analysis.tradeAction !== "SIT OUT" && analysis.prediction !== "ANALYZING" && (
                 <button onClick={() => executeManualAction("MANUAL PULL OUT", "SIT OUT")} className="bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors">
                   <IconAlertTriangle className="w-3 h-3" /> <span>Force Exit</span>
                 </button>
               )}
             </div>
             {isLoading || !analysis ? (
               <div className="text-lg font-serif text-[#E8E9E4]/30 animate-pulse mt-4 text-center w-full">Connecting...</div>
             ) : (
               <div className="flex flex-col items-center w-full flex-1 justify-center">
                 <div className="flex flex-col items-center mb-2">
                   <span className="text-[9px] text-[#E8E9E4]/40 uppercase tracking-[0.2em] font-bold">Prediction</span>
                   <h2 className={`text-[48px] sm:text-[56px] xl:text-[64px] font-serif font-bold leading-none tracking-tight ${analysis.textColor} drop-shadow-lg transition-all flex items-center justify-center uppercase`}>{String(analysis.prediction)}</h2>
                 </div>
                 <div className={`w-full p-2.5 rounded-xl border-[1.5px] ${analysis.actionBg} transition-colors flex flex-col items-center text-center shadow-sm mt-auto`}>
                   <div className="flex items-center gap-1.5 mb-1">
                     <IconBell className={`w-3.5 h-3.5 ${analysis.actionColor}`} />
                     <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 text-[#E8E9E4]">Advisor</span>
                   </div>
                   <div className={`text-sm sm:text-base font-serif font-bold mb-1 ${analysis.actionColor} uppercase`}>{String(analysis.tradeAction)}</div>
                   <p className="text-[9px] sm:text-[10px] opacity-80 text-[#E8E9E4] mb-1.5 leading-tight px-1">{String(analysis.tradeReason)}</p>
                   {analysis.hasAction && (
                     <div className="w-full pt-2 border-t border-[#E8E9E4]/10">
                        {manualAction === analysis.tradeAction ? (
                           <div className="w-full bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5"><IconCheck className="w-3.5 h-3.5" /> Logged</div>
                        ) : (
                           <button onClick={() => executeManualAction(analysis.tradeAction, analysis.actionTarget)}
                             className={`w-full py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all hover:brightness-125 ${analysis.actionColor.includes('rose') ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' : analysis.actionColor.includes('amber') ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'}`}>
                             {String(analysis.actionButtonLabel)}
                           </button>
                        )}
                     </div>
                   )}
                 </div>
               </div>
             )}
          </div>

          {/* Middle: Posteriors, Forecast, Sync */}
          <div className="lg:col-span-4 flex flex-col gap-3 h-full">
            <div className="flex gap-3 flex-1 min-h-0">
              <div className="flex-1 bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md flex flex-col justify-center">
                 <div className="text-[9px] sm:text-[10px] text-[#E8E9E4]/50 font-bold uppercase mb-1">CHANCE (UP)</div>
                 <div className="text-3xl sm:text-4xl xl:text-5xl font-serif text-indigo-300">{analysis ? `${Number(analysis.rawProbAbove || 0).toFixed(1)}%` : '--%'}</div>
              </div>
              <div className="flex-1 bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 text-center shadow-md flex flex-col justify-center">
                 <div className="text-[9px] sm:text-[10px] text-[#E8E9E4]/50 font-bold uppercase mb-1">CHANCE (DN)</div>
                 <div className="text-3xl sm:text-4xl xl:text-5xl font-serif text-rose-300">{analysis ? `${(100 - Number(analysis.rawProbAbove || 0)).toFixed(1)}%` : '--%'}</div>
              </div>
            </div>
            {analysis && (
              <div className="bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md shrink-0">
                <h2 className="text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-1.5"><IconTrendingUp className="w-3.5 h-3.5 text-purple-400" /> Forecast</h2>
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

          {/* Right: Engine Logs & Wire */}
          <div className="lg:col-span-4 flex flex-col gap-3 h-full">
             {analysis && (
               <div className="bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-0">
                 <h2 className="text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest mb-2 flex items-center gap-1.5 border-b border-[#E8E9E4]/10 pb-1"><IconTerminal className="w-3.5 h-3.5 text-amber-400" /> Engine Logs</h2>
                 <div className="space-y-1.5 font-mono flex-1 overflow-y-auto pr-1 custom-scrollbar">
                   {(analysis.reasoning || []).map((reason, idx) => (
                     <div key={idx} className={`bg-[#111312] p-2 rounded-md text-[8.5px] sm:text-[9px] ${reason.includes('RUG') || reason.includes('CRASH') || reason.includes('STOP') ? 'text-rose-400 border border-rose-500/20' : reason.includes('CASHOUT') || reason.includes('TAKE PROFIT') ? 'text-emerald-400 border border-emerald-500/20' : 'text-[#E8E9E4]/70 border border-[#E8E9E4]/5'} flex items-start gap-1.5 uppercase`}>
                       <span className="text-emerald-500 mt-0.5">{`>`}</span>
                       <span className="leading-snug">{String(reason)}</span>
                     </div>
                   ))}
                 </div>
               </div>
             )}
             <div className="bg-[#181A19] p-3 rounded-xl border border-[#E8E9E4]/10 shadow-md flex flex-col flex-1 min-h-0">
               <div className="flex justify-between items-center mb-2 border-b border-[#E8E9E4]/10 pb-1">
                 <h2 className="text-[9px] font-bold text-[#E8E9E4]/80 uppercase tracking-widest flex items-center gap-1.5"><IconGlobe className="w-3.5 h-3.5 text-blue-400" /> Live Wire</h2>
               </div>
               <div className="space-y-2 overflow-y-auto custom-scrollbar pr-1 flex-1">
                 {newsEvents.length === 0 ? <div className="text-[10px] text-[#E8E9E4]/40 italic">Generating market intel...</div> :
                   newsEvents.map((news, i) => (
                     <div key={i} className={`border-l-[2px] pl-2 py-0.5 ${news.type === 'rugpull' ? 'border-rose-500' : news.type === 'whale' ? 'border-purple-500' : 'border-indigo-500/40'}`}>
                       <span className={`text-[9px] sm:text-[10px] leading-tight ${news.type === 'rugpull' ? 'text-rose-400 font-bold' : news.type === 'whale' ? 'text-purple-300' : 'text-[#E8E9E4]/90'}`}>{String(news.title)}</span>
                     </div>
                   ))
                 }
               </div>
             </div>
          </div>
        </div>

        {/* CHART */}
        <div className="w-full bg-[#181A19] p-3 sm:p-4 rounded-xl border border-[#E8E9E4]/10 shadow-lg flex flex-col flex-1 min-h-[200px] mt-2 relative z-10">
          <div className="flex justify-between items-center mb-2 border-b border-[#E8E9E4]/10 pb-2">
            <h2 className="text-[10px] font-bold text-[#E8E9E4]/80 uppercase tracking-[0.2em] flex items-center gap-2"><IconActivity className="w-4 h-4 text-indigo-400" /> LIVE PRICE CHART</h2>
            <div className="flex items-center gap-3 text-[9px] text-[#E8E9E4]/60 bg-[#111312] px-3 py-1 rounded-lg border border-[#E8E9E4]/5">
              <label className="flex items-center gap-1 cursor-pointer hover:text-purple-400 transition-colors"><input type="checkbox" checked={showWhaleAlerts} onChange={(e) => setShowWhaleAlerts(e.target.checked)} className="accent-purple-500 w-3 h-3" /> Whale</label>
              <label className="flex items-center gap-1 cursor-pointer hover:text-purple-400 transition-colors"><input type="checkbox" checked={showRugPullAlerts} onChange={(e) => setShowRugPullAlerts(e.target.checked)} className="accent-purple-500 w-3 h-3" /> Rug Pull</label>
              <label className="flex items-center gap-1 cursor-pointer hover:text-purple-400 transition-colors"><input type="checkbox" checked={showCandles} onChange={(e) => setShowCandles(e.target.checked)} className="accent-purple-500 w-3 h-3" /> Candles</label>
              <span className="ml-1 pl-2 border-l border-[#E8E9E4]/10 opacity-50">{liveHistory.length} pts</span>
            </div>
          </div>
          <div className="flex-1 w-full h-full relative rounded-md overflow-hidden bg-[#111312]" style={{ backgroundImage: 'linear-gradient(rgba(232, 233, 228, 0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(232, 233, 228, 0.02) 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
            {liveHistory.length > 0 ? <LiveChart data={liveHistory} currentPrice={currentPrice} targetMargin={targetMargin} showCandles={showCandles} rugPullActive={showRugPullAlerts && analysis?.isRugPull} /> :
              <div className="absolute inset-0 flex items-center justify-center text-[11px] text-[#E8E9E4]/30 uppercase tracking-widest animate-pulse">Aggregating Ticks...</div>
            }
          </div>
        </div>
      </div>

      {/* CHAT */}
      <div className={`fixed bottom-4 right-4 z-50 flex flex-col items-end transition-all ${isChatOpen ? 'w-[90vw] sm:w-80' : 'w-auto'}`}>
        {isChatOpen && (
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 shadow-2xl rounded-xl w-full mb-3 overflow-hidden flex flex-col h-[60vh] sm:h-96">
            <div className="bg-[#111312] p-3 flex justify-between items-center border-b border-[#E8E9E4]/10">
              <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><IconMessage className="w-3.5 h-3.5 text-indigo-400" /> Chat w/ Tara</span>
              <button onClick={() => setIsChatOpen(false)} className="opacity-50 hover:opacity-100"><IconX className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-[#111312]/50">
              {(chatLog || []).map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <span className={`text-[10px] uppercase opacity-40 mb-1 ${msg.role === 'user' ? 'mr-1' : 'ml-1'}`}>{String(msg.role)}</span>
                  <div className={`text-xs p-2.5 rounded-lg max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'bg-indigo-500/20 text-indigo-100 border border-indigo-500/30 rounded-tr-none' : 'bg-[#2A2D2C] text-[#E8E9E4] border border-[#E8E9E4]/10 rounded-tl-none'}`}>{String(msg.text)}</div>
                </div>
              ))}
            </div>
            <div className="p-3 bg-[#111312] border-t border-[#E8E9E4]/10">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={handleChatSubmit}
                placeholder={`Ask Tara about the ${windowType.toUpperCase()} window...`} className="w-full bg-[#181A19] border border-[#E8E9E4]/20 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-indigo-400 text-white" />
            </div>
          </div>
        )}
        {!isChatOpen && <button onClick={() => setIsChatOpen(true)} className="bg-indigo-500 hover:bg-indigo-400 text-white p-3 rounded-full shadow-lg border border-indigo-400/50 flex items-center gap-2 transition-transform hover:scale-105"><IconMessage className="w-5 h-5" /></button>}
      </div>

      {/* HELP MODAL */}
      {showHelp && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181A19] border border-[#E8E9E4]/20 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar shadow-2xl">
            <div className="sticky top-0 bg-[#181A19] border-b border-[#E8E9E4]/10 p-4 flex justify-between items-center z-10">
              <h2 className="text-base sm:text-lg font-serif text-white flex items-center gap-2"><IconInfo className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" /> Tara V60 Operations Manual</h2>
              <button onClick={() => setShowHelp(false)} className="text-[#E8E9E4]/50 hover:text-white"><IconX className="w-5 h-5" /></button>
            </div>
            <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 text-xs sm:text-sm text-[#E8E9E4]/80">
              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">1. V60 Velocity Engine — Core Innovation</h3>
                <p className="mb-3 leading-relaxed">V60 fundamentally changes how Tara predicts. Instead of asking "where IS the price?" it asks "where is the price GOING and how FAST?" The Velocity Engine tracks price speed at 4 timeframes (1s, 5s, 15s, 30s), plus acceleration (is speed increasing?) and jerk (sudden momentum snaps).</p>
                <p className="mb-3 leading-relaxed border-l-2 border-emerald-500 pl-3 bg-emerald-500/5 p-2 rounded-r"><strong>Key principle:</strong> Tara only enters when ALL velocity timeframes agree on direction AND probability exceeds threshold. This eliminates coin-flip calls in choppy markets.</p>
              </section>
              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">2. PnL-Aware Cashout Timing</h3>
                <p className="mb-3 leading-relaxed">V60 tracks your peak profit and monitors PnL slope (is profit growing or shrinking). When it detects your profit peaked and momentum is reversing against you, it triggers an early "TAKE PROFIT NOW" alert — BEFORE the reversal completes. This prevents the classic "I was up $4 but waited too long" scenario.</p>
                <p className="mb-3 leading-relaxed">Similarly, loss cuts now combine ATR stops with velocity checks. If you're bleeding AND momentum is accelerating against you, V60 triggers "CUT LOSSES NOW" immediately instead of waiting for a threshold.</p>
              </section>
              <section>
                <h3 className="text-emerald-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">3. 5-Minute vs 15-Minute Strategy</h3>
                <p className="mb-3 leading-relaxed"><strong>15M Mode:</strong> Trusts slower velocities (15s, 30s). Heavier RSI mean-reversion. Needs stronger confirmation to enter (62%). Endgame lock at 90 seconds. Built for structural trades.<br/><strong>5M Mode:</strong> Trusts fast velocities (1s, 5s) with 1.5x tape flow weighting. Lower entry bar (60%). Endgame at 45 seconds. MACD histogram weighted 2x. Built for aggressive scalping. Reacts to jerk (snap moves) more heavily.</p>
              </section>
              <section>
                <h3 className="text-indigo-400 font-bold uppercase tracking-widest mb-2 text-[10px] sm:text-xs">4. Chat Commands</h3>
                <p className="leading-relaxed"><strong>"why"</strong> — Full indicator + velocity breakdown. <strong>"velocity"</strong> — Raw speed data at all timeframes + acceleration. <strong>"pnl"</strong> — Live profit, peak PnL, PnL slope, chance/risk %. <strong>"score"</strong> — Win/loss record.</p>
              </section>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(232, 233, 228, 0.1); border-radius: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(232, 233, 228, 0.2); }`}} />
    </div>
  );
}
