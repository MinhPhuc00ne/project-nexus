import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ProviderConfigService } from '../providers/provider-config.service';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  sensitive?: boolean;
  requireDelivery?: boolean;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly providers: ProviderConfigService,
  ) {}

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    // MAIL_PROVIDER=console is how a local or demo run reads its own OTP
    // codes. It is chosen deliberately, and production refuses to boot with
    // it, so this is no longer a silent fallback for missing credentials.
    if (this.providers.isMailConsole()) {
      this.logger.log(`[mail:console] to=${options.to} subject=${options.subject}`);
      if (!options.sensitive) {
        this.logger.debug(options.text || options.html || '');
      }
      return true;
    }

    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('SMTP_FROM') || user;
    if (!host || !user || !pass || !from) {
      // MAIL_PROVIDER=smtp is validated at boot, so reaching here means the
      // configuration changed underneath a running process.
      this.logger.error(
        'MAIL_PROVIDER=smtp but SMTP credentials are incomplete; refusing to send.',
      );
      return false;
    }
    try {
      const transport = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        requireTLS: port !== 465,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        dnsTimeout: 10000,
        logger: false,
        debug: false,
      });
      const result = await transport.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      const accepted = result.accepted.some(
        (address) => address.toLowerCase() === options.to.toLowerCase(),
      );
      if (!accepted) this.logger.warn('SMTP chưa chấp nhận người nhận email.');
      return accepted;
    } catch {
      // SMTP errors can contain server responses or message data; never log credentials or content.
      this.logger.error('Gửi email qua SMTP thất bại.');
      return false;
    }
  }
}
