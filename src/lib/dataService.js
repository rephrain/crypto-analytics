/**
 * Complete CoinGecko Data Service Module - ETL Pipeline
 * 
 * Comprehensive integration with CoinGecko API covering 15+ endpoint categories:
 * 1. Simple Price Queries
 * 2. Coins Data (List, Markets, Details, History)
 * 3. Contract/Token Address Queries
 * 4. Asset Platforms
 * 5. Token Lists
 * 6. Categories
 * 7. OHLC Data
 * 8. Tickers & Exchange Data
 * 9. Historical Chart Data
 * 10. Market Chart Range
 * 
 * Features:
 * - In-memory caching with configurable TTL
 * - Exponential backoff retry logic
 * - Error handling with graceful degradation
 * - Multi-page data fetching
 * - Rate limit handling (30 calls/min for Demo, 500+ for Pro)
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
const CACHE_TTL = 90000; // 90 seconds default cache TTL (Raised to prevent Rate Limits)
const CACHE_TTL_LONG = 300000; // 5 minutes for slower-changing data
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// ============================================================================
// IN-MEMORY CACHE SYSTEM
// ============================================================================

const cache = new Map();

function isCacheValid(key, ttl = CACHE_TTL) {
  const entry = cache.get(key);
  if (!entry) return false;
  return Date.now() - entry.timestamp < ttl;
}

function getFromCache(key, ttl = CACHE_TTL) {
  if (isCacheValid(key, ttl)) {
    return cache.get(key).data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}

function clearCache(pattern = null) {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
      }
    }
  } else {
    cache.clear();
  }
}

// ============================================================================
// FETCH UTILITIES
// ============================================================================

async function fetchWithRetry(url, retries = MAX_RETRIES) {
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        if (retries > 0) {
          const delay = RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchWithRetry(url, retries - 1);
        }
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (retries > 0) {
      const delay = RETRY_DELAY * Math.pow(2, MAX_RETRIES - retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

// ============================================================================
// 1. SIMPLE PRICE ENDPOINTS
// ============================================================================

/**
 * Get simple price data for coins by IDs
 * @param {string|Array} ids - Coin IDs (e.g., 'bitcoin' or ['bitcoin', 'ethereum'])
 * @param {string|Array} vsCurrencies - Target currencies (e.g., 'usd' or ['usd', 'eur'])
 * @param {Object} options - Optional parameters
 * @returns {Promise<Object>}
 */
