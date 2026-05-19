import { ArrivalTimeEstimator } from './arrival-time-estimator';

describe('ArrivalTimeEstimator', () => {
  let estimator: ArrivalTimeEstimator;

  // Fixed departure for deterministic tests
  const DEPARTURE = new Date('2025-05-20T08:00:00.000Z');

  beforeEach(() => {
    estimator = new ArrivalTimeEstimator();
  });

  // ──────────────────────────────────────────────
  // Basic estimation
  // ──────────────────────────────────────────────

  describe('basic estimation', () => {
    it('should add durationSeconds to departureTime to get estimatedArrival', () => {
      // 8:00 + 32520s (~9h03m) = 17:02:00
      const result = estimator.estimate({
        distanceMeters: 921_400,
        durationSeconds: 32_520,
        departureTime: DEPARTURE,
      });

      const expectedArrival = new Date('2025-05-20T17:02:00.000Z');
      expect(result.estimatedArrival.getTime()).toBe(expectedArrival.getTime());
    });

    it('should return the same durationSeconds passed in params', () => {
      const result = estimator.estimate({
        distanceMeters: 100_000,
        durationSeconds: 7_200,
        departureTime: DEPARTURE,
      });

      expect(result.durationSeconds).toBe(7_200);
    });
  });

  // ──────────────────────────────────────────────
  // Traffic delay
  // ──────────────────────────────────────────────

  describe('traffic delay', () => {
    it('should default trafficDelaySeconds to 0 when not provided', () => {
      const result = estimator.estimate({
        distanceMeters: 100_000,
        durationSeconds: 3_600,
        departureTime: DEPARTURE,
      });

      expect(result.trafficDelaySeconds).toBe(0);
    });

    it('should add trafficDelaySeconds to the estimated arrival', () => {
      const durationSeconds = 32_520;
      const trafficDelaySeconds = 1_800; // 30 min of traffic

      const result = estimator.estimate({
        distanceMeters: 921_400,
        durationSeconds,
        departureTime: DEPARTURE,
        trafficDelaySeconds,
      });

      const expectedMs =
        DEPARTURE.getTime() + (durationSeconds + trafficDelaySeconds) * 1000;
      expect(result.estimatedArrival.getTime()).toBe(expectedMs);
    });

    it('should return trafficDelaySeconds in the result', () => {
      const result = estimator.estimate({
        distanceMeters: 100_000,
        durationSeconds: 3_600,
        departureTime: DEPARTURE,
        trafficDelaySeconds: 900,
      });

      expect(result.trafficDelaySeconds).toBe(900);
    });

    it('should NOT add trafficDelaySeconds to durationSeconds in the result', () => {
      // durationSeconds in the result must be the route duration alone — not including delay
      const result = estimator.estimate({
        distanceMeters: 100_000,
        durationSeconds: 3_600,
        departureTime: DEPARTURE,
        trafficDelaySeconds: 1_800,
      });

      expect(result.durationSeconds).toBe(3_600);
    });
  });

  // ──────────────────────────────────────────────
  // Zero / instant arrival
  // ──────────────────────────────────────────────

  describe('zero duration', () => {
    it('should return the departure time as estimated arrival when duration is 0', () => {
      const result = estimator.estimate({
        distanceMeters: 0,
        durationSeconds: 0,
        departureTime: DEPARTURE,
      });

      expect(result.estimatedArrival.getTime()).toBe(DEPARTURE.getTime());
    });
  });

  // ──────────────────────────────────────────────
  // Cross-midnight trip
  // ──────────────────────────────────────────────

  describe('cross-midnight trip', () => {
    it('should correctly estimate arrival on the next day', () => {
      // Depart at 22:00, 5 hours trip → arrive 03:00 next day
      const lateNightDeparture = new Date('2025-05-20T22:00:00.000Z');

      const result = estimator.estimate({
        distanceMeters: 400_000,
        durationSeconds: 5 * 3_600, // 5 hours
        departureTime: lateNightDeparture,
      });

      const expectedArrival = new Date('2025-05-21T03:00:00.000Z');
      expect(result.estimatedArrival.getTime()).toBe(expectedArrival.getTime());
    });
  });
});
