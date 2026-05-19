import { Injectable } from '@nestjs/common';
import { Route } from '../model/route.model';
import { RouteLabel } from '../model/route-label.enum';

@Injectable()
export class RouteScorer {
  score(routes: Route[]): Route[] {
    if (routes.length === 0) return [];

    const cheapest = this.minBy(routes, (r) => r.costs.grandTotal.amount);
    const fastest = this.minBy(routes, (r) => r.durationSeconds);
    const shortest = this.minBy(routes, (r) => r.distanceMeters);

    return routes.map((route) => {
      const labels: RouteLabel[] = [];

      if (route === cheapest) labels.push(RouteLabel.CHEAPEST);
      if (route === fastest) labels.push(RouteLabel.FASTEST);
      if (route === shortest) labels.push(RouteLabel.SHORTEST);

      return { ...route, labels };
    });
  }

  private minBy<T>(items: T[], by: (item: T) => number): T {
    return items.reduce((min, item) => (by(item) < by(min) ? item : min));
  }
}
