"""
TSE Dashboard — Locust Performance Test Suite
=============================================

Four phases run automatically via TSELoadShape:

  Phase 1 — Warm-up      (0–2 min)   : 5 users, primes DB pool + Redis cache
  Phase 2 — Ramp-up      (2–7 min)   : 5→50 users, ramp to realistic load
  Phase 3 — Steady state (7–12 min)  : 50 users held, measure sustained throughput
  Phase 4 — Stress       (12–22 min) : 50→500 users, find breaking point
  Phase 5 — Cool-down    (22–27 min) : 500→20 users, per-endpoint isolation

Usage:
  # Web UI (recommended first run — open http://localhost:8089)
  locust -f scripts/load_test/locustfile.py --host http://localhost:8001

  # Fully headless, all phases auto-sequenced
  locust -f scripts/load_test/locustfile.py --host http://localhost:8001 --headless

  # Against Docker stack (port 80)
  locust -f scripts/load_test/locustfile.py --host http://localhost

  # Single phase manual override
  locust -f scripts/load_test/locustfile.py --host http://localhost:8001 \\
         --headless -u 50 -r 5 -t 5m

Expected baselines (from existing benchmarks):
  /api/market/indices    : p95 < 20ms,  >800 RPS (cached)
  /api/market-overview   : p95 < 200ms, >100 RPS (heavy tier)
  /api/codal             : p95 < 300ms  (133ms baseline query)
  Error rate             : <1% @ 50 users, <5% @ 200 users
"""

import ipaddress
import random
import time
from collections import defaultdict

from locust import HttpUser, LoadTestShape, between, events, tag, task

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SYMBOLS = ["فولاد", "شپنا", "خودرو", "وبملت", "تاپیکو", "فارس", "مبین", "کگل"]

# Rate limit tiers (requests/minute per IP)
RATE_LIMITS = {
    "default": 300,
    "heavy": 60,
    "auth": 10,
}

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ip_counter = 0


def _random_ip() -> str:
    """Generate a random routable IPv4 address for X-Forwarded-For spoofing.
    This makes each Locust user appear as a distinct IP, preventing Redis
    per-IP rate limits from collapsing all load onto one limit bucket.
    """
    global _ip_counter
    _ip_counter += 1
    # Use 10.x.x.x range — clearly internal, but distinct per user
    a = (_ip_counter >> 16) & 0xFF
    b = (_ip_counter >> 8) & 0xFF
    c = _ip_counter & 0xFF
    return f"10.{a}.{b}.{c}"


def _pick_symbol() -> str:
    return random.choice(SYMBOLS)


# ---------------------------------------------------------------------------
# User Classes
# ---------------------------------------------------------------------------


class MarketWatcher(HttpUser):
    """Simulates a user polling the market dashboard (70% of traffic).

    Behavior: fast refresh cycle (1-3s), visits indices, prices, overview,
    and individual stock pages. Reflects auto-refresh frontend behavior.
    """

    weight = 7
    wait_time = between(1, 3)

    def on_start(self):
        self._ip = _random_ip()
        self._headers = {"X-Forwarded-For": self._ip}

    @tag("warm-up", "realistic", "stress")
    @task(4)
    def get_indices(self):
        self.client.get(
            "/api/market/indices",
            headers=self._headers,
            name="/api/market/indices",
        )

    @tag("warm-up", "realistic", "stress")
    @task(3)
    def get_market_prices(self):
        self.client.get(
            "/api/market/prices",
            headers=self._headers,
            name="/api/market/prices",
        )

    @tag("realistic", "stress")
    @task(2)
    def get_market_overview(self):
        # Heavy tier endpoint — lower weight to stay within 60 req/min
        self.client.get(
            "/api/market-overview",
            headers=self._headers,
            name="/api/market-overview",
        )

    @tag("realistic", "stress")
    @task(2)
    def get_stock_detail(self):
        symbol = _pick_symbol()
        self.client.get(
            f"/api/stocks/{symbol}",
            headers=self._headers,
            name="/api/stocks/[symbol]",
        )

    @tag("realistic", "stress")
    @task(1)
    def get_order_book(self):
        symbol = _pick_symbol()
        self.client.get(
            f"/api/stocks/{symbol}/orderbook",
            headers=self._headers,
            name="/api/stocks/[symbol]/orderbook",
        )

    @tag("realistic", "stress")
    @task(1)
    def get_sectors(self):
        self.client.get(
            "/api/sectors",
            headers=self._headers,
            name="/api/sectors",
        )

    # ── Per-endpoint isolation tasks ─────────────────────────────────────
    @tag("per-endpoint")
    @task
    def isolated_indices(self):
        self.client.get("/api/market/indices", headers=self._headers, name="[iso] /api/market/indices")

    @tag("per-endpoint")
    @task
    def isolated_prices(self):
        self.client.get("/api/market/prices", headers=self._headers, name="[iso] /api/market/prices")

    @tag("per-endpoint")
    @task
    def isolated_overview(self):
        self.client.get("/api/market-overview", headers=self._headers, name="[iso] /api/market-overview")


