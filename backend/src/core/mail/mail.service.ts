import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
  constructor(private readonly configService: ConfigService) {}

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const from = this.configService.get<string>('SMTP_FROM') || user;
    if (!host || !user || !pass || !from) {
      this.logger.warn('SMTP chưa được cấu hình; email chưa được gửi.');
      if (!options.sensitive && this.configService.get<string>('NODE_ENV') === 'development') {
        this.logger.debug(options.text || options.html || '');
      }
      return !options.requireDelivery;
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
