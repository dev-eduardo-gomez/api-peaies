import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { TollguruRequestDto } from './dto/tollguru-request.dto';
import { TollguruResponseDto } from './dto/tollguru-response.dto';
import { TollProviderException } from '../../../domain/exceptions/toll-provider.exception';

const TOLLGURU_URL = 'https://api.tollguru.com/v2/gps-toll-by-waypoints';

@Injectable()
export class TollguruClient {
  private readonly logger = new Logger(TollguruClient.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  async post(request: TollguruRequestDto): Promise<TollguruResponseDto> {
    const apiKey = this.config.get<string>('TOLLGURU_API_KEY');

    try {
      const response = await firstValueFrom(
        this.httpService.post<TollguruResponseDto>(TOLLGURU_URL, request, {
          headers: { 'x-api-key': apiKey },
          timeout: 15_000,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('TollGuru API request failed', error);
      throw new TollProviderException('TOLLGURU', error as Error);
    }
  }
}
