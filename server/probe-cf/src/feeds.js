// Feeds Tara's browser app uses today (src/App.jsx v14.7.13), checked from a
// Cloudflare Durable Object. Cadences mirror the app, slowed slightly to stay
// polite: spot is 1.5s in the app, 5s here.
const nowSec = () => Math.floor(Date.now() / 1000);
const isNum = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
const okxFirst = (d) => d?.code === '0' && Array.isArray(d.data) && d.data.length > 0;

// [name, role, intervalMs, url, check(json) -> bool]
// role: decision = changes Calls; context = smaller score input;
// info = only explains a block.
export const REST = [
  ['coinbase-ticker', 'decision', 5000, 'https://api.exchange.coinbase.com/products/BTC-USD/ticker', (d) => isNum(d?.price)],
  ['coinbase-candles-1m', 'decision', 30000, 'https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60', (d) => Array.isArray(d) && d.length > 30],
  ['coinbase-spot-v2', 'context', 10000, 'https://api.coinbase.com/v2/prices/BTC-USD/spot', (d) => isNum(d?.data?.amount)],
  ['kraken-ticker', 'decision', 5000, 'https://api.kraken.com/0/public/Ticker?pair=XBTUSD', (d) => Array.isArray(d?.error) && d.error.length === 0 && !!d.result],
  ['kraken-ohlc-1m', 'decision', 30000, 'https://api.kraken.com/0/public/OHLC?pair=XBTUSD&interval=1', (d) => Array.isArray(d?.error) && d.error.length === 0 && !!d.result],
  ['okx-ticker', 'decision', 5000, 'https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT', okxFirst],
  ['okx-candles-1m', 'decision', 30000, 'https://www.okx.com/api/v5/market/candles?instId=BTC-USDT&bar=1m&limit=300', okxFirst],
  ['okx-mark-price', 'decision', 10000, 'https://www.okx.com/api/v5/public/mark-price?instType=SWAP&instId=BTC-USDT-SWAP', okxFirst],
  ['okx-index-ticker', 'decision', 10000, 'https://www.okx.com/api/v5/market/index-tickers?instId=BTC-USD', okxFirst],
  ['okx-funding-rate', 'decision', 10000, 'https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP', okxFirst],
  ['okx-open-interest', 'decision', 10000, 'https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP', okxFirst],
  ['okx-long-short', 'context', 60000, 'https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=5m', okxFirst],
  ['okx-swap-books', 'decision', 5000, 'https://www.okx.com/api/v5/market/books?instId=BTC-USDT-SWAP&sz=50', okxFirst],
  ['okx-swap-trades-rest', 'candidate', 5000, 'https://www.okx.com/api/v5/market/trades?instId=BTC-USDT-SWAP&limit=100', okxFirst],
  ['bybit-ticker', 'decision', 5000, 'https://api.bybit.com/v5/market/tickers?category=linear&symbol=BTCUSDT', (d) => d?.retCode === 0 && d?.result?.list?.length > 0],
  ['bybit-kline', 'context', 30000, 'https://api.bybit.com/v5/market/kline?category=linear&symbol=BTCUSDT&interval=1&limit=200', (d) => d?.retCode === 0],
  ['binance-futures-rest', 'info', 60000, 'https://fapi.binance.com/fapi/v1/ticker/price?symbol=BTCUSDT', (d) => isNum(d?.price)],
  ['kalshi-15m-events', 'decision', 10000, () => `https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXBTC15M&with_nested_markets=true&status=open&limit=50&min_close_ts=${nowSec()}`, (d) => Array.isArray(d?.events)],
  ['kalshi-15m-events-external', 'decision', 10000, () => `https://external-api.kalshi.com/trade-api/v2/events?series_ticker=KXBTC15M&with_nested_markets=true&status=open&limit=50&min_close_ts=${nowSec()}`, (d) => Array.isArray(d?.events)],
  ['kalshi-hourly-events', 'context', 60000, () => `https://api.elections.kalshi.com/trade-api/v2/events?series_ticker=KXBTCD&with_nested_markets=true&status=open&limit=20&min_close_ts=${nowSec()}`, (d) => Array.isArray(d?.events)],
  ['deribit-options', 'context', 180000, 'https://www.deribit.com/api/v2/public/get_book_summary_by_currency?currency=BTC&kind=option', (d) => Array.isArray(d?.result)],
  ['tara-economic-calendar', 'context', 300000, 'https://taracalls.pages.dev/api/economic-calendar', (d) => !!d && typeof d === 'object'],
  ['tara-liq', 'context', 120000, 'https://taracalls.pages.dev/api/liq', (d) => !!d && typeof d === 'object'],
];

// Trade streams. Binance and Bybit feed Tara's tape today; OKX, Coinbase and
// Kraken are replacements if those block servers. Only two are open at once
// (see ROTATION) to keep message volume inside the free plan.
export const WS = {
  'binance-futures-aggTrade': { role: 'decision', url: 'https://fstream.binance.com/ws/btcusdt@aggTrade',
    isTrade: (m) => m?.e === 'aggTrade' },
  'bybit-linear-publicTrade': { role: 'decision', url: 'https://stream.bybit.com/v5/public/linear',
    subscribe: { op: 'subscribe', args: ['publicTrade.BTCUSDT'] }, ping: { op: 'ping' }, pingMs: 20000,
    isTrade: (m) => m?.topic === 'publicTrade.BTCUSDT' && Array.isArray(m.data) },
  'okx-swap-trades': { role: 'candidate', url: 'https://ws.okx.com:8443/ws/v5/public',
    subscribe: { op: 'subscribe', args: [{ channel: 'trades', instId: 'BTC-USDT-SWAP' }] }, ping: 'ping', pingMs: 20000,
    isTrade: (m) => m?.arg?.channel === 'trades' && Array.isArray(m.data) },
  'coinbase-matches': { role: 'candidate', url: 'https://ws-feed.exchange.coinbase.com',
    subscribe: { type: 'subscribe', product_ids: ['BTC-USD'], channels: ['matches'] },
    isTrade: (m) => m?.type === 'match' || m?.type === 'last_match' },
  'kraken-trade-v2': { role: 'candidate', url: 'https://ws.kraken.com/v2',
    subscribe: { method: 'subscribe', params: { channel: 'trade', symbol: ['BTC/USD'] } }, ping: { method: 'ping' }, pingMs: 30000,
    isTrade: (m) => m?.channel === 'trade' && Array.isArray(m.data) },
};

// 15-minute slots, cycling. Bybit is in two of three slots because it is the
// stream Tara's tape actually depends on today (Binance sends nothing to US IPs).
export const ROTATION = [
  ['binance-futures-aggTrade', 'bybit-linear-publicTrade'],
  ['okx-swap-trades', 'coinbase-matches'],
  ['kraken-trade-v2', 'bybit-linear-publicTrade'],
];
export const SLOT_MS = 15 * 60 * 1000;
export const activeStreams = (now = Date.now()) => ROTATION[Math.floor(now / SLOT_MS) % ROTATION.length];
