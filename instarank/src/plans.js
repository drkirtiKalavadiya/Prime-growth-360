// Subscription plans and monthly quota enforcement.
export const PLANS = {
  free: {
    id: 'free', name: 'Free', priceUsd: 0,
    limits: { keywordSearches: 20, liveAnalyses: 10, captions: 20, aiCaptions: 3, liveTracks: 1, competitorScans: 3, saved: 25 },
  },
  pro: {
    id: 'pro', name: 'Creator Pro', priceUsd: 19,
    limits: { keywordSearches: 600, liveAnalyses: 300, captions: 1500, aiCaptions: 200, liveTracks: 10, competitorScans: 100, saved: 1000 },
  },
  agency: {
    id: 'agency', name: 'Agency', priceUsd: 79,
    limits: { keywordSearches: 5000, liveAnalyses: 2000, captions: 10000, aiCaptions: 1500, liveTracks: 50, competitorScans: 1000, saved: 10000 },
  },
};

// Used in PERSONAL_MODE: effectively unlimited.
export const PERSONAL_PLAN = {
  id: 'personal', name: 'Personal (unlimited)', priceUsd: 0,
  limits: { keywordSearches: 1e9, liveAnalyses: 1e9, captions: 1e9, aiCaptions: 1e9, liveTracks: 10, competitorScans: 1e9, saved: 1e9 },
};

export const METRIC_LABELS = {
  keywordSearches: 'Keyword searches',
  liveAnalyses: 'Live hashtag analyses',
  captions: 'Captions generated',
  aiCaptions: 'AI captions',
  competitorScans: 'Competitor scans',
};

export const monthKey = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export function planOf(user) { return user?.plan === 'personal' ? PERSONAL_PLAN : PLANS[user?.plan] || PLANS.free; }

export class QuotaError extends Error {
  constructor(metric, limit) {
    super(`Monthly limit reached for ${METRIC_LABELS[metric] || metric} (${limit}). Upgrade your plan to continue.`);
    this.status = 402; this.metric = metric; this.limit = limit;
  }
}

/** Throws QuotaError when the user would exceed the plan limit; otherwise records usage. */
export function consume(store, user, metric, amount = 1, now = new Date()) {
  const limit = planOf(user).limits[metric];
  const month = monthKey(now);
  const used = store.getUsage(user.id, month)[metric] || 0;
  if (limit !== undefined && used + amount > limit) throw new QuotaError(metric, limit);
  return store.incUsage(user.id, month, metric, amount);
}

export function usageSummary(store, user, now = new Date()) {
  const plan = planOf(user);
  const used = store.getUsage(user.id, monthKey(now));
  return Object.keys(METRIC_LABELS).map((m) => ({ metric: m, label: METRIC_LABELS[m], used: used[m] || 0, limit: plan.limits[m] }));
}
