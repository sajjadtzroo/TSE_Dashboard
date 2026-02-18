/**
 * Single coin detail page hook.
 * Combines crypto detail and OHLCV history for a given symbol and interval.
 */
import { useCryptoDetail, useCryptoHistory } from './useCryptoData';

export default function useCoinDetailData(symbol, { interval = '1day' } = {}) {
  const {
    data: detail = null,
    isLoading: detailLoading,
    isError: detailError,
  } = useCryptoDetail(symbol);

  const {
    data: history = [],
    isLoading: historyLoading,
    isError: historyError,
  } = useCryptoHistory(symbol, { interval });

  return {
    detail,
    history,
    isLoading: detailLoading || historyLoading,
    isError: detailError || historyError,
  };
}
