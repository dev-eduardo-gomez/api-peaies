import { Coordinate } from './coordinate.model';

export interface DirectionStep {
  sequence: number;
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  coordinate: Coordinate;
}
