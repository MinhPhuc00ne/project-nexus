import { Module, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthService as ModularAuthService } from './services/auth.service';
import { AuthProfileService } from './services/auth-profile.service';
import { StaffProvisioningService } from './services/staff-provisioning.service';
import { StaffController } from './controllers/staff.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          process.env.JWT_SECRET ||
          'super-secret-jwt-key-nexus-change-in-production-2026',
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ||
            '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    forwardRef(() => UsersModule),
  ],
  controllers: [AuthController, StaffController],
  providers: [
    AuthService,
    ModularAuthService,
    AuthProfileService,
    StaffProvisioningService,
    JwtStrategy,
    GoogleStrategy,
  ],
  exports: [
    AuthService,
    ModularAuthService,
    AuthProfileService,
    StaffProvisioningService,
    JwtModule,
    PassportModule,
  ],
})
export class AuthModule {}
