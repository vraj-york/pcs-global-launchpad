import { Injectable, Logger } from '@nestjs/common';
import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
} from '@aws-sdk/client-ses';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface SendEmailWithPdfAttachmentsParams {
  to: string;
  subject: string;
  textBody: string;
  /** When set, MIME uses multipart/alternative (plain + HTML) before attachment parts. */
  htmlBody?: string;
  attachments: {
    filename: string;
    content: Buffer;
    /** Defaults to application/pdf when omitted (backward compatible). */
    contentType?: string;
  }[];
}

function wrapBase64(b64: string): string {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    lines.push(b64.slice(i, i + 76));
  }
  return lines.join('\r\n');
}

function mimeBoundary(prefix: string): string {
  return `----=_${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function utf8Base64Lines(s: string): string {
  return wrapBase64(Buffer.from(s, 'utf-8').toString('base64'));
}

function buildRawMimeMessage(params: {
  from: string;
  to: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  attachments: {
    filename: string;
    content: Buffer;
    contentType?: string;
  }[];
}): Buffer {
  const mixedBoundary = mimeBoundary('Mixed');
  const parts: string[] = [];
  parts.push(`From: ${params.from}`);
  parts.push(`To: ${params.to}`);
  parts.push(`Subject: ${params.subject}`);
  parts.push('MIME-Version: 1.0');
  parts.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  parts.push('');

  if (params.htmlBody !== undefined && params.htmlBody.length > 0) {
    const altBoundary = mimeBoundary('Alt');
    parts.push(`--${mixedBoundary}`);
    parts.push(
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    );
    parts.push('');
    parts.push(`--${altBoundary}`);
    parts.push('Content-Type: text/plain; charset=UTF-8');
    parts.push('Content-Transfer-Encoding: base64');
    parts.push('');
    parts.push(utf8Base64Lines(params.textBody));
    parts.push(`--${altBoundary}`);
    parts.push('Content-Type: text/html; charset=UTF-8');
    parts.push('Content-Transfer-Encoding: base64');
    parts.push('');
    parts.push(utf8Base64Lines(params.htmlBody));
    parts.push(`--${altBoundary}--`);
    parts.push('');
  } else {
    parts.push(`--${mixedBoundary}`);
    parts.push('Content-Type: text/plain; charset=UTF-8');
    parts.push('Content-Transfer-Encoding: base64');
    parts.push('');
    parts.push(utf8Base64Lines(params.textBody));
    parts.push('');
  }

  for (const att of params.attachments) {
    const safeName = att.filename.replace(/[^\w.-]+/g, '_');
    const body = Buffer.isBuffer(att.content)
      ? att.content
      : Buffer.from(att.content ?? []);
    if (body.length === 0) {
      throw new Error(`Attachment "${safeName}" is empty`);
    }
    const b64 = wrapBase64(body.toString('base64'));
    const contentType = att.contentType ?? 'application/pdf';
    parts.push(`--${mixedBoundary}`);
    parts.push(`Content-Type: ${contentType}`);
    parts.push(`Content-Disposition: attachment; filename="${safeName}"`);
    parts.push('Content-Transfer-Encoding: base64');
    parts.push('');
    parts.push(b64);
  }
  parts.push(`--${mixedBoundary}--`);
  parts.push('');
  return Buffer.from(parts.join('\r\n'), 'utf-8');
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly sesClient: SESClient;
  private readonly senderEmail: string;

  constructor() {
    const region = process.env.AWS_REGION || 'us-east-1';

    // Build SES client configuration
    const sesConfig: {
      region: string;
      credentials?: {
        accessKeyId: string;
        secretAccessKey: string;
      };
    } = { region };

    // Use explicit credentials if provided via environment variables
    // This allows SES to work for users without AWS CLI configured
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    if (accessKeyId && secretAccessKey) {
      sesConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      };
      this.logger.log(
        'SES client configured with explicit AWS credentials from environment variables',
      );
    } else {
      this.logger.warn(
        'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY not set. SES will use default credential chain (AWS CLI config, IAM role, etc.)',
      );
    }

    this.sesClient = new SESClient(sesConfig);

    const senderEmail = process.env.SES_SENDER_EMAIL;
    if (!senderEmail) {
      throw new Error('SES_SENDER_EMAIL environment variable is not set');
    }
    this.senderEmail = senderEmail; // TODO: Update this to the actual sender email
  }

  async sendEmail(params: SendEmailParams): Promise<boolean> {
    const { to, subject, htmlBody, textBody } = params;
    const toAddresses = Array.isArray(to) ? to : [to];

    try {
      await this.sesClient.send(
        new SendEmailCommand({
          Source: this.senderEmail,
          Destination: {
            ToAddresses: toAddresses,
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: htmlBody,
                Charset: 'UTF-8',
              },
              Text: {
                Data: textBody,
                Charset: 'UTF-8',
              },
            },
          },
        }),
      );
      return true;
    } catch (error) {
      this.logger.error(`Error sending email: ${(error as Error).message}`);
      return false;
    }
  }

  /**
   * Sends a plain-text email with one or more binary attachments via SES (raw MIME).
   * Defaults each part to `application/pdf` when `contentType` is omitted.
   */
  async sendEmailWithPdfAttachments(
    params: SendEmailWithPdfAttachmentsParams,
  ): Promise<boolean> {
    const { to, subject, textBody, htmlBody, attachments } = params;
    if (attachments.length === 0) {
      return true;
    }
    try {
      const raw = buildRawMimeMessage({
        from: this.senderEmail,
        to,
        subject,
        textBody,
        htmlBody,
        attachments,
      });
      await this.sesClient.send(
        new SendRawEmailCommand({
          Source: this.senderEmail,
          Destinations: [to],
          RawMessage: { Data: raw },
        }),
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending raw email with attachments: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
