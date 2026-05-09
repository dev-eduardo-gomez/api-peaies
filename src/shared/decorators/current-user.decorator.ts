import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRequest } from '../../auth/domain/model/auth-user.model';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<UserRequest>();
    return request.user.userId;
  },
);
