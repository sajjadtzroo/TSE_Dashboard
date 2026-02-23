"""
Scrapy settings for TSETMC scraper project
Configured for scraping Tehran Stock Exchange data
"""

BOT_NAME = "tsetmc_scraper"

SPIDER_MODULES = ["tsetmc_scraper.spiders"]
NEWSPIDER_MODULE = "tsetmc_scraper.spiders"

# ============================================================================
# USER AGENT & HEADERS
# ============================================================================

# Identify as a real browser to avoid 403 errors
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Don't obey robots.txt for TSETMC (they want their data to be accessible)
ROBOTSTXT_OBEY = False

# Default request headers
DEFAULT_REQUEST_HEADERS = {
    "Accept": "text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9,fa;q=0.8",
    "Accept-Encoding": "gzip, deflate",
    "Referer": "https://old.tsetmc.com/",
}

# ============================================================================
# CONCURRENCY & THROTTLING
# ============================================================================

# Concurrent requests (conservative to avoid overloading BrsApi.ir)
CONCURRENT_REQUESTS = 8
CONCURRENT_REQUESTS_PER_DOMAIN = 4

# Download delay (500ms between requests)
DOWNLOAD_DELAY = 0.5

# Disable cookies (not needed for API)
COOKIES_ENABLED = False

# Enable AutoThrottle to automatically adjust delays
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_START_DELAY = 0.5
AUTOTHROTTLE_MAX_DELAY = 15
AUTOTHROTTLE_TARGET_CONCURRENCY = 2.0
AUTOTHROTTLE_DEBUG = False

# ============================================================================
# RETRY SETTINGS (Important for TSETMC)
# ============================================================================

# Retry settings - TSETMC frequently returns 403 errors
RETRY_ENABLED = True
RETRY_TIMES = 5
RETRY_HTTP_CODES = [403, 500, 502, 503, 504, 408, 429]
RETRY_PRIORITY_ADJUST = -1

# Download timeout (increased for large responses)
DOWNLOAD_TIMEOUT = 60

# ============================================================================
# ITEM PIPELINES (Order matters!)
# ============================================================================

ITEM_PIPELINES = {
    "tsetmc_scraper.pipelines.ValidationPipeline": 100,
    "tsetmc_scraper.pipelines.DataCleaningPipeline": 200,
    "tsetmc_scraper.pipelines.DatabasePipeline": 300,
    "tsetmc_scraper.pipelines.StatisticsPipeline": 400,
}

# ============================================================================
# LOGGING
# ============================================================================

# Log level
LOG_LEVEL = "INFO"

# Log file — truncate on each run to prevent unbounded growth
LOG_FILE = "logs/scrapy.log"
LOG_FILE_APPEND = False

# Log format
LOG_FORMAT = "%(asctime)s [%(name)s] %(levelname)s: %(message)s"
LOG_DATEFORMAT = "%Y-%m-%d %H:%M:%S"

# Don't log scraped items (too verbose)
LOG_SCRAPED_ITEMS = False

# ============================================================================
# EXTENSIONS
# ============================================================================

# Disable Telnet Console
TELNETCONSOLE_ENABLED = False

# ============================================================================
# MISC SETTINGS
# ============================================================================

# Feed export encoding (important for Persian text)
FEED_EXPORT_ENCODING = "utf-8"

# DNS timeout
DNS_TIMEOUT = 30

# Redirect settings
REDIRECT_ENABLED = True
REDIRECT_MAX_TIMES = 3

# Depth limit (prevent infinite crawling)
DEPTH_LIMIT = 0  # No limit for API calls

# Memory usage monitoring
MEMUSAGE_ENABLED = True
MEMUSAGE_LIMIT_MB = 1024  # 1GB
MEMUSAGE_WARNING_MB = 512  # 512MB

# Stats collection
STATS_CLASS = "scrapy.statscollectors.MemoryStatsCollector"

# ============================================================================
# HTTP CACHE (Optional - useful for development)
# ============================================================================

# Enable HTTP cache for development (disable in production)
HTTPCACHE_ENABLED = False
HTTPCACHE_EXPIRATION_SECS = 3600  # 1 hour
HTTPCACHE_DIR = "logs/httpcache"
HTTPCACHE_IGNORE_HTTP_CODES = [403, 500, 502, 503, 504]
HTTPCACHE_STORAGE = "scrapy.extensions.httpcache.FilesystemCacheStorage"

# ============================================================================
# PROXY SETTINGS
# ============================================================================

# Route all BrsApi.ir traffic through the gost HTTP→SOCKS5 bridge (proxy container).
# The proxy env vars (HTTP_PROXY / HTTPS_PROXY) are set in docker-compose.yml.
# HttpProxyMiddleware reads those env vars automatically.
DOWNLOADER_MIDDLEWARES = {
    "scrapy.downloadermiddlewares.httpproxy.HttpProxyMiddleware": 110,
    "scrapy.downloadermiddlewares.retry.RetryMiddleware": None,  # disable default
    "tsetmc_scraper.middlewares.ExponentialBackoffMiddleware": 550,  # backoff on 429/503
}

# Exponential backoff settings
BACKOFF_BASE_DELAY = 2.0
BACKOFF_MAX_DELAY = 60.0
HTTPPROXY_ENABLED = True

# To bypass the proxy for a specific request add: request.meta['proxy'] = ''


# ============================================================================
# CUSTOM SETTINGS
# ============================================================================

# Database URL (loaded from config)
from config.settings import BRSAPI_BASE_URL, BRSAPI_KEY

# TSETMC base URL
TSETMC_BASE_URL = "https://members.tsetmc.com/tsev2/data"

# BrsApi.ir settings (primary API for real-time data)
BRSAPI_BASE_URL = BRSAPI_BASE_URL
BRSAPI_KEY = BRSAPI_KEY
