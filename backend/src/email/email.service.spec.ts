import { SendEmailCommand, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { EmailService } from './email.service';

const mockSesSend = jest.fn();

jest.mock('@aws-sdk/client-ses', () => {
  const actual = jest.requireActual<typeof import('@aws-sdk/client-ses')>(
    '@aws-sdk/client-ses',
  );
  return {
    ...actual,
    SESClient: jest.fn().mockImplementation(() => ({ send: mockSesSend })),
  };
});

describe('EmailService', () => {
  const sender = 'finance@bspblueprint.com';
  let prevSesSender: string | undefined;

  beforeEach(() => {
    mockSesSend.mockReset().mockResolvedValue({});
    prevSesSender = process.env.SES_SENDER_EMAIL;
    process.env.SES_SENDER_EMAIL = sender;
  });

  afterEach(() => {
    if (prevSesSender !== undefined) {
      process.env.SES_SENDER_EMAIL = prevSesSender;
    } else {
      delete process.env.SES_SENDER_EMAIL;
    }
  });

  describe('constructor', () => {
    it('throws when SES_SENDER_EMAIL is not set', () => {
      delete process.env.SES_SENDER_EMAIL;
      expect(() => new EmailService()).toThrow(
        'SES_SENDER_EMAIL environment variable is not set',
      );
    });
  });

  describe('sendEmail', () => {
    let service: EmailService;

    beforeEach(() => {
      service = new EmailService();
    });

    it('sends SendEmailCommand and returns true on success', async () => {
      const result = await service.sendEmail({
        to: 'client@example.com',
        subject: 'Invoice',
        htmlBody: '<p>Hello</p>',
        textBody: 'Hello',
      });

      expect(result).toBe(true);
      expect(mockSesSend).toHaveBeenCalledTimes(1);
      const cmd = (mockSesSend.mock.calls as Array<[SendEmailCommand]>)[0][0];
      expect(cmd).toBeInstanceOf(SendEmailCommand);
      expect(cmd.input).toMatchObject({
        Source: sender,
        Destination: { ToAddresses: ['client@example.com'] },
        Message: {
          Subject: { Data: 'Invoice', Charset: 'UTF-8' },
          Body: {
            Html: { Data: '<p>Hello</p>', Charset: 'UTF-8' },
            Text: { Data: 'Hello', Charset: 'UTF-8' },
          },
        },
      });
    });

    it('passes multiple ToAddresses when to is an array', async () => {
      await service.sendEmail({
        to: ['a@x.com', 'b@x.com'],
        subject: 'S',
        htmlBody: 'h',
        textBody: 't',
      });
      const cmd = (mockSesSend.mock.calls as Array<[SendEmailCommand]>)[0][0];
      expect(cmd.input.Destination?.ToAddresses).toEqual([
        'a@x.com',
        'b@x.com',
      ]);
    });

    it('returns false when SES send fails', async () => {
      mockSesSend.mockRejectedValueOnce(new Error('Throttled'));
      const result = await service.sendEmail({
        to: 'x@y.com',
        subject: 'S',
        htmlBody: 'h',
        textBody: 't',
      });
      expect(result).toBe(false);
    });
  });

  describe('sendEmailWithPdfAttachments', () => {
    let service: EmailService;

    beforeEach(() => {
      service = new EmailService();
    });

    it('returns true without calling SES when attachments is empty', async () => {
      const result = await service.sendEmailWithPdfAttachments({
        to: 'client@example.com',
        subject: 'Invoices',
        textBody: 'See PDFs',
        attachments: [],
      });
      expect(result).toBe(true);
      expect(mockSesSend).not.toHaveBeenCalled();
    });

    it('sends SendRawEmailCommand with PDF part', async () => {
      const pdf = Buffer.from('%PDF-1.4 minimal');
      const result = await service.sendEmailWithPdfAttachments({
        to: 'client@example.com',
        subject: 'Your invoice',
        textBody: 'Plain',
        attachments: [{ filename: 'inv.pdf', content: pdf }],
      });

      expect(result).toBe(true);
      expect(mockSesSend).toHaveBeenCalledTimes(1);
      const cmd = (
        mockSesSend.mock.calls as Array<[SendRawEmailCommand]>
      )[0][0];
      expect(cmd).toBeInstanceOf(SendRawEmailCommand);
      expect(cmd.input.Source).toBe(sender);
      expect(cmd.input.Destinations).toEqual(['client@example.com']);
      const raw = cmd.input.RawMessage?.Data;
      expect(Buffer.isBuffer(raw)).toBe(true);
      const mime = raw!.toString('utf8');
      expect(mime).toContain('multipart/mixed');
      expect(mime).toContain('Content-Type: application/pdf');
      expect(mime).toContain(
        'Content-Disposition: attachment; filename="inv.pdf"',
      );
    });

    it('uses multipart/alternative when htmlBody is provided', async () => {
      await service.sendEmailWithPdfAttachments({
        to: 'client@example.com',
        subject: 'S',
        textBody: 'Plain',
        htmlBody: '<p>Html</p>',
        attachments: [{ filename: 'a.pdf', content: Buffer.from('x') }],
      });
      const cmd = (
        mockSesSend.mock.calls as Array<[SendRawEmailCommand]>
      )[0][0];
      const mime = cmd.input.RawMessage!.Data!.toString('utf8');
      expect(mime).toContain('multipart/alternative');
      expect(mime).toContain('text/html');
    });

    it('uses custom Content-Type when contentType is set', async () => {
      await service.sendEmailWithPdfAttachments({
        to: 'client@example.com',
        subject: 'Errors',
        textBody: 'See CSV',
        attachments: [
          {
            filename: 'errors.csv',
            content: Buffer.from('row,email\n1,a@b.com', 'utf-8'),
            contentType: 'text/csv; charset=UTF-8',
          },
        ],
      });
      const cmd = (
        mockSesSend.mock.calls as Array<[SendRawEmailCommand]>
      )[0][0];
      const mime = cmd.input.RawMessage!.Data!.toString('utf8');
      expect(mime).toContain('Content-Type: text/csv; charset=UTF-8');
    });

    it('sanitizes attachment filename for Content-Disposition', async () => {
      await service.sendEmailWithPdfAttachments({
        to: 'c@d.com',
        subject: 'S',
        textBody: 't',
        attachments: [
          { filename: 'bad name<script>.pdf', content: Buffer.from('x') },
        ],
      });
      const cmd = (
        mockSesSend.mock.calls as Array<[SendRawEmailCommand]>
      )[0][0];
      const mime = cmd.input.RawMessage!.Data!.toString('utf8');
      expect(mime).toContain('filename="bad_name_script_.pdf"');
    });

    it('returns false when SES send fails', async () => {
      mockSesSend.mockRejectedValueOnce(new Error('Rejected'));
      const result = await service.sendEmailWithPdfAttachments({
        to: 'c@d.com',
        subject: 'S',
        textBody: 't',
        attachments: [{ filename: 'a.pdf', content: Buffer.from('x') }],
      });
      expect(result).toBe(false);
    });
  });
});
