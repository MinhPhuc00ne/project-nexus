import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { AuthProfileService } from './services/auth-profile.service';
import { StaffProvisioningService } from './services/staff-provisioning.service';
import { OAuthCodeService } from './services/oauth-code.service';
import { StaffController } from './controllers/staff.controller';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET') || process.env.JWT_SECRET;
        if (!secret) {
          throw new Error('JWT_SECRET is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
              '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController, StaffController],
  providers: [
    AuthService,
    AuthProfileService,
    StaffProvisioningService,
    OAuthCodeService,
    GoogleStrategy,
  ],
  exports: [AuthService, AuthProfileService, StaffProvisioningService, JwtModule, PassportModule],
})
export class AuthModule {}
