import { Injectable } from '@nestjs/common';
import { CalculateTollCommand } from '../../../domain/ports/in/calculate-toll.use-case';
import { TollguruRequestDto } from './dto/tollguru-request.dto';

@Injectable()
export class TollguruRequestBuilder {
  build(
    command: CalculateTollCommand,
    vehicleTypeCode: string,
  ): TollguruRequestDto {
    return {
      vehicle: { type: vehicleTypeCode },
      departure: command.departureTime
        ? command.departureTime.toISOString()
        : 'now',
      source: [command.origin.lat, command.origin.lng],
      destination: [command.destination.lat, command.destination.lng],
      waypoints: (command.waypoints ?? []).map((w) => [w.lat, w.lng]),
      currency: 'MXN',
    };
  }
}
