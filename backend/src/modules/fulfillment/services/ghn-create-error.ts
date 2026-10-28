import { BadGatewayException } from '@nestjs/common';

/** GHN explicitly rejected creation; unlike network failures this is safe to retry. */
export class GhnCreateRejectedException extends BadGatewayException {}
