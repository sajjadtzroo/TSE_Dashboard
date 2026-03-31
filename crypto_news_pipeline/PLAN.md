# Crypto News Sentiment Pipeline — Improvement Plan

> Created: 2026-03-31
> Status: Phase 0 complete, ready for Phase A

---

## Current State

### What's Built
- Full pipeline: `fetcher.py` → `cleaner.py` → `sentiment.py` → `embedder.py` → `store.py`
- FinBERT + CryptoBERT sentiment scoring (local CPU inference, ~151ms/chunk)
- MinIO storage for raw articles, PostgreSQL + pgvector for chunks/embeddings
- CLI entry point with run-once, watch, query, coin sentiment commands
- Backtest script with 10 landmark events + CryptoPanic history support

### Backtest Results (10 Landmark Events, FinBERT only)
- Overall accuracy: **49%** (coin flip)
- SEC/Legal: **77.8%** — strong signal
- ETF/Institutional: **77.8%** — strong signal
- Hack/Security: **66.7%** — moderate signal
- Exchange: **58.3%** — moderate signal
- Regulatory: **53.3%** — moderate signal
- Adoption: **50.0%** — noise
- Macro/Treasury: **16.7%** — inversely correlated with crypto
- Market/Trading: **0%** — already priced in
- Protocol/Technical: **0%** — sell-the-news effect

### Key Insight
FinBERT correctly reads text sentiment (~80% of the time). The problem is **sentiment != price direction**. Positive news about an anticipated event (halving, merge, ETF) often causes a sell-off. This is a market dynamics problem, not a text classification problem.

---

## Architecture: Three-Layer Approach

```
Layer 1: Sentiment Extraction (DONE)
  FinBERT / CryptoBERT → sentiment_score, confidence
  Keep as-is. These models are good at reading text tone.

Layer 2: Price Direction Classifier (TO BUILD — Phase A + B)
  XGBoost model that takes features → predicts price direction
  Features: sentiment + category + market context + anticipation signal
  This is where the real accuracy gain comes from.

Layer 3: Category-Specific Rules (TO BUILD — Phase B)
  Hard-coded rules from backtest findings:
    - SEC/legal, hack: trust sentiment directly
    - Protocol/technical: invert sentiment (sell the news)
    - Macro/treasury: ignore or use as contrarian
    - Anticipated events: expect short-term reversal
```

---

## Phase A: Generate Labeled Training Data

**Goal**: Create a dataset of (features, price_direction) pairs from historical data.

**Input sources**:
- CryptoPanic API — paginate backwards for months of historical articles
- crypto_ohlcv table — 110,720 daily candles, 2017-2026 for 40+ coins
- crypto_global_metrics — fear/greed index, BTC dominance, market cap

**Steps**:

1. **Fetch historical articles from CryptoPanic** (free tier, paginate ~50-100 pages)
   - Store: title, published_at, source domain, currencies mentioned, CryptoPanic votes
   - Estimated yield: 1,000-3,000 articles with coin mentions

2. **Score each article** with FinBERT/CryptoBERT
   - sentiment_score, confidence, model_used

3. **Categorize each article** using keyword classifier
   - sec_legal, regulatory, macro_treasury, hack_security, exchange,
     etf_institutional, protocol_technical, adoption, market_trading

4. **Add market context features** from DB at time of publication:
   - btc_trend_30d: % change of BTC over prior 30 days (bull/bear regime)
   - volume_change_24h: was volume spiking?
   - fear_greed_value: from crypto_global_metrics (if available for that date)
   - btc_dominance: from crypto_global_metrics
   - is_anticipated: flag if keywords match known scheduled events

5. **Label with actual price direction** from crypto_ohlcv:
   - For each mentioned coin, look up close price at T+1d, T+3d, T+7d
   - Label: "up" (>+1%), "down" (<-1%), "flat" (in between)
   - Also store raw pct_change for regression

6. **Output**: CSV/Parquet file with ~2,000-5,000 labeled rows

**File**: `crypto_news_pipeline/training/generate_dataset.py`

**Estimated run time**: ~30-60 minutes (CryptoPanic rate limits + sentiment inference)

---

## Phase B: Train Price Direction Model

**Goal**: XGBoost classifier that predicts price direction from features.

**Input features** (per article-coin pair):
```
- sentiment_score          float    (-1 to +1)
- confidence               float    (0 to 1)
- model_used               onehot   (finbert, cryptobert)
- category_*               onehot   (9 categories)
- is_anticipated           bool
- source_weight            float    (0.5 to 1.0)
- btc_trend_30d            float    (% change)
- fear_greed_value         int      (0-100, if available)
- btc_dominance            float    (%, if available)
- day_of_week              int      (0-6)
- cryptopanic_votes_pos    int
- cryptopanic_votes_neg    int
```

**Target**: price direction at +1d, +3d, +7d (three separate models or multi-output)

**Training approach**:
- XGBoost classifier (fast, handles small datasets well, interpretable)
- 80/20 train/test split, stratified by category
- Cross-validate with 5 folds
- Hyperparameter tune: max_depth, n_estimators, learning_rate
- Feature importance analysis — which features actually matter?

