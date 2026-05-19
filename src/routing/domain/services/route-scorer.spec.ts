import { RouteScorer } from './route-scorer';
import { Route } from '../model/route.model';
import { RouteLabel } from '../model/route-label.enum';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeRoute(
  routeIndex: number,
  opts: { distanceMeters: number; durationSeconds: number; grandTotal: number },
): Route {
  return {
    routeIndex,
    labels: [],
    hasTolls: true,
    distanceMeters: opts.distanceMeters,
    durationSeconds: opts.durationSeconds,
    tollCount: 0,
    costs: {
      tagCost: { amount: 0, currency: 'MXN' },
      cashCost: { amount: 0, currency: 'MXN' },
      fuelCost: { amount: 0, currency: 'MXN' },
      grandTotal: { amount: opts.grandTotal, currency: 'MXN' },
    },
    tolls: [],
    directions: [],
    arrival: {
      estimatedArrival: new Date(),
      durationSeconds: opts.durationSeconds,
      trafficDelaySeconds: 0,
    },
    polyline: '',
  };
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('RouteScorer', () => {
  let scorer: RouteScorer;

  beforeEach(() => {
    scorer = new RouteScorer();
  });

  // ──────────────────────────────────────────────
  // Edge: empty input
  // ──────────────────────────────────────────────

  describe('when routes array is empty', () => {
    it('should return an empty array', () => {
      const result = scorer.score([]);

      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────────────
  // Single route — must get all three labels
  // ──────────────────────────────────────────────

  describe('when there is only one route', () => {
    it('should assign CHEAPEST, FASTEST and SHORTEST to the single route', () => {
      const route = makeRoute(0, {
        distanceMeters: 921_400,
        durationSeconds: 32_520,
        grandTotal: 360,
      });

      const [scored] = scorer.score([route]);

      expect(scored.labels).toContain(RouteLabel.CHEAPEST);
      expect(scored.labels).toContain(RouteLabel.FASTEST);
      expect(scored.labels).toContain(RouteLabel.SHORTEST);
    });
  });

  // ──────────────────────────────────────────────
  // Two routes — clear winner for each metric
  // Carmen → Monterrey real data from mock provider
  // Route 0: 921 km, 9h03m (~32520s), MXN 360 cash
  // Route 1: 978 km, 9h58m (~35880s), MXN 215 cash
  // ──────────────────────────────────────────────

  describe('Carmen to Monterrey — two routes with clear winners', () => {
    const route0 = makeRoute(0, {
      distanceMeters: 921_400,
      durationSeconds: 32_520,
      grandTotal: 360,
    });
    const route1 = makeRoute(1, {
      distanceMeters: 978_200,
      durationSeconds: 35_880,
      grandTotal: 215,
    });

    it('should label route 1 as CHEAPEST (MXN 215 < MXN 360)', () => {
      const [scored0, scored1] = scorer.score([route0, route1]);

      expect(scored1.labels).toContain(RouteLabel.CHEAPEST);
      expect(scored0.labels).not.toContain(RouteLabel.CHEAPEST);
    });

    it('should label route 0 as FASTEST (32520s < 35880s)', () => {
      const [scored0, scored1] = scorer.score([route0, route1]);

      expect(scored0.labels).toContain(RouteLabel.FASTEST);
      expect(scored1.labels).not.toContain(RouteLabel.FASTEST);
    });

    it('should label route 0 as SHORTEST (921km < 978km)', () => {
      const [scored0, scored1] = scorer.score([route0, route1]);

      expect(scored0.labels).toContain(RouteLabel.SHORTEST);
      expect(scored1.labels).not.toContain(RouteLabel.SHORTEST);
    });

    it('route 0 should have FASTEST + SHORTEST but not CHEAPEST', () => {
      const [scored0] = scorer.score([route0, route1]);

      expect(scored0.labels).toEqual(
        expect.arrayContaining([RouteLabel.FASTEST, RouteLabel.SHORTEST]),
      );
      expect(scored0.labels).not.toContain(RouteLabel.CHEAPEST);
    });

    it('route 1 should have only CHEAPEST', () => {
      const [, scored1] = scorer.score([route0, route1]);

      expect(scored1.labels).toEqual([RouteLabel.CHEAPEST]);
    });
  });

  // ──────────────────────────────────────────────
  // One route wins all three metrics
  // ──────────────────────────────────────────────

  describe('when one route wins all three metrics', () => {
    it('should assign all three labels to the dominant route', () => {
      const dominant = makeRoute(0, {
        distanceMeters: 800_000,
        durationSeconds: 28_000,
        grandTotal: 200,
      });
      const other = makeRoute(1, {
        distanceMeters: 900_000,
        durationSeconds: 32_000,
        grandTotal: 350,
      });

      const [scoredDominant, scoredOther] = scorer.score([dominant, other]);

      expect(scoredDominant.labels).toHaveLength(3);
      expect(scoredOther.labels).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────
  // Labels are replaced, not accumulated
  // ──────────────────────────────────────────────

  describe('label replacement', () => {
    it('should replace existing labels on the input route', () => {
      const route = makeRoute(0, {
        distanceMeters: 100_000,
        durationSeconds: 10_000,
        grandTotal: 100,
      });
      // Manually set stale labels to verify they are overwritten
      route.labels = [RouteLabel.FASTEST];

      const [scored] = scorer.score([route]);

      // Still gets all three (single route), but the key point is labels were rebuilt
      expect(scored.labels).toContain(RouteLabel.CHEAPEST);
      expect(scored.labels).toContain(RouteLabel.SHORTEST);
    });
  });

  // ──────────────────────────────────────────────
  // Tie-breaking — first route wins on equal value
  // ──────────────────────────────────────────────

  describe('tie-breaking', () => {
    it('should give CHEAPEST to the first route when both have the same grandTotal', () => {
      const route0 = makeRoute(0, {
        distanceMeters: 900_000,
        durationSeconds: 30_000,
        grandTotal: 300,
      });
      const route1 = makeRoute(1, {
        distanceMeters: 800_000,
        durationSeconds: 28_000,
        grandTotal: 300, // same cost
      });

      const [scored0] = scorer.score([route0, route1]);

      expect(scored0.labels).toContain(RouteLabel.CHEAPEST);
    });
  });

  // ──────────────────────────────────────────────
  // Original route objects are not mutated
  // ──────────────────────────────────────────────

  describe('immutability', () => {
    it('should not mutate the original route objects', () => {
      const route = makeRoute(0, {
        distanceMeters: 100_000,
        durationSeconds: 10_000,
        grandTotal: 100,
      });
      const originalLabels = [...route.labels];

      scorer.score([route]);

      expect(route.labels).toEqual(originalLabels);
    });
  });
});
