/**
 * Generic quick-filter logic shared across TSE market pages.
 *
 * Each filter key maps to a sort/filter operation with configurable accessor
 * names so it works for market overview, funds, prices, etc.
 */

const DEFAULT_LIMIT = 50;

/**
 * Apply a preset quick-filter to an array of rows.
 *
 * @param {Array}  data       - Source rows
 * @param {string} preset     - Active preset key (e.g. 'top-gainers')
 * @param {object} [options]  - Override accessor names & limit
 * @param {string} [options.changePctAccessor='close_change_pct']
 * @param {string} [options.volumeAccessor='volume']
 * @param {string} [options.tradesAccessor='trades']
 * @param {number} [options.limit=50]
 * @returns {Array} Filtered/sorted slice of data
 */
export function applyMarketQuickFilter(data, preset, options = {}) {
  if (!preset || !data?.length) return data;

  const {
    changePctAccessor = 'close_change_pct',
    volumeAccessor = 'volume',
    tradesAccessor = 'trades',
    limit = DEFAULT_LIMIT,
  } = options;

  switch (preset) {
    case 'top-gainers':
      return [...data]
        .filter((r) => (r[changePctAccessor] ?? 0) > 0)
        .sort((a, b) => (b[changePctAccessor] ?? 0) - (a[changePctAccessor] ?? 0))
        .slice(0, limit);
    case 'top-losers':
      return [...data]
        .filter((r) => (r[changePctAccessor] ?? 0) < 0)
        .sort((a, b) => (a[changePctAccessor] ?? 0) - (b[changePctAccessor] ?? 0))
        .slice(0, limit);
    case 'high-volume':
    case 'top-volume':
      return [...data]
        .sort((a, b) => (b[volumeAccessor] ?? 0) - (a[volumeAccessor] ?? 0))
        .slice(0, limit);
    case 'most-trades':
    case 'top-trades':
      return [...data]
        .sort((a, b) => (b[tradesAccessor] ?? 0) - (a[tradesAccessor] ?? 0))
        .slice(0, limit);
    default:
      return data;
  }
}
