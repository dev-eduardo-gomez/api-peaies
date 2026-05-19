import { TollCostAggregator } from './toll-cost-aggregator';
import { TollBooth } from '../model/toll-booth.model';
import { PaymentMethod } from '../model/payment-method.enum';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function makeBooth(sequence: number, cash: number, tag: number): TollBooth {
  return {
    sequence,
    boothName: `Caseta ${sequence}`,
    cashCost: { amount: cash, currency: 'MXN' },
    tagCost: { amount: tag, currency: 'MXN' },
    costApplied: { amount: cash, currency: 'MXN' },
    paymentMethod: PaymentMethod.CASH,
    eventType: 'PAY',
  };
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe('TollCostAggregator', () => {
  let aggregator: TollCostAggregator;

  beforeEach(() => {
    aggregator = new TollCostAggregator();
  });

  // ──────────────────────────────────────────────
  // Empty / guard cases
  // ──────────────────────────────────────────────

  describe('when tolls array is empty', () => {
    it('should return zero for both cashCost and tagCost', () => {
      const result = aggregator.aggregate([], 'MXN');

      expect(result.cashCost.amount).toBe(0);
      expect(result.tagCost.amount).toBe(0);
    });

    it('should return the requested currency', () => {
      const result = aggregator.aggregate([], 'MXN');

      expect(result.cashCost.currency).toBe('MXN');
      expect(result.tagCost.currency).toBe('MXN');
    });
  });

  // ──────────────────────────────────────────────
  // Single toll
  // ──────────────────────────────────────────────

  describe('when there is a single toll', () => {
    it('should return its cash and tag costs directly', () => {
      const result = aggregator.aggregate([makeBooth(1, 55, 44)], 'MXN');

      expect(result.cashCost.amount).toBe(55);
      expect(result.tagCost.amount).toBe(44);
    });
  });

  // ──────────────────────────────────────────────
  // Multiple tolls — Route 1 from mock provider
  // Carmen → Monterrey vía 180D: 6 casetas
  // cash: 45+60+55+70+50+80 = 360
  // tag:  36+48+44+56+40+64 = 288
  // ──────────────────────────────────────────────

  describe('Route 1 — Carmen to Monterrey via 180D (6 booths)', () => {
    const ROUTE_1_BOOTHS: TollBooth[] = [
      makeBooth(1, 45, 36),
      makeBooth(2, 60, 48),
      makeBooth(3, 55, 44),
      makeBooth(4, 70, 56),
      makeBooth(5, 50, 40),
      makeBooth(6, 80, 64),
    ];

    it('should sum cashCost across all booths', () => {
      const result = aggregator.aggregate(ROUTE_1_BOOTHS, 'MXN');

      expect(result.cashCost.amount).toBe(360);
    });

    it('should sum tagCost across all booths', () => {
      const result = aggregator.aggregate(ROUTE_1_BOOTHS, 'MXN');

      expect(result.tagCost.amount).toBe(288);
    });

    it('should tag always be less than cash', () => {
      const result = aggregator.aggregate(ROUTE_1_BOOTHS, 'MXN');

      expect(result.tagCost.amount).toBeLessThan(result.cashCost.amount);
    });
  });

  // ──────────────────────────────────────────────
  // Route 2 — Carmen → Monterrey vía Coatzacoalcos: 4 casetas
  // cash: 40+45+55+75 = 215
  // tag:  32+36+44+60 = 172
  // ──────────────────────────────────────────────

  describe('Route 2 — Carmen to Monterrey via Coatzacoalcos (4 booths)', () => {
    const ROUTE_2_BOOTHS: TollBooth[] = [
      makeBooth(1, 40, 32),
      makeBooth(2, 45, 36),
      makeBooth(3, 55, 44),
      makeBooth(4, 75, 60),
    ];

    it('should return cash = 215 and tag = 172', () => {
      const result = aggregator.aggregate(ROUTE_2_BOOTHS, 'MXN');

      expect(result.cashCost.amount).toBe(215);
      expect(result.tagCost.amount).toBe(172);
    });
  });

  // ──────────────────────────────────────────────
  // Floating point precision
  // ──────────────────────────────────────────────

  describe('floating point precision', () => {
    it('should round result to 2 decimal places', () => {
      // 0.1 + 0.2 = 0.30000000000000004 in JavaScript — roundMxn must handle this
      const booths = [makeBooth(1, 0.1, 0.1), makeBooth(2, 0.2, 0.2)];

      const result = aggregator.aggregate(booths, 'MXN');

      expect(result.cashCost.amount).toBe(0.3);
      expect(result.tagCost.amount).toBe(0.3);
    });
  });

  // ──────────────────────────────────────────────
  // Currency passthrough
  // ──────────────────────────────────────────────

  describe('currency', () => {
    it('should return USD in result when currency is USD', () => {
      const result = aggregator.aggregate([makeBooth(1, 10, 8)], 'USD');

      expect(result.cashCost.currency).toBe('USD');
      expect(result.tagCost.currency).toBe('USD');
    });
  });
});
