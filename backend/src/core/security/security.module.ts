import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ProfileReauthService } from './profile-reauth.service';
import { TokenAuthService } from './token-auth.service';

/**
 * Owns token authentication for the whole process.
 *
 * It is global because every entry point needs it: the HTTP guard, the three
 * WebSocket gateways, and the controllers that treat a viewer as optional. Each
 * of those used to verify tokens on its own, which is how the gateways ended up
 * accepting tokens from accounts that had since been suspended.
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        return { secret };
      },
    }),
  ],
  providers: [TokenAuthService, ProfileReauthService],
  exports: [TokenAuthService, ProfileReauthService, JwtModule],
})
export class SecurityModule {}
