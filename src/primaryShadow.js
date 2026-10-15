// An advisory view of the already-computed primary analysis, NOT a second
// engine, confirmation source, committed Call, or cross-asset signal.
export function primaryShadowView({analysis,asset='BTC',price,strike,ticker,closeTime,windowId,ready,spotAt,now=Date.now()}) {
  const p=analysis?.rawProbAbove;
  if(!analysis||analysis.prediction==='ERROR'||analysis.regime==='ERROR'||
    typeof p!=='number'||!Number.isFinite(p)||p<0||p>100||!(price>0)||!windowId||ready!==true||
    !(spotAt>0)||spotAt>now+2000||now-spotAt>15000)return null;
  const dir=p>=55?'UP':p<=45?'DOWN':'NEUTRAL';
  return {asset,mode:'primary-mirror',leanDir:dir,confidence:dir==='DOWN'?100-p:dir==='UP'?p:50,
    posterior:p,strike:Number(strike)||0,currentPrice:price,regime:analysis.regime||'',
    marketTicker:ticker||null,marketCloseTime:closeTime||null,windowId,
    committedDir:null,committedAt:null,sampleCount:0,conviction:Math.abs(p-50),
    atrBps:Number(analysis.atrBps)||0,updatedAt:spotAt,evaluatedAt:now};
}
