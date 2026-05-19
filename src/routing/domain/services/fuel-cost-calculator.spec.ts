import { FuelCostCalculator, FuelCostParams } from './fuel-cost-calculator';

describe('FuelCostCalculator', () => {
  let calculator: FuelCostCalculator;

  const BASE_PARAMS: FuelCostParams = {
    distanceMeters: 100_000,
    cityRatio: 0.2,
    cityKmpl: 10,
    hwyKmpl: 14,
    fuelPricePerLiter: 22.5,
    currency: 'MXN',
  };

  beforeEach(() => {
    calculator = new FuelCostCalculator();
  });

  // ──────────────────────────────────────────────
  // Zero / guard cases
  // ──────────────────────────────────────────────

  describe('when distanceMeters is zero or negative', () => {
    it('should return zero amount when distanceMeters is 0', () => {
      const result = calculator.calculate({
        ...BASE_PARAMS,
        distanceMeters: 0,
      });

      expect(result.amount).toBe(0);
      expect(result.currency).toBe('MXN');
    });

    it('should return zero amount when distanceMeters is negative', () => {
      const result = calculator.calculate({
        ...BASE_PARAMS,
        distanceMeters: -500,
      });

      expect(result.amount).toBe(0);
    });
  });

  describe('when both efficiency values are zero', () => {
    it('should return zero amount when cityKmpl and hwyKmpl are both 0', () => {
      const result = calculator.calculate({
        ...BASE_PARAMS,
        cityKmpl: 0,
        hwyKmpl: 0,
      });

      expect(result.amount).toBe(0);
    });
  });

  // ──────────────────────────────────────────────
  // Partial efficiency — one segment = 0
  // ──────────────────────────────────────────────

  describe('when only one efficiency value is zero', () => {
    it('should compute cost using only hwyKmpl when cityKmpl is 0', () => {
      // 100 km × 20% city = 20 km city (skipped), 80 km hwy / 14 kmpl = 5.714 L × 22.5 = 128.57
      const result = calculator.calculate({ ...BASE_PARAMS, cityKmpl: 0 });

      expect(result.amount).toBeCloseTo(128.57, 1);
    });

    it('should compute cost using only cityKmpl when hwyKmpl is 0', () => {
      // 100 km × 20% city = 20 km / 10 kmpl = 2 L × 22.5 = 45, hwy skipped
      const result = calculator.calculate({ ...BASE_PARAMS, hwyKmpl: 0 });

      expect(result.amount).toBeCloseTo(45, 1);
    });
  });

  // ──────────────────────────────────────────────
  // cityRatio clamping
  // ──────────────────────────────────────────────

  describe('cityRatio clamping', () => {
    it('should treat cityRatio > 1 as 1 (100% city)', () => {
      // 100 km all city / 10 kmpl = 10 L × 22.5 = 225
      const result = calculator.calculate({ ...BASE_PARAMS, cityRatio: 2 });

      expect(result.amount).toBeCloseTo(225, 1);
    });

    it('should treat cityRatio < 0 as 0 (100% highway)', () => {
      // 100 km all hwy / 14 kmpl = 7.142 L × 22.5 = 160.71
      const result = calculator.calculate({ ...BASE_PARAMS, cityRatio: -0.5 });

      expect(result.amount).toBeCloseTo(160.71, 1);
    });
  });

  // ──────────────────────────────────────────────
  // Real-world example: CDMX → Monterrey (921 km)
  // ──────────────────────────────────────────────

  describe('CDMX to Monterrey — 921 km, Nissan Versa', () => {
    it('should calculate correct fuel cost', () => {
      // distanceKm = 921.4
      // cityKm     = 921.4 × 0.2 = 184.28 → 184.28 / 10.5 = 17.55 L
      // hwyKm      = 921.4 × 0.8 = 737.12 → 737.12 / 14.2 = 51.91 L
      // total      = 69.46 L × 22.5 = 1562.85 MXN
      const result = calculator.calculate({
        distanceMeters: 921_400,
        cityRatio: 0.2,
        cityKmpl: 10.5,
        hwyKmpl: 14.2,
        fuelPricePerLiter: 22.5,
        currency: 'MXN',
      });

      expect(result.amount).toBeCloseTo(1562.85, 0);
      expect(result.currency).toBe('MXN');
    });
  });

  // ──────────────────────────────────────────────
  // Currency passthrough
  // ──────────────────────────────────────────────

  describe('currency', () => {
    it('should return USD in result when currency is USD', () => {
      const result = calculator.calculate({ ...BASE_PARAMS, currency: 'USD' });

      expect(result.currency).toBe('USD');
    });

    it('should return zero amount with correct currency when distance is 0', () => {
      const result = calculator.calculate({
        ...BASE_PARAMS,
        distanceMeters: 0,
        currency: 'USD',
      });

      expect(result.amount).toBe(0);
      expect(result.currency).toBe('USD');
    });
  });

  // ──────────────────────────────────────────────
  // Rounding
  // ──────────────────────────────────────────────

  describe('rounding', () => {
    it('should round result to 2 decimal places', () => {
      const result = calculator.calculate({
        distanceMeters: 1_000,
        cityRatio: 0,
        cityKmpl: 14,
        hwyKmpl: 14,
        fuelPricePerLiter: 22.333,
        currency: 'MXN',
      });

      // 1 km / 14 kmpl = 0.07142 L × 22.333 = 1.5952... → rounds to 1.60
      const decimals = result.amount.toString().split('.')[1]?.length ?? 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });
});
