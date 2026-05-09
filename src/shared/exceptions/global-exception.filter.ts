import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as Sentry from '@sentry/node';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal error';
    let validationErrors: any[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exResponse = exception.getResponse();

      if (typeof exResponse === 'string') {
        message = exResponse;
      } else if (typeof exResponse === 'object' && exResponse !== null) {
        const obj = exResponse as any;
        message = obj.message || exception.message;

        if (Array.isArray(obj.message)) {
          validationErrors = obj.message;
          message = 'La validación del request falló';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${status}`,
        (exception as Error)?.stack,
      );
      Sentry.captureException(exception);
    } else {
      this.logger.warn(
        `${request.method} ${request.url} → ${status}: ${message}`,
      );
    }

    const body: any = {
      timestamp: new Date().toISOString(),
      status,
      error: HttpStatus[status] || 'Error',
      message,
      path: request.url,
    };

    if (validationErrors) {
      body.validationErrors = validationErrors;
    }

    response.status(status).json(body);
  }
}
