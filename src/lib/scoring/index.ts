import type { Fundamentals, Subscription } from "@/lib/db/types";

export type ScoreFactor = {
  label: string;
  verdict: "good" | "neutral" | "poor";
  detail: string;
};

export type Scorecard = {
  rating: "green" | "yellow" | "red";
  factors: ScoreFactor[];
};

/**
 * Rule-based, transparent scorecard. Every factor shown is derived directly
 * from a field in `fundamentals`/`subscriptions` -- there is no hidden model.
 */
export function computeScorecard(
  fundamentals: Fundamentals[],
  subscriptions: Subscription[],
  latestGmpPct: number | null
): Scorecard {
  const factors: ScoreFactor[] = [];
  let goodCount = 0;
  let poorCount = 0;

  const sorted = [...fundamentals].sort((a, b) => a.fiscal_year.localeCompare(b.fiscal_year));
  const latest = sorted[sorted.length - 1];
  const prior = sorted[sorted.length - 2];

  if (latest?.revenue_crores && prior?.revenue_crores) {
    const growth =
      ((Number(latest.revenue_crores) - Number(prior.revenue_crores)) / Number(prior.revenue_crores)) * 100;
    const verdict = growth > 15 ? "good" : growth > 0 ? "neutral" : "poor";
    factors.push({
      label: "Revenue growth (YoY)",
      verdict,
      detail: `${growth.toFixed(1)}% vs prior fiscal year`,
    });
    if (verdict === "good") goodCount++;
    if (verdict === "poor") poorCount++;
  } else {
    factors.push({
      label: "Revenue growth (YoY)",
      verdict: "neutral",
      detail: "Not enough fundamentals entered to compute this",
    });
  }

  if (latest?.margin_pct) {
    const margin = Number(latest.margin_pct);
    const verdict = margin > 12 ? "good" : margin > 5 ? "neutral" : "poor";
    factors.push({ label: "Profit margin", verdict, detail: `${margin.toFixed(1)}%` });
    if (verdict === "good") goodCount++;
    if (verdict === "poor") poorCount++;
  }

  if (latest?.debt_crores && latest?.revenue_crores) {
    const debtToRevenue = Number(latest.debt_crores) / Number(latest.revenue_crores);
    const verdict = debtToRevenue < 0.3 ? "good" : debtToRevenue < 0.7 ? "neutral" : "poor";
    factors.push({
      label: "Debt vs revenue",
      verdict,
      detail: `Debt is ${(debtToRevenue * 100).toFixed(0)}% of revenue`,
    });
    if (verdict === "good") goodCount++;
    if (verdict === "poor") poorCount++;
  }

  const overallSub = subscriptions.find((s) => s.category === "overall");
  if (overallSub) {
    const times = Number(overallSub.times_subscribed);
    const verdict = times > 10 ? "good" : times > 1 ? "neutral" : "poor";
    factors.push({
      label: "Overall subscription",
      verdict,
      detail: `${times.toFixed(1)}x subscribed as of ${new Date(overallSub.as_of).toLocaleDateString()}`,
    });
    if (verdict === "good") goodCount++;
    if (verdict === "poor") poorCount++;
  }

  if (latestGmpPct !== null) {
    const verdict = latestGmpPct > 20 ? "good" : latestGmpPct > 0 ? "neutral" : "poor";
    factors.push({ label: "Grey market premium", verdict, detail: `${latestGmpPct.toFixed(1)}% over issue price` });
    if (verdict === "good") goodCount++;
    if (verdict === "poor") poorCount++;
  }

  let rating: Scorecard["rating"] = "yellow";
  if (factors.length > 0) {
    if (goodCount >= factors.length / 2 && poorCount === 0) rating = "green";
    else if (poorCount >= factors.length / 2) rating = "red";
  }

  return { rating, factors };
}

export type ListingGainEstimate = {
  lowPct: number;
  highPct: number;
  basis: string;
};

/**
 * Indicative range only -- GMP is an unofficial, volatile signal and this is
 * not a prediction of actual listing performance.
 */
export function estimateListingGain(
  gmpPct: number | null,
  overallSubscriptionTimes: number | null
): ListingGainEstimate | null {
  if (gmpPct === null) return null;

  let low = gmpPct * 0.6;
  let high = gmpPct * 1.1;

  if (overallSubscriptionTimes !== null) {
    if (overallSubscriptionTimes > 20) {
      high += 5;
    } else if (overallSubscriptionTimes < 2) {
      low -= 5;
      high -= 5;
    }
  }

  return {
    lowPct: Math.round(low * 10) / 10,
    highPct: Math.round(high * 10) / 10,
    basis: "Derived from grey market premium and subscription momentum. Historically indicative only -- GMP is an unofficial, unregulated signal and can move sharply right up to listing day.",
  };
}

export type AllotmentOdds = {
  approxProbabilityPct: number;
  explanation: string;
};

/**
 * Very rough odds: in an oversubscribed category, shares are allotted by lottery
 * roughly in proportion to (1 / times subscribed), capped at 100%. This ignores
 * the exact lot-based pro-rata mechanics registrars use, so treat it as a ballpark.
 */
export function estimateAllotmentOdds(categoryTimesSubscribed: number | null): AllotmentOdds | null {
  if (categoryTimesSubscribed === null) return null;
  if (categoryTimesSubscribed <= 1) {
    return {
      approxProbabilityPct: 100,
      explanation: "Category was not oversubscribed -- every valid application is typically allotted at least one lot.",
    };
  }
  const approx = Math.min(100, Math.round((1 / categoryTimesSubscribed) * 1000) / 10);
  return {
    approxProbabilityPct: approx,
    explanation: `Category was oversubscribed ${categoryTimesSubscribed}x. Rough lottery-odds estimate, not the actual registrar pro-rata calculation.`,
  };
}

export const ALLOTMENT_TIPS = [
  "Apply from multiple family member demat accounts (each is a separate lottery entry) -- this is legitimate as long as each account and PAN is genuinely that person's.",
  "Apply at the cut-off price, not a lower price within the band, so your bid isn't excluded during price discovery.",
  "In heavily oversubscribed issues, apply for a single lot rather than many -- most retail allotment lotteries are per-application, not per-share, so more lots doesn't meaningfully raise your odds and just ties up more capital.",
  "Double-check your application for technical rejection reasons: mismatched PAN/demat details, insufficient funds blocked via ASBA, or duplicate applications under the same PAN.",
  "Apply early on the first day when possible -- some registrars process on a first-come basis within the pro-rata rules for certain categories.",
];
