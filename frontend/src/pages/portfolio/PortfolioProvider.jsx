import { createContext, useContext, useMemo, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import axios from 'axios';
import { useMarketOverview, useMarketIndexHistory } from '../../hooks/useMarketData';
import { useCryptoMarket } from '../../hooks/useCryptoData';
import usePortfolio from '../../hooks/usePortfolio';
import { TEDPIX_NAMES } from '../../constants/market';
import { computeAllMetrics } from '../../utils/riskMetrics/index.js';
import { computeSimpleReturns, alignReturnSeries } from '../../utils/riskMetrics/returns.js';
import AddHoldingModal from './AddHoldingModal';

const api = axios.create({ baseURL: '/api' });
const HISTORY_DAYS = 365;

const PortfolioContext = createContext(null);

export function usePortfolioContext() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolioContext must be used inside PortfolioProvider');
  return ctx;
}

export default function PortfolioProvider() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editHolding, setEditHolding] = useState(null);

  const { holdings, addHolding, updateHolding, removeHolding, totalCost } = usePortfolio();

  const { data: market = [], isLoading: marketLoading } = useMarketOverview({
    limit: 5000,
    refetchInterval: 2 * 60 * 1000,
  });

  const { data: cryptoMarket = [] } = useCryptoMarket({
    refetchInterval: 2 * 60 * 1000,
  });

  // Enrich holdings with live prices (TSE + crypto)
  const enriched = useMemo(() => {
    const totalValue = holdings.reduce((sum, h) => {
      const isCrypto = h.market_type === 'crypto';
      if (isCrypto) {
        const live = cryptoMarket.find((m) => m.symbol === h.symbol);
        return sum + h.quantity * (live?.last_price ?? h.buyPrice);
      }
      const live = market.find((m) => m.symbol === h.symbol);
      return sum + h.quantity * (live?.close ?? h.buyPrice);
    }, 0);

    return holdings.map((h) => {
      const isCrypto = h.market_type === 'crypto';
      let currentPrice, liveData;

      if (isCrypto) {
        const live = cryptoMarket.find((m) => m.symbol === h.symbol);
        currentPrice = live?.last_price ?? h.buyPrice;
        liveData = live
          ? { ...live, close_change_pct: live.price_change_pct_24h }
          : {};
      } else {
        const live = market.find((m) => m.symbol === h.symbol);
        currentPrice = live?.close ?? h.buyPrice;
        liveData = live || {};
      }

      const value = h.quantity * currentPrice;
      const cost = h.quantity * h.buyPrice;
      const pnl = value - cost;
      const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
      return {
        ...liveData,
        symbol: h.symbol,
        market_type: h.market_type || 'tse',
        quantity: h.quantity,
        buyPrice: h.buyPrice,
        addedAt: h.addedAt,
        currentPrice,
        value,
        cost,
        pnl,
        pnlPct,
        weight,
      };
    });
  }, [holdings, market, cryptoMarket]);

  // Per-holding 365-day history (routes TSE vs crypto)
  const stockHistories = useQueries({
    queries: holdings.map((h) => {
      const isCrypto = h.market_type === 'crypto';
      return {
        queryKey: [isCrypto ? 'crypto-history' : 'stock-history', h.symbol, HISTORY_DAYS],
        queryFn: () => {
          if (isCrypto) {
            return api
              .get(`/crypto/${encodeURIComponent(h.symbol)}/history`, {
                params: { interval: '1day', limit: HISTORY_DAYS },
              })
              .then((r) =>
                (r.data || []).map((d) => ({
                  date: (d.open_time || '').split('T')[0],
                  close: d.close,
                  open: d.open,
                  high: d.high,
                  low: d.low,
                  volume: d.volume,
                })),
              );
          }
          return api
            .get(`/stocks/${encodeURIComponent(h.symbol)}/history`, {
              params: { days: HISTORY_DAYS },
            })
            .then((r) => r.data);
        },
        enabled: holdings.length > 0 && !!h.symbol,
        staleTime: 5 * 60 * 1000,
      };
    }),
  });

  // TEDPIX benchmark
  const { data: benchHistory = [] } = useMarketIndexHistory(TEDPIX_NAMES[0], { days: HISTORY_DAYS });

  // Per-stock metrics
  const perStockMetrics = useMemo(() => {
    return holdings.map((h, i) => {
      const history = stockHistories[i]?.data;
      if (!history || history.length < 10) return { symbol: h.symbol, metrics: null };
      const metrics = computeAllMetrics({
        stockHistory: history,
        benchHistory: benchHistory.length > 0 ? benchHistory : null,
      });
      return { symbol: h.symbol, metrics };
    });
  }, [holdings, stockHistories, benchHistory]);

  // Portfolio-level daily return series (weighted sum of per-stock daily returns)
  const portfolioReturns = useMemo(() => {
    if (!holdings.length) return { returns: [], dates: [] };

    // Build dateMap: date → { symbol: return }
    const returnSeries = holdings.map((h, i) => {
      const history = stockHistories[i]?.data;
      if (!history || history.length < 2) return [];
      return computeSimpleReturns(history);
    });

    const dateMap = new Map();
    returnSeries.forEach((series, i) => {
      series.forEach((r) => {
        if (!dateMap.has(r.date)) dateMap.set(r.date, {});
        dateMap.get(r.date)[holdings[i].symbol] = r.ret;
      });
    });

    const sortedDates = [...dateMap.keys()].sort();
    const weights = {};
    enriched.forEach((e) => { weights[e.symbol] = e.weight / 100; });

    const returns = [];
    const dates = [];
    for (const date of sortedDates) {
      const dayReturns = dateMap.get(date);
      let portfolioRet = 0;
      let totalWeight = 0;
      for (const h of holdings) {
        if (dayReturns[h.symbol] != null) {
          const w = weights[h.symbol] || 0;
          portfolioRet += w * dayReturns[h.symbol];
          totalWeight += w;
        }
      }
      if (totalWeight > 0) {
        returns.push(portfolioRet / totalWeight);
        dates.push(date);
      }
    }

    return { returns, dates };
  }, [holdings, stockHistories, enriched]);

  // Benchmark return series (for alignment with portfolio)
  const benchReturnSeries = useMemo(() => {
    if (!benchHistory.length) return [];
    const benchForReturns = benchHistory
      .filter((b) => b.close != null)
      .map((b) => ({ date: b.date, close: b.close }));
    return computeSimpleReturns(benchForReturns);
  }, [benchHistory]);

  // Modal handlers
  const openModal = (holding = null) => {
    setEditHolding(holding);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditHolding(null);
  };

  const handleAdd = (symbol, quantity, buyPrice, marketType = 'tse') => {
    if (editHolding) {
      updateHolding(symbol, { quantity, buyPrice });
    } else {
      addHolding(symbol, quantity, buyPrice, marketType);
    }
  };

  const value = {
    holdings,
    enriched,
    market,
    cryptoMarket,
    marketLoading,
    totalCost,
    removeHolding,
    stockHistories,
    benchHistory,
    benchReturnSeries,
    perStockMetrics,
    portfolioReturns,
    openModal,
    closeModal,
  };

  return (
    <PortfolioContext.Provider value={value}>
      <Outlet />
      <AddHoldingModal
        opened={modalOpen}
        onClose={closeModal}
        onAdd={handleAdd}
        editHolding={editHolding}
        market={market}
        cryptoMarket={cryptoMarket}
      />
    </PortfolioContext.Provider>
  );
}
