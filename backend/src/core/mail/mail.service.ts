import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as tls from 'tls';
import * as net from 'net';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
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
    const from = this.configService.get<string>('SMTP_FROM') || 'Project Nexus <nexus@gmail.com>';

    // Log the email content explicitly in all environments so testing without SMTP credentials is easy
    this.logger.log(`\n=================== [OUTGOING EMAIL] ===================
To: ${options.to}
From: ${from}
Subject: ${options.subject}
Content:
${options.text || options.html}
========================================================\n`);

    if (!host || !user || !pass) {
      this.logger.warn(
        'SMTP credentials not fully configured in .env. Email printed to console above.',
      );
      return true;
    }

    try {
      await this.sendViaSmtp({
        host,
        port,
        user,
        pass,
        from,
        to: options.to,
        subject: options.subject,
        html: options.html || options.text || '',
      });
      this.logger.log(`Email successfully delivered to ${options.to}`);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to send email to ${options.to} via SMTP: ${msg}`);
      return false;
    }
  }

  private sendViaSmtp(params: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
    to: string;
    subject: string;
    html: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      const isSecure = params.port === 465;
      let socket: net.Socket | tls.TLSSocket;

      const connectOpts = { host: params.host, port: params.port };
      if (isSecure) {
        socket = tls.connect(connectOpts);
      } else {
        socket = net.createConnection(connectOpts);
      }

      let step = 0;
      let buffer = '';

      const send = (cmd: string): void => {
        socket.write(`${cmd}\r\n`);
      };

      socket.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line) continue;
          const code = parseInt(line.substring(0, 3), 10);
          if (line.charAt(3) === '-') continue; // multiline reply

          if (code >= 400) {
            socket.end();
            return reject(new Error(`SMTP Error: ${line}`));
          }

          if (step === 0 && code === 220) {
            step++;
            send(`EHLO localhost`);
          } else if (step === 1 && code === 250) {
            step++;
            send('AUTH LOGIN');
          } else if (step === 2 && code === 334) {
            step++;
            send(Buffer.from(params.user).toString('base64'));
          } else if (step === 3 && code === 334) {
            step++;
            send(Buffer.from(params.pass).toString('base64'));
          } else if (step === 4 && code === 235) {
            step++;
            const cleanFrom = params.from.includes('<')
              ? params.from.substring(params.from.indexOf('<') + 1, params.from.indexOf('>'))
              : params.from;
            send(`MAIL FROM:<${cleanFrom}>`);
          } else if (step === 5 && code === 250) {
            step++;
            send(`RCPT TO:<${params.to}>`);
          } else if (step === 6 && code === 250) {
            step++;
            send('DATA');
          } else if (step === 7 && code === 354) {
            step++;
            const emailBody = [
              `From: ${params.from}`,
              `To: ${params.to}`,
              `Subject: =?UTF-8?B?${Buffer.from(params.subject).toString('base64')}?=`,
              'MIME-Version: 1.0',
              'Content-Type: text/html; charset=UTF-8',
              '',
              params.html,
              '.',
            ].join('\r\n');
            send(emailBody);
          } else if (step === 8 && code === 250) {
            step++;
            send('QUIT');
            resolve();
          }
        }
      });

      socket.on('error', (err) => {
        reject(err);
      });

      socket.setTimeout(15000, () => {
        socket.destroy();
        reject(new Error('SMTP Connection timeout'));
      });
    });
  }
}