export async function getSimplePrice(ids, vsCurrencies = 'usd', options = {}) {
  const idsStr = Array.isArray(ids) ? ids.join(',') : ids;
  const vsStr = Array.isArray(vsCurrencies) ? vsCurrencies.join(',') : vsCurrencies;

  const params = new URLSearchParams({
    ids: idsStr,
    vs_currencies: vsStr,
    include_market_cap: options.includeMarketCap || false,
    include_24hr_vol: options.include24hrVol || false,
    include_24hr_change: options.include24hrChange || false,
    include_last_updated_at: options.includeLastUpdatedAt || false,
    precision: options.precision || 'full'
  });

  const cacheKey = `simple_price_${idsStr}_${vsStr}_${JSON.stringify(options)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/simple/price?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get token price by contract address
 * @param {string} assetPlatformId - Asset platform ID (e.g., 'ethereum')
 * @param {string|Array} contractAddresses - Contract address(es)
 * @param {string|Array} vsCurrencies - Target currencies
 * @param {Object} options - Optional parameters
 */
export async function getTokenPrice(assetPlatformId, contractAddresses, vsCurrencies = 'usd', options = {}) {
  const addressStr = Array.isArray(contractAddresses) ? contractAddresses.join(',') : contractAddresses;
  const vsStr = Array.isArray(vsCurrencies) ? vsCurrencies.join(',') : vsCurrencies;

  const params = new URLSearchParams({
    contract_addresses: addressStr,
    vs_currencies: vsStr,
    include_market_cap: options.includeMarketCap || false,
    include_24hr_vol: options.include24hrVol || false,
    include_24hr_change: options.include24hrChange || false,
    include_last_updated_at: options.includeLastUpdatedAt || false
  });

  const cacheKey = `token_price_${assetPlatformId}_${addressStr}_${vsStr}`;
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/simple/token_price/${assetPlatformId}?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get list of supported vs currencies
 */
export async function getSupportedVsCurrencies() {
  const cacheKey = 'supported_vs_currencies';
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/simple/supported_vs_currencies`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 2. COINS LIST & MARKETS
// ============================================================================

/**
 * Get list of all coins with id, name, and symbol
 * @param {boolean} includePlatform - Include platform info
 */
export async function getCoinsList(includePlatform = false) {
  const cacheKey = `coins_list_${includePlatform}`;
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const params = new URLSearchParams({ include_platform: includePlatform });
    const url = `${COINGECKO_BASE_URL}/coins/list?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get coins market data (MAIN ENDPOINT)
 * @param {Object} options - Query parameters
 */
export async function getCoinsMarkets(options = {}) {
  const {
    vsCurrency = 'usd',
    ids = null,
    category = null,
    order = 'market_cap_desc',
    perPage = 250,
    page = 1,
    sparkline = true,
    priceChangePercentage = '1h,24h,7d',
    locale = 'en'
  } = options;

  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    order,
    per_page: perPage,
    page,
    sparkline,
    locale
  });

  if (ids) params.append('ids', Array.isArray(ids) ? ids.join(',') : ids);
  if (category) params.append('category', category);
  if (priceChangePercentage) params.append('price_change_percentage', priceChangePercentage);

  const cacheKey = `coins_markets_${JSON.stringify(options)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/markets?${params}`;
    const data = await fetchWithRetry(url);
    const transformed = transformMarketData(data);
    setCache(cacheKey, transformed);
    return { success: true, data: transformed, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get market data with multi-page support (existing function enhanced)
 */
export async function getMarketData(limit = 250) {
  try {
    const effectiveLimit = limit === Number.POSITIVE_INFINITY ? 1444 : Math.min(limit, 1444);
    const itemsPerPage = 250;
    const totalPages = Math.ceil(effectiveLimit / itemsPerPage);

    const fetchPromises = [];
    for (let page = 1; page <= totalPages; page++) {
      fetchPromises.push(
        getCoinsMarkets({
          perPage: itemsPerPage,
          page,
          sparkline: true,
          priceChangePercentage: '1h,24h,7d'
        })
      );
    }

    const results = await Promise.all(fetchPromises);
    const combinedData = results.flatMap(r => r.data || []).slice(0, effectiveLimit);

    return {
      success: true,
      data: combinedData,
      meta: {
        count: combinedData.length,
        timestamp: new Date().toISOString(),
        source: 'CoinGecko'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
}

// ============================================================================
// 3. COIN DETAILS BY ID
// ============================================================================

/**
 * Get detailed coin data by ID
 * @param {string} id - Coin ID
 * @param {Object} options - Optional parameters
 */
export async function getCoinDetails(id, options = {}) {
  const {
    localization = true,
    tickers = false,
    marketData = true,
    communityData = true,
    developerData = true,
    sparkline = true
  } = options;

  const params = new URLSearchParams({
    localization,
    tickers,
    market_data: marketData,
    community_data: communityData,
    developer_data: developerData,
    sparkline
  });

  const cacheKey = `coin_${id}_${JSON.stringify(options)}`;
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/${id}?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 4. COIN TICKERS
// ============================================================================

/**
 * Get coin tickers by ID
 * @param {string} id - Coin ID
 * @param {Object} options - Optional parameters
 */
export async function getCoinTickers(id, options = {}) {
  const {
    exchangeIds = null,
    includeExchangeLogo = false,
    page = 1,
    order = 'trust_score_desc',
    depth = false
  } = options;

  const params = new URLSearchParams({
    include_exchange_logo: includeExchangeLogo,
    page,
    order,
    depth
  });

  if (exchangeIds) {
    params.append('exchange_ids', Array.isArray(exchangeIds) ? exchangeIds.join(',') : exchangeIds);
  }

  const cacheKey = `coin_tickers_${id}_${JSON.stringify(options)}`;
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/${id}/tickers?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 5. HISTORICAL DATA
// ============================================================================

/**
 * Get historical data at specific date
 * @param {string} id - Coin ID
 * @param {string} date - Date in DD-MM-YYYY format
 * @param {boolean} localization - Include localization
 */
export async function getCoinHistory(id, date, localization = false) {
  const params = new URLSearchParams({
    date,
    localization
  });

  const cacheKey = `coin_history_${id}_${date}`;
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/${id}/history?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get historical market chart data
 * @param {string} id - Coin ID
 * @param {string} vsCurrency - Target currency
 * @param {number} days - Number of days (1, 7, 14, 30, 90, 180, 365, max)
 * @param {string} interval - Data interval (optional: daily)
 */
export async function getCoinMarketChart(id, vsCurrency = 'usd', days = 30, interval = null) {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: days.toString()
  });

  if (interval) params.append('interval', interval);

  const cacheKey = `coin_market_chart_${id}_${vsCurrency}_${days}_${interval}`;
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/${id}/market_chart?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get historical market chart data within time range
 * @param {string} id - Coin ID
 * @param {string} vsCurrency - Target currency
 * @param {number} from - From timestamp (UNIX)
 * @param {number} to - To timestamp (UNIX)
 */
export async function getCoinMarketChartRange(id, vsCurrency = 'usd', from, to) {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    from: from.toString(),
    to: to.toString()
  });

  const cacheKey = `coin_market_chart_range_${id}_${vsCurrency}_${from}_${to}`;
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/${id}/market_chart/range?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 6. OHLC DATA
// ============================================================================

/**
 * Get OHLC (candlestick) data
 * @param {string} id - Coin ID
 * @param {string} vsCurrency - Target currency
 * @param {number} days - Number of days (1, 7, 14, 30, 90, 180, 365, max)
 */
export async function getCoinOHLC(id, vsCurrency = 'usd', days = 30) {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: days.toString()
  });

  const cacheKey = `coin_ohlc_${id}_${vsCurrency}_${days}`;
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/${id}/ohlc?${params}`;
    const data = await fetchWithRetry(url);

    // Transform OHLC data for easier consumption
    const transformed = data.map(candle => ({
      timestamp: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4]
    }));

    setCache(cacheKey, transformed);
    return { success: true, data: transformed, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 7. CONTRACT ADDRESS / TOKEN QUERIES
// ============================================================================

/**
 * Get coin data by contract address
 * @param {string} assetPlatformId - Asset platform ID (e.g., 'ethereum')
 * @param {string} contractAddress - Contract address
 */
export async function getCoinByContractAddress(assetPlatformId, contractAddress) {
  const cacheKey = `coin_contract_${assetPlatformId}_${contractAddress}`;
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/${assetPlatformId}/contract/${contractAddress}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get market chart data by contract address
 * @param {string} assetPlatformId - Asset platform ID
 * @param {string} contractAddress - Contract address
 * @param {string} vsCurrency - Target currency
 * @param {number} days - Number of days
 */
export async function getContractMarketChart(assetPlatformId, contractAddress, vsCurrency = 'usd', days = 30) {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    days: days.toString()
  });

  const cacheKey = `contract_market_chart_${assetPlatformId}_${contractAddress}_${vsCurrency}_${days}`;
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/${assetPlatformId}/contract/${contractAddress}/market_chart?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get market chart data within range by contract address
 * @param {string} assetPlatformId - Asset platform ID
 * @param {string} contractAddress - Contract address
 * @param {string} vsCurrency - Target currency
 * @param {number} from - From timestamp (UNIX)
 * @param {number} to - To timestamp (UNIX)
 */
export async function getContractMarketChartRange(assetPlatformId, contractAddress, vsCurrency = 'usd', from, to) {
  const params = new URLSearchParams({
    vs_currency: vsCurrency,
    from: from.toString(),
    to: to.toString()
  });

  const cacheKey = `contract_market_chart_range_${assetPlatformId}_${contractAddress}_${from}_${to}`;
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/${assetPlatformId}/contract/${contractAddress}/market_chart/range?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 8. ASSET PLATFORMS
// ============================================================================

/**
 * Get list of all asset platforms (blockchain networks)
 * @param {string} filter - Filter by: 'nft' or null
 */
export async function getAssetPlatforms(filter = null) {
  const params = filter ? new URLSearchParams({ filter }) : '';
  const cacheKey = `asset_platforms_${filter}`;
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/asset_platforms${params ? '?' + params : ''}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 9. TOKEN LISTS
// ============================================================================

/**
 * Get token list for specific asset platform
 * @param {string} assetPlatformId - Asset platform ID (e.g., 'ethereum')
 */
export async function getTokenList(assetPlatformId) {
  const cacheKey = `token_list_${assetPlatformId}`;
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/token_lists/${assetPlatformId}/all.json`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 10. CATEGORIES
// ============================================================================

/**
 * Get list of all coin categories
 */
export async function getCoinCategoriesList() {
  const cacheKey = 'coin_categories_list';
  const cached = getFromCache(cacheKey, CACHE_TTL_LONG);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/categories/list`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get coin categories with market data
 * @param {string} order - Order results by: market_cap_desc (default), market_cap_asc, name_desc, name_asc, market_cap_change_24h_desc, market_cap_change_24h_asc
 */
export async function getCoinCategories(order = 'market_cap_desc') {
  const params = new URLSearchParams({ order });
  const cacheKey = `coin_categories_${order}`;
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/coins/categories?${params}`;
    const data = await fetchWithRetry(url);
    setCache(cacheKey, data);
    return { success: true, data, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 11. GLOBAL DATA
// ============================================================================

/**
 * Get global crypto market data
 */
export async function getGlobalData() {
  const cacheKey = 'global';
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/global`;
    const rawData = await fetchWithRetry(url);
    const transformed = transformGlobalData(rawData);
    setCache(cacheKey, transformed);
    return { success: true, data: transformed, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// 12. TRENDING
// ============================================================================

/**
 * Get trending coins, NFTs, and categories
 */
export async function getTrendingData() {
  const cacheKey = 'trending';
  const cached = getFromCache(cacheKey);
  if (cached) return { success: true, data: cached, cached: true };

  try {
    const url = `${COINGECKO_BASE_URL}/search/trending`;
    const rawData = await fetchWithRetry(url);
    const transformed = transformTrendingData(rawData);
    setCache(cacheKey, transformed);
    return { success: true, data: transformed, cached: false };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// TRANSFORMATION FUNCTIONS
// ============================================================================

function transformMarketData(rawData) {
  if (!Array.isArray(rawData)) return [];

  return rawData.map((coin, index) => ({
    rank: index + 1,
    id: coin.id,
    symbol: coin.symbol?.toUpperCase() || '',
    name: coin.name,
    image: coin.image,
    currentPrice: coin.current_price,
    marketCap: coin.market_cap,
    marketCapRank: coin.market_cap_rank,
    fullyDilutedValuation: coin.fully_diluted_valuation,
    volume24h: coin.total_volume,
    priceChange1h: coin.price_change_percentage_1h_in_currency || 0,
    priceChange24h: coin.price_change_percentage_24h || 0,
    priceChange7d: coin.price_change_percentage_7d_in_currency || 0,
    high24h: coin.high_24h,
    low24h: coin.low_24h,
    ath: coin.ath,
    athChangePercentage: coin.ath_change_percentage,
    athDate: coin.ath_date,
    atl: coin.atl,
    atlChangePercentage: coin.atl_change_percentage,
    atlDate: coin.atl_date,
    circulatingSupply: coin.circulating_supply,
    totalSupply: coin.total_supply,
    maxSupply: coin.max_supply,
    sparkline: coin.sparkline_in_7d?.price || [],
    lastUpdated: coin.last_updated,
    // Derived metrics
    volumeToMarketCap: coin.total_volume && coin.market_cap ? coin.total_volume / coin.market_cap : 0,
    priceVolatility: coin.high_24h && coin.low_24h && coin.current_price
      ? Math.abs(coin.high_24h - coin.low_24h) / coin.current_price * 100
      : 0
  }));
}

function transformGlobalData(rawData) {
  const data = rawData.data;
  return {
    totalMarketCap: data.total_market_cap?.usd || 0,
    totalVolume24h: data.total_volume?.usd || 0,
    btcDominance: data.market_cap_percentage?.btc || 0,
    ethDominance: data.market_cap_percentage?.eth || 0,
    activeCryptocurrencies: data.active_cryptocurrencies || 0,
    markets: data.markets || 0,
    marketCapChange24h: data.market_cap_change_percentage_24h_usd || 0,
    updatedAt: data.updated_at || 0,
    lastUpdated: new Date().toISOString()
  };
}

function transformTrendingData(rawData) {
  return {
    coins: (rawData.coins || []).map((item, index) => ({
      rank: index + 1,
      id: item.item.id,
      coinId: item.item.coin_id,
      name: item.item.name,
      symbol: item.item.symbol?.toUpperCase() || '',
      thumb: item.item.thumb,
      small: item.item.small,
      large: item.item.large,
      marketCapRank: item.item.market_cap_rank,
      priceBtc: item.item.price_btc,
      score: item.item.score,
      slug: item.item.slug,
      data: item.item.data
    })),
    nfts: (rawData.nfts || []).map((item, index) => ({
      rank: index + 1,
      id: item.id,
      name: item.name,
      symbol: item.symbol,
      thumb: item.thumb,
      nftContractId: item.nft_contract_id,
      nativeCurrencySymbol: item.native_currency_symbol,
      floorPriceInNativeCurrency: item.floor_price_in_native_currency,
      floorPrice24hPercentageChange: item.floor_price_24h_percentage_change
    })),
    categories: (rawData.categories || []).map((item, index) => ({
      rank: index + 1,
      id: item.id,
      name: item.name,
      marketCap1hChange: item.market_cap_1h_change,
      slug: item.slug,
      coinsCount: item.coins_count,
      data: item.data
    }))
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format large numbers for display
 * @param {number} num - Number to format
 * @returns {string} - Formatted string
 */
export function formatNumber(num) {
  if (!num && num !== 0) return 'N/A';
  if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
  if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
  return num.toFixed(2);
}

/**
 * Format price for display
 * @param {number} price - Price to format
 * @returns {string} - Formatted price string
 */
export function formatPrice(price) {
  if (!Number.isFinite(price)) return 'N/A';

  if (price >= 1) {
    return '$' + price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (price >= 0.01) return '$' + price.toFixed(4);
  if (price >= 0.0001) return '$' + price.toFixed(6);

  return '$' + price.toFixed(8);
}

/**
 * Format percentage for display
 * @param {number} pct - Percentage to format
 * @returns {string} - Formatted percentage string
 */
export function formatPercentage(pct) {
  if (!pct && pct !== 0) return 'N/A';
  const sign = pct >= 0 ? '+' : '';
  return sign + pct.toFixed(2) + '%';
}

/**
 * Format timestamp to date string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted date
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format timestamp to datetime string
 * @param {number} timestamp - Unix timestamp
 * @returns {string} - Formatted datetime
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Calculate percentage change between two values
 * @param {number} oldValue - Old value
 * @param {number} newValue - New value
 * @returns {number} - Percentage change
 */
export function calculatePercentageChange(oldValue, newValue) {
  if (!oldValue || oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Convert days to appropriate interval for API
 * @param {number} days - Number of days
 * @returns {string|null} - Interval string or null
 */
export function getIntervalForDays(days) {
  if (days <= 1) return null;
  if (days <= 90) return 'daily';
  return 'daily';
}

/**
 * Get optimal OHLC granularity based on days
 * @param {number} days - Number of days
 * @returns {string} - Recommended days parameter for OHLC
 */
export function getOHLCGranularity(days) {
  if (days <= 2) return 1; // 30 min
  if (days <= 30) return 7; // 4 hour
  if (days <= 90) return 30; // 4 hour
  if (days <= 365) return 90; // 4 hour
  return 'max'; // 4 hour
}

/**
 * Validate Ethereum address
 * @param {string} address - Address to validate
 * @returns {boolean} - Is valid
 */
export function isValidEthereumAddress(address) {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Batch requests with delay to respect rate limits
 * @param {Array} requests - Array of request functions
 * @param {number} delayMs - Delay between requests
 * @returns {Promise<Array>} - Results array
 */
export async function batchRequests(requests, delayMs = 200) {
  const results = [];
  for (let i = 0; i < requests.length; i++) {
    try {
      const result = await requests[i]();
      results.push(result);
      if (i < requests.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
  }
  return results;
}

// ============================================================================
// ADVANCED QUERY HELPERS
// ============================================================================

/**
 * Get comprehensive coin data (combines multiple endpoints)
 * @param {string} id - Coin ID
 * @returns {Promise<Object>} - Combined data from multiple endpoints
 */
export async function getComprehensiveCoinData(id) {
  try {
    const [details, tickers, chart7d, ohlc7d] = await Promise.all([
      getCoinDetails(id, { tickers: false, marketData: true }),
      getCoinTickers(id, { page: 1 }),
      getCoinMarketChart(id, 'usd', 7),
      getCoinOHLC(id, 'usd', 7)
    ]);

    return {
      success: true,
      data: {
        details: details.data,
        tickers: tickers.data,
        chart7d: chart7d.data,
        ohlc7d: ohlc7d.data
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get market overview (combines global + trending + top markets)
 * @returns {Promise<Object>} - Market overview data
 */
export async function getMarketOverview() {
  try {
    const [global, trending, topCoins] = await Promise.all([
      getGlobalData(),
      getTrendingData(),
      getCoinsMarkets({ perPage: 10, page: 1 })
    ]);

    return {
      success: true,
      data: {
        global: global.data,
        trending: trending.data,
        topCoins: topCoins.data
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Search coins by query string
 * @param {string} query - Search query
 * @param {Array} coinsList - Full coins list (from getCoinsList)
 * @returns {Array} - Filtered coins
 */
export function searchCoins(query, coinsList) {
  if (!query || !coinsList) return [];

  const lowerQuery = query.toLowerCase();
  return coinsList.filter(coin =>
    coin.id?.toLowerCase().includes(lowerQuery) ||
    coin.symbol?.toLowerCase().includes(lowerQuery) ||
    coin.name?.toLowerCase().includes(lowerQuery)
  ).slice(0, 50); // Limit results
}

/**
 * Get price comparison across multiple coins
 * @param {Array<string>} coinIds - Array of coin IDs
 * @param {string} vsCurrency - Target currency
 * @returns {Promise<Object>} - Price comparison data
 */
export async function getPriceComparison(coinIds, vsCurrency = 'usd') {
  try {
    const data = await getSimplePrice(coinIds, vsCurrency, {
      includeMarketCap: true,
      include24hrVol: true,
      include24hrChange: true,
      includeLastUpdatedAt: true
    });

    return {
      success: true,
      data: data.data,
      meta: {
        coins: coinIds,
        currency: vsCurrency,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get top gainers and losers
 * @param {number} limit - Number of coins per category
 * @returns {Promise<Object>} - Gainers and losers data
 */
export async function getGainersLosers(limit = 10) {
  try {
    const markets = await getCoinsMarkets({
      perPage: 250,
      page: 1,
      sparkline: false,
      priceChangePercentage: '24h'
    });

    if (!markets.success) throw new Error('Failed to fetch market data');

    const sorted = [...markets.data].sort((a, b) => b.priceChange24h - a.priceChange24h);

    return {
      success: true,
      data: {
        gainers: sorted.slice(0, limit),
        losers: sorted.slice(-limit).reverse()
      },
      meta: {
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get coins by category with optional filters
 * @param {string} categoryId - Category ID
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - Filtered category data
 */
export async function getCoinsByCategory(categoryId, options = {}) {
  try {
    const markets = await getCoinsMarkets({
      category: categoryId,
      perPage: options.limit || 100,
      page: options.page || 1,
      order: options.order || 'market_cap_desc',
      sparkline: options.sparkline !== false
    });

    return {
      success: true,
      data: markets.data,
      meta: {
        category: categoryId,
        count: markets.data.length,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get historical price at specific date
 * @param {string} id - Coin ID
 * @param {Date} date - Target date
 * @returns {Promise<Object>} - Historical price data
 */
export async function getPriceAtDate(id, date) {
  try {
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getFullYear()}`;
    const history = await getCoinHistory(id, formattedDate);

    if (!history.success) throw new Error('Failed to fetch historical data');

    return {
      success: true,
      data: {
        id,
        date: formattedDate,
        price: history.data.market_data?.current_price?.usd,
        marketCap: history.data.market_data?.market_cap?.usd,
        volume: history.data.market_data?.total_volume?.usd
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Calculate ROI between two dates
 * @param {string} id - Coin ID
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Object>} - ROI calculation
 */
export async function calculateROI(id, startDate, endDate) {
  try {
    const [startPrice, endPrice] = await Promise.all([
      getPriceAtDate(id, startDate),
      getPriceAtDate(id, endDate)
    ]);

    if (!startPrice.success || !endPrice.success) {
      throw new Error('Failed to fetch price data');
    }

    const roi = calculatePercentageChange(startPrice.data.price, endPrice.data.price);

    return {
      success: true,
      data: {
        id,
        startDate: startPrice.data.date,
        endDate: endPrice.data.date,
        startPrice: startPrice.data.price,
        endPrice: endPrice.data.price,
        roi,
        roiFormatted: formatPercentage(roi)
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// PORTFOLIO TRACKING HELPERS
// ============================================================================

/**
 * Calculate portfolio value
 * @param {Array<Object>} holdings - Array of {coinId, amount}
 * @returns {Promise<Object>} - Portfolio valuation
 */
export async function calculatePortfolioValue(holdings) {
  try {
    const coinIds = holdings.map(h => h.coinId);
    const prices = await getSimplePrice(coinIds, 'usd', {
      includeMarketCap: true,
      include24hrChange: true
    });

    if (!prices.success) throw new Error('Failed to fetch prices');

    const portfolio = holdings.map(holding => {
      const coinData = prices.data[holding.coinId];
      if (!coinData) return null;

      const value = holding.amount * coinData.usd;
      const change24h = coinData.usd_24h_change || 0;

      return {
        coinId: holding.coinId,
        amount: holding.amount,
        price: coinData.usd,
        value,
        change24h,
        valueChange24h: (value * change24h) / 100
      };
    }).filter(Boolean);

    const totalValue = portfolio.reduce((sum, item) => sum + item.value, 0);
    const totalChange24h = portfolio.reduce((sum, item) => sum + item.valueChange24h, 0);
    const totalChange24hPercent = (totalChange24h / totalValue) * 100;

    return {
      success: true,
      data: {
        holdings: portfolio,
        totalValue,
        totalChange24h,
        totalChange24hPercent,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ============================================================================
// EXPORT ALL MAIN FUNCTIONS
// ============================================================================

export {
  // Cache management
  clearCache,
  isCacheValid,

  // Core market data
  getMarketData,
  getGlobalData,
  getTrendingData,

  // Simple price
  getSimplePrice,
  getTokenPrice,
  getSupportedVsCurrencies,

  // Coins
  getCoinsList,
  getCoinsMarkets,
  getCoinDetails,
  getCoinTickers,

  // Historical
  getCoinHistory,
  getCoinMarketChart,
  getCoinMarketChartRange,
  getCoinOHLC,

  // Contract/Token
  getCoinByContractAddress,
  getContractMarketChart,
  getContractMarketChartRange,

  // Platforms & Categories
  getAssetPlatforms,
  getTokenList,
  getCoinCategoriesList,
  getCoinCategories,

  // Advanced helpers
  getComprehensiveCoinData,
  getMarketOverview,
  searchCoins,
  getPriceComparison,
  getGainersLosers,
  getCoinsByCategory,
  getPriceAtDate,
  calculateROI,
  calculatePortfolioValue,

  // Utilities
  formatNumber,
  formatPrice,
  formatPercentage,
  formatDate,
  formatDateTime,
  calculatePercentageChange,
  getIntervalForDays,
  getOHLCGranularity,
  isValidEthereumAddress,
  batchRequests
};