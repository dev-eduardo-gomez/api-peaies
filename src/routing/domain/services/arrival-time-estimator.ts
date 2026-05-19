import { Injectable } from '@nestjs/common';
import { ArrivalInfo } from '../model/arrival-info.model';

export interface ArrivalEstimationParams {
  distanceMeters: number;
  durationSeconds: number;
  departureTime: Date;
  trafficDelaySeconds?: number;
}

@Injectable()
export class ArrivalTimeEstimator {
  estimate(params: ArrivalEstimationParams): ArrivalInfo {
    const { durationSeconds, departureTime, trafficDelaySeconds = 0 } = params;
    const totalSeconds = durationSeconds + trafficDelaySeconds;

    return {
      estimatedArrival: new Date(departureTime.getTime() + totalSeconds * 1000),
      durationSeconds,
      trafficDelaySeconds,
    };
  }
}
