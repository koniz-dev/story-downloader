// Field RUM reporter: pipes Core Web Vitals (LCP, INP, CLS, TTFB, FCP) through
// the existing /api/track sink so we get real-user performance numbers in the
// same Analytics Engine dataset as resolve/download events. No third-party RUM
// SaaS; no PII (web-vitals reports per-metric numerics, never URLs or content).
//
// Volume: web-vitals reports each metric once per page lifecycle (LCP on
// hidden, INP/CLS on hidden, TTFB/FCP early). Five events per page load fits
// comfortably under the 120/min/IP /api/track rate limit.

import { onCLS, onFCP, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { track } from './track';

// CLS is unitless (typically 0.0–0.5); the rest are milliseconds. We send all
// vitals through the existing `ms` field on the track payload — multiplying
// CLS by 1000 lets it share the schema without bumping the AE positional doc
// (see worker/src/analytics.ts).
function reportMetric(metric: Metric): void {
  const ms = metric.name === 'CLS' ? Math.round(metric.value * 1000) : Math.round(metric.value);
  track({
    event: `vitals.${metric.name.toLowerCase()}` as
      | 'vitals.lcp'
      | 'vitals.inp'
      | 'vitals.cls'
      | 'vitals.ttfb'
      | 'vitals.fcp',
    ms,
  });
}

export function reportWebVitals(): void {
  // Each onX() registers exactly one report-on-hidden listener internally;
  // calling them once at module load is the documented pattern.
  onLCP(reportMetric);
  onINP(reportMetric);
  onCLS(reportMetric);
  onTTFB(reportMetric);
  onFCP(reportMetric);
}