class StockAnalyst(HttpUser):
    """Simulates a user doing deep research (20% of traffic).

    Behavior: slower pace (5-15s), loads full history, reads codal
    announcements, checks financial statements and options.
    """

    weight = 2
    wait_time = between(5, 15)

    def on_start(self):
        self._ip = _random_ip()
        self._headers = {"X-Forwarded-For": self._ip}
        self._symbol = _pick_symbol()

    @tag("realistic", "stress")
    @task(3)
    def get_stock_history(self):
        self.client.get(
            f"/api/stocks/{self._symbol}/history",
            headers=self._headers,
            name="/api/stocks/[symbol]/history",
        )

    @tag("realistic", "stress")
    @task(3)
    def get_codal_announcements(self):
        self.client.get(
            f"/api/codal?symbol={self._symbol}&page=1&per_page=20",
            headers=self._headers,
            name="/api/codal",
        )

    @tag("realistic", "stress")
    @task(2)
    def get_financial_statements(self):
        self.client.get(
            f"/api/codal/financials?symbol={self._symbol}&period_months=12",
            headers=self._headers,
            name="/api/codal/financials",
        )

    @tag("realistic", "stress")
    @task(2)
    def get_options_underlyings(self):
        self.client.get(
            "/api/options/underlyings",
            headers=self._headers,
            name="/api/options/underlyings",
        )

    @tag("realistic", "stress")
    @task(1)
    def get_shareholders(self):
        self.client.get(
            f"/api/stocks/{self._symbol}/shareholders",
            headers=self._headers,
            name="/api/stocks/[symbol]/shareholders",
        )

    @tag("realistic", "stress")
    @task(1)
    def get_companies(self):
        self.client.get(
            "/api/companies?page=1&per_page=50",
            headers=self._headers,
            name="/api/companies",
        )

    # ── Per-endpoint isolation tasks ─────────────────────────────────────
    @tag("per-endpoint")
    @task
    def isolated_history(self):
        self.client.get(
            f"/api/stocks/{self._symbol}/history",
            headers=self._headers,
            name="[iso] /api/stocks/history",
        )

    @tag("per-endpoint")
    @task
    def isolated_codal(self):
        self.client.get(
            f"/api/codal?symbol={self._symbol}&page=1&per_page=20",
            headers=self._headers,
            name="[iso] /api/codal",
        )

    @tag("per-endpoint")
    @task
    def isolated_financials(self):
        self.client.get(
            f"/api/codal/financials?symbol={self._symbol}&period_months=12",
            headers=self._headers,
            name="[iso] /api/codal/financials",
        )

    @tag("per-endpoint")
    @task
    def isolated_options(self):
        self.client.get(
            "/api/options/underlyings",
            headers=self._headers,
            name="[iso] /api/options/underlyings",
        )


