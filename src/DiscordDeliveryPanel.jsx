import React from 'react';
import {recordRateText} from './discordCalls.js';

export default function DiscordDeliveryPanel({delivery,details=false}) {
  const rows=delivery.rows||[],notices=delivery.advisories||[],issues=rows.filter(r=>['uncertain','blocked','failed','expired'].includes(r.state)||r.error);
  const advisoryIssues=notices.filter(r=>['uncertain','failed'].includes(r.state));
  const pending=rows.filter(r=>['queued','retry','posting','editing'].includes(r.state)).length;
  const last=[...rows].reverse().find(r=>r.messageId),records=delivery.records||{};
  return <section aria-label="BTC Discord Call delivery" className="rounded-lg border border-[#24242E] bg-[#0A0A0E] p-3 my-3 text-xs">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-bold text-[#EDEDED]">Discord · BTC Calls + limited context</h3>
      <span className={delivery.error||issues.length||advisoryIssues.length?'text-amber-400':'text-emerald-400'}>
        {delivery.error||issues.length||advisoryIssues.length?'Needs attention':pending?`${pending} queued`:last?'Acknowledged':'Waiting for a new confirmed Call'}
      </span>
    </div>
    <a className="inline-block mt-2 text-emerald-400 underline" href="https://discord.com/channels/1492984305951965286/1493809239788097728" target="_blank" rel="noreferrer">Open tara-btc ↗</a>
    <p className="text-[#EDEDED]/60 mt-2">15m + hourly Calls first · results edit the original Call · coach/whale context: max 2 per 15m, at least 5 minutes apart, no repeated condition.</p>
    {delivery.error&&<p role="status" className="text-amber-400 mt-2">{delivery.error}</p>}
    <div className="mt-2 text-[#EDEDED]/70 space-y-1">
      {['15m','1h'].map(kind=>records[kind]&&<p key={kind}>{kind==='1h'?'Hourly':'15m'} verified retained: {recordRateText(records[kind].retained)} · recent 20: {recordRateText(records[kind].last20)}</p>)}
    </div>
    <details className="mt-2" open={details||undefined}>
      <summary className="cursor-pointer text-[#EDEDED]/60">Delivery receipts{issues.length?` · ${issues.length} need checking`:''}</summary>
      <p className="text-[#EDEDED]/40 mt-2">This browser must stay open and online. Saved queues survive refresh; other devices do not share these receipts. Unknown send outcomes are not automatically reposted. Verified Calls are not fills or account P&amp;L; sit-outs, edits and unverified results are excluded.</p>
      {delivery.archivedAdvisoryUncertain>0&&<p className="text-amber-400 mt-1">{delivery.archivedAdvisoryUncertain} older context receipts remain unconfirmed; no automatic repost. Original Call receipts are retained separately.</p>}
      <div className="space-y-2 mt-2 max-h-60 overflow-y-auto">
        {(!rows.length)&&<p className="text-[#EDEDED]/40">No new Calls queued since this feed was activated. Historical Calls are not blasted.</p>}
        {[...rows].reverse().slice(0,30).map(r=><div key={r.key} className="border-t border-[#24242E] pt-2 text-[#EDEDED]/70">
          <span>{r.call.kind==='1h'?'Hourly':'15m'} {r.call.dir} · {r.state}{r.call.result?` · ${r.call.result}`:''}</span>
          {r.messageId&&<a className="ml-2 text-emerald-400 underline" href={`https://discord.com/channels/1492984305951965286/${r.channelId}/${r.messageId}`} target="_blank" rel="noreferrer">Original Call ↗</a>}
          {r.error&&<p className="text-amber-400 mt-1">{r.error}</p>}
        </div>)}
        {[...notices].reverse().slice(0,8).map(r=><div key={r.key} className="border-t border-[#24242E] pt-2 text-[#EDEDED]/60">
          <span>{r.family} context · {r.state} · {r.title}</span>
          {r.messageId&&<a className="ml-2 text-emerald-400 underline" href={`https://discord.com/channels/1492984305951965286/${r.channelId}/${r.messageId}`} target="_blank" rel="noreferrer">Context ↗</a>}
          {r.error&&<p className="text-amber-400 mt-1">{r.error}</p>}
        </div>)}
      </div>
    </details>
  </section>;
}
