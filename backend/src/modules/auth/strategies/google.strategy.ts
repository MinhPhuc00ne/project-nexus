import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-google-oauth20';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
    const clientSecret =
      configService.get<string>('GOOGLE_CLIENT_SECRET') || process.env.GOOGLE_CLIENT_SECRET;
    const callbackURL =
      configService.get<string>('GOOGLE_CALLBACK_URL') ||
      process.env.GOOGLE_CALLBACK_URL ||
      'http://localhost:3000/api/v1/auth/google/callback';

    if (!clientID || !clientSecret) {
      Logger.warn(
        'GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET chưa được cấu hình trong .env. Tính năng Google OAuth sẽ không hoạt động.',
        GoogleStrategy.name,
      );
    }

    super({
      clientID: clientID || 'google-client-id-not-configured',
      clientSecret: clientSecret || 'google-client-secret-not-configured',
      callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: Record<string, unknown>,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    const { name, emails, photos } = profile as {
      name?: { givenName?: string; familyName?: string };
      emails?: { value: string }[];
      photos?: { value: string }[];
    };

    const user = {
      email: emails?.[0]?.value,
      firstName: name?.givenName,
      lastName: name?.familyName,
      picture: photos?.[0]?.value,
      accessToken,
    };

    done(null, user);
  }
}
