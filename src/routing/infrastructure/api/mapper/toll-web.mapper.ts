import { TollCalculation } from '../../../domain/model/toll-calculation.model';
import { RouteDiff } from '../../../domain/model/route-diff.model';
import { Route } from '../../../domain/model/route.model';
import { TollCalculationResponseDto, VehicleSummaryDto } from '../../../application/dto/toll-calculation-response.dto';
import { CompareRoutesResponseDto } from '../../../application/dto/compare-routes-response.dto';
import { TollCalculationSummaryDto } from '../../../application/dto/toll-calculation-summary.dto';
import { RouteDto } from '../../../application/dto/route.dto';
import { CostBreakdownDto } from '../../../application/dto/cost-breakdown.dto';
import { TollEventDto } from '../../../application/dto/toll-event.dto';

export class TollWebMapper {
  static toCalculationResponse(
    calculation: TollCalculation,
    vehicle: VehicleSummaryDto,
  ): TollCalculationResponseDto {
    return {
      calculationId: calculation.id,
      vehicle,
      origin: calculation.origin,
      destination: calculation.destination,
      routes: calculation.routes.map((r) => TollWebMapper.toRouteDto(r)),
      provider: calculation.provider,
      calculatedAt: calculation.calculatedAt,
    };
  }

  static toRouteDto(route: Route): RouteDto {
    return {
      routeIndex: route.routeIndex,
      labels: route.labels,
      hasTolls: route.hasTolls,
      distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
      durationMinutes: Math.round(route.durationSeconds / 60),
      tollCount: route.tollCount,
      costs: TollWebMapper.toCostBreakdownDto(route),
      tolls: route.tolls.map(
        (t): TollEventDto => ({
          sequence: t.sequence,
          boothId: t.boothId,
          boothName: t.boothName,
          lat: t.lat,
          lng: t.lng,
          cashCost: t.cashCost.amount,
          tagCost: t.tagCost.amount,
          costApplied: t.costApplied.amount,
          paymentMethod: t.paymentMethod,
          eventType: t.eventType,
          arrivalTime: t.arrivalTime,
        }),
      ),
      estimatedArrival: route.arrival.estimatedArrival,
      googleMapsUrl: route.googleMapsUrl,
    };
  }

  static toCostBreakdownDto(route: Route): CostBreakdownDto {
    return {
      tagCost: route.costs.tagCost.amount,
      cashCost: route.costs.cashCost.amount,
      fuelCost: route.costs.fuelCost.amount,
      grandTotal: route.costs.grandTotal.amount,
      currency: route.costs.grandTotal.currency,
    };
  }

  static toCompareRoutesResponse(diff: RouteDiff): CompareRoutesResponseDto {
    const timeDifferenceMinutes = Math.round(Math.abs(diff.timeDifferenceSeconds) / 60);
    const costDifferenceMxn = Math.abs(diff.costDifference.amount);

    let recommendation: string;
    if (diff.isSameRoute) {
      recommendation = 'La ruta más rápida y la más barata coinciden.';
    } else if (costDifferenceMxn < 100) {
      recommendation = `La diferencia de costo es mínima ($${costDifferenceMxn.toFixed(2)} MXN). Se recomienda la ruta más rápida.`;
    } else {
      recommendation = `La ruta más barata ahorra $${costDifferenceMxn.toFixed(2)} MXN a costa de ${timeDifferenceMinutes} minutos adicionales.`;
    }

    return {
      isSameRoute: diff.isSameRoute,
      fasterRoute: TollWebMapper.toRouteDto(diff.fasterRoute),
      cheaperRoute: TollWebMapper.toRouteDto(diff.cheaperRoute),
      comparison: { timeDifferenceMinutes, costDifferenceMxn, recommendation },
    };
  }

  static toSummaryDto(calculation: TollCalculation): TollCalculationSummaryDto {
    return {
      calculationId: calculation.id,
      origin: {
        lat: calculation.origin.lat,
        lng: calculation.origin.lng,
        address: calculation.origin.address,
      },
      destination: {
        lat: calculation.destination.lat,
        lng: calculation.destination.lng,
        address: calculation.destination.address,
      },
      routeCount: calculation.routeCount ?? calculation.routes.length,
      cheapestRouteCost: calculation.cheapestRouteCost ?? 0,
      currency: 'MXN',
      provider: calculation.provider,
      calculatedAt: calculation.calculatedAt,
    };
  }
}
