import { BadGatewayException } from '@nestjs/common';

export class TollProviderException extends BadGatewayException {
  constructor(provider: string, cause?: Error) {
    super(`Toll provider '${provider}' failed to respond${cause ? `: ${cause.message}` : ''}`);
  }
}
