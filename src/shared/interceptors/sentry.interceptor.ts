import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import * as Sentry from '@sentry/node';

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user } = request;

    Sentry.setTag('http.method', method);
    Sentry.setTag('http.url', url);

    if (user?.userId) {
      Sentry.setUser({ id: user.userId });
      Sentry.setTag('userId', user.userId);
    }

    Sentry.addBreadcrumb({
      category: 'http',
      message: `${method} ${url}`,
      level: 'info',
    });

    return next.handle().pipe(
      tap({
        error: (error) => Sentry.captureException(error),
      }),
    );
  }
}
