import {
  getSupportRequestEmailHtml,
  getSupportRequestEmailText,
} from './support-request-email.template';

describe('support-request-email.template', () => {
  const baseParams = {
    userFullName: 'Jane Doe',
    userEmail: 'jane@example.com',
    userRole: 'Employee',
    corporationName: 'Acme Corp',
    companyName: 'Acme West',
    supportSubject: 'Login issue',
    supportMessage: 'Cannot sign in',
    attachmentSummary: '2 file(s): screen1.png, screen2.jpg',
    submittedAt: '05-18-2026, 10:30 AM',
  };

  describe('getSupportRequestEmailHtml', () => {
    it('includes unified header and support request copy', () => {
      const html = getSupportRequestEmailHtml(baseParams);
      expect(html).toContain('width="600"');
      expect(html).toContain('<!--[if mso]>');
      expect(html).toContain('Hello Support Team,');
      expect(html).toContain('Login issue');
      expect(html).toContain('Jane Doe');
    });

    it('escapes HTML in message body', () => {
      const html = getSupportRequestEmailHtml({
        ...baseParams,
        supportMessage: '<script>alert(1)</script>',
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('includes attachment download links when provided', () => {
      const html = getSupportRequestEmailHtml({
        ...baseParams,
        attachmentSummary: '1 file(s): big.png (download links below)',
        attachmentLinks: [
          {
            displayName: 'big.png',
            url: 'https://cdn.example.com/support-request-attachments/uuid.png',
          },
        ],
      });
      expect(html).toContain(
        'href="https://cdn.example.com/support-request-attachments/uuid.png"',
      );
      expect(html).toContain('big.png');
    });

    it('includes platform header logo', () => {
      const html = getSupportRequestEmailHtml(baseParams);
      expect(html).toContain(
        process.env.EMAIL_LOGO_URL!.trim().split('/').pop()!,
      );
    });
  });

  describe('getSupportRequestEmailText', () => {
    it('includes user and request details', () => {
      const text = getSupportRequestEmailText(baseParams);
      expect(text).toContain('Jane Doe');
      expect(text).toContain('Login issue');
      expect(text).toContain('2 file(s): screen1.png, screen2.jpg');
    });
  });
});