**Evaluation metrics**:
- Accuracy per category (compare against baseline: always predict "flat")
- Precision/recall for "up" and "down" (we care more about directional calls)
- Profit simulation: if we traded on every signal, what's the P&L?

**Expected outcome**:
- Overall accuracy: 55-65% (meaningful edge over 49% baseline)
- SEC/legal + hack categories: 70-80%
- Protocol/macro categories: better than 0% via feature engineering

**File**: `crypto_news_pipeline/training/train_model.py`
**Model output**: `crypto_news_pipeline/models/price_direction_1d.joblib` (etc.)

**Estimated run time**: Training takes ~10 seconds on CPU. Tuning ~2 minutes.

---

## Phase C: Fine-Tune FinBERT on Crypto Text (Optional)

**Goal**: Improve sentiment accuracy on crypto-specific language.

**When to do this**: Only if Phase B analysis shows sentiment_score has low feature importance or the raw sentiment labels are frequently wrong.

**Approach**: LoRA (Low-Rank Adaptation)
- Trains only ~1% of model parameters (2-4M vs 110M total)
- Feasible on CPU with 32GB RAM (slow but works)
- Preserves FinBERT's financial knowledge while adapting to crypto

**Training data needed**:
- 500-1,000 crypto news sentences manually labeled as positive/negative/neutral
- OR use CryptoPanic community votes as weak labels (noisy but free)
- OR use GPT-4o to label a batch (costs ~$2 for 1,000 labels)

**Tools**: PEFT library (HuggingFace), Trainer API

**Files**:
- `crypto_news_pipeline/training/finetune_finbert.py`
- `crypto_news_pipeline/training/label_data.py` (for generating labels)
- Output: `crypto_news_pipeline/models/finbert-crypto-lora/`

**Estimated time**: 2-4 hours training on CPU, 1-2 hours to build scripts

---

## Phase D: Integration & Live Testing

**Goal**: Wire the trained model into the live pipeline.

**Steps**:

1. Update `sentiment.py` to load the XGBoost price direction model
2. Add `predict_price_direction(chunk) -> dict` alongside sentiment scoring
3. Update `store.py` schema: add `predicted_direction`, `direction_confidence` columns
4. Update `pipeline.py` to run prediction after sentiment scoring
5. Add `--backtest-live` flag to main.py for ongoing accuracy tracking
6. Add a scheduler job to run pipeline every 5 minutes (wire into existing scheduler)

**Monitoring**:
- Log every prediction with actual outcome after T+1d/3d/7d
- Weekly accuracy report auto-generated
- Alert if accuracy drops below 55% over rolling 50 predictions

---

## File Structure After All Phases

```
crypto_news_pipeline/
  config.py
  fetcher.py
  cleaner.py
  sentiment.py          # FinBERT/CryptoBERT (unchanged)
  embedder.py
  store.py              # + predicted_direction columns
  pipeline.py           # + price direction prediction step
  main.py
  backtest.py
  training/
    generate_dataset.py   # Phase A
    train_model.py        # Phase B
    finetune_finbert.py   # Phase C (optional)
    label_data.py         # Phase C (optional)
  models/
    finbert/              # cached FinBERT weights
    cryptobert/           # cached CryptoBERT weights (to download)
    price_direction_1d.joblib   # Phase B output
    price_direction_3d.joblib
    price_direction_7d.joblib
    finbert-crypto-lora/        # Phase C output (optional)
  data/
    training_dataset.csv        # Phase A output
    backtest_results.json       # current backtest output
```

---

## Priority Order

| Priority | Phase | Effort | Expected Impact |
|----------|-------|--------|-----------------|
| 1        | A — Generate training data | 1 hour build, 30-60 min run | Unlocks everything else |
| 2        | B — Train XGBoost | 1 hour build, 2 min train | +10-15% accuracy |
| 3        | D — Integration | 2 hours | Makes it usable in production |
| 4        | C — FinBERT fine-tune | 3 hours build, 4 hours train | +5% accuracy (maybe) |

---

## Dependencies & Prerequisites

- [x] Python 3.11+ with torch, transformers, tiktoken
- [x] FinBERT downloaded to local cache
- [ ] CryptoBERT downloaded (will happen on first use with informal source)
- [x] PostgreSQL with crypto_ohlcv data (110k candles, 2017-2026)
- [x] MinIO running
- [ ] CryptoPanic API key (needed for Phase A data collection)
- [ ] scikit-learn, xgboost, joblib (Phase B — pip install)

---

## Open Questions

1. **CryptoPanic free tier limits** — How many pages can we paginate back? Need to test.
   If insufficient, consider: NewsAPI history, or scraping RSS archive via Wayback Machine.

2. **CryptoBERT value** — We haven't tested it yet. Should run backtest with informal
   sources routed to CryptoBERT before deciding if Phase C is needed.

3. **Labeling threshold** — Currently using +/-1% as up/down cutoff. May need tuning
   per coin (BTC 1% is normal, SOL 1% is nothing).

4. **Multi-coin articles** — An article mentioning BTC and ETH creates two training
   samples. Should they share the same label or be independent?
   Decision: Independent — each coin has its own price movement.
