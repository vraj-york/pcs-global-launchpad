import { getBulkInviteJobCompletionEmailHtml } from './bulk-invite-job-completion-email.template';

describe('bulk-invite-job-completion-email.template', () => {
  it('wraps main HTML with the shared Outlook-safe header shell', () => {
    const html = getBulkInviteJobCompletionEmailHtml({
      mainHtml: '<p>Hello</p>',
    });
    expect(html).toContain('width="600"');
    expect(html).toContain('<!--[if mso]>');
    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('Support Team');
  });

  it('includes platform header logo', () => {
    const html = getBulkInviteJobCompletionEmailHtml({
      mainHtml: '<p>x</p>',
    });
    expect(html).toContain(
      process.env.EMAIL_LOGO_URL!.trim().split('/').pop()!,
    );
  });

  it('footer includes mailto Support Team link', () => {
    const html = getBulkInviteJobCompletionEmailHtml({
      mainHtml: '<p>x</p>',
      supportEmail: 'help@example.com',
    });
    expect(html).toContain('href="mailto:help@example.com"');
    expect(html).toContain('Support Team');
    expect(html).not.toContain('&lt;b&gt;');
  });
});