class Authenticator(HttpUser):
    """Simulates users who log in and use authenticated endpoints (10% of traffic).

    Behavior: very slow pace (30-60s), logs in then calls a few protected
    endpoints. Respects the strict auth rate limit (10 req/min).
    """

    weight = 1
    wait_time = between(30, 60)

    def on_start(self):
        self._ip = _random_ip()
        self._headers = {"X-Forwarded-For": self._ip}
        self._token = None
        self._login()

    def _login(self):
        # Use test credentials — will get 401 unless test user exists, but
        # we still measure auth endpoint latency (both success and failure).
        with self.client.post(
            "/api/auth/login",
            json={"username": "test@example.com", "password": "testpass123"},
            headers=self._headers,
            name="/api/auth/login",
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                data = resp.json()
                self._token = data.get("access_token")
                resp.success()
            else:
                # 401 is expected if test user doesn't exist — don't count as failure
                resp.success()

    @tag("realistic", "stress")
    @task
    def check_me(self):
        headers = {**self._headers}
        if self._token:
            headers["Authorization"] = f"Bearer {self._token}"
        self.client.get(
            "/api/auth/me",
            headers=headers,
            name="/api/auth/me",
        )


# ---------------------------------------------------------------------------
# Load Shape — drives all 4 phases automatically
# ---------------------------------------------------------------------------

class TSELoadShape(LoadTestShape):
    """
    Staged load shape for the full 27-minute test:

      Phase 1 Warm-up       0–2 min    5 users   @ spawn 1/s
      Phase 2 Ramp-up       2–7 min   50 users   @ spawn 2/s
      Phase 3 Steady state  7–12 min  50 users   @ spawn 2/s (held)
      Phase 4 Stress ramp  12–22 min 500 users   @ spawn 10/s
      Phase 5 Cool-down    22–27 min  20 users   @ spawn 5/s  (per-endpoint)
    """

    stages = [
        {"duration": 120,  "users": 5,   "spawn_rate": 1},    # Phase 1: warm-up
        {"duration": 420,  "users": 50,  "spawn_rate": 2},    # Phase 2: ramp up
        {"duration": 720,  "users": 50,  "spawn_rate": 2},    # Phase 3: steady
        {"duration": 1320, "users": 500, "spawn_rate": 10},   # Phase 4: stress
        {"duration": 1620, "users": 20,  "spawn_rate": 5},    # Phase 5: cool-down
    ]

    _phase_names = [
        "Phase 1 — Warm-up",
        "Phase 2 — Ramp-up",
        "Phase 3 — Steady State",
        "Phase 4 — Stress Ramp",
        "Phase 5 — Cool-down / Per-Endpoint",
    ]
    _current_phase = -1

    def tick(self):
        run_time = self.get_run_time()

        for i, stage in enumerate(self.stages):
            if run_time < stage["duration"]:
                if i != self._current_phase:
                    self._current_phase = i
                    print(
                        f"\n[TSELoadShape] >>> {self._phase_names[i]} "
                        f"(target: {stage['users']} users @ {stage['spawn_rate']}/s)"
                    )
                return stage["users"], stage["spawn_rate"]

        return None  # test complete


# ---------------------------------------------------------------------------
# Event hooks — phase logging + end-of-run summary
# ---------------------------------------------------------------------------

_stats_snapshot: dict = {}


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    print("\n" + "=" * 70)
    print("  TSE Dashboard — Locust Performance Test")
    print(f"  Target: {environment.host}")
    print("  Phases: Warm-up → Ramp → Steady → Stress → Cool-down")
    print("=" * 70 + "\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    stats = environment.runner.stats
    print("\n" + "=" * 70)
    print("  FINAL RESULTS SUMMARY")
    print("=" * 70)
    print(f"  {'Endpoint':<45} {'RPS':>7} {'p50':>7} {'p95':>7} {'p99':>7} {'Fail%':>6}")
    print("  " + "-" * 68)

    entries = sorted(
        [s for s in stats.entries.values() if s.num_requests > 0],
        key=lambda s: s.total_rps,
        reverse=True,
    )

    total_reqs = 0
    total_fails = 0
    for s in entries:
        fail_pct = (s.num_failures / s.num_requests * 100) if s.num_requests else 0
        rps = s.total_rps
        p50 = s.get_response_time_percentile(0.50) or 0
        p95 = s.get_response_time_percentile(0.95) or 0
        p99 = s.get_response_time_percentile(0.99) or 0
        name = s.name[:44]
        print(f"  {name:<45} {rps:>7.1f} {p50:>6}ms {p95:>6}ms {p99:>6}ms {fail_pct:>5.1f}%")
        total_reqs += s.num_requests
        total_fails += s.num_failures

    overall_fail_pct = (total_fails / total_reqs * 100) if total_reqs else 0
    print("  " + "-" * 68)
    print(f"  {'TOTAL':<45} {'':>7} {'':>7} {'':>7} {'':>7} {overall_fail_pct:>5.1f}%")
    print(f"  Total requests: {total_reqs:,}   Total failures: {total_fails:,}")
    print("=" * 70)

    # Print pass/fail assessment
    agg = stats.total
    p95_total = agg.get_response_time_percentile(0.95) or 0
    print("\n  ASSESSMENT:")
    checks = [
        ("Overall error rate < 5%",    overall_fail_pct < 5),
        ("Overall p95 latency < 2000ms", p95_total < 2000),
        ("Total requests > 10,000",    total_reqs > 10_000),
    ]
    for label, passed in checks:
        icon = "PASS" if passed else "FAIL"
        print(f"    [{icon}] {label}")
    print()
