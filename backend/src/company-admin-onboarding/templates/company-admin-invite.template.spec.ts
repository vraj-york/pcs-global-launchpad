import {
  getCompanyAdminInviteHtml,
  getCompanyAdminInviteText,
} from './company-admin-invite.template';

describe('company-admin-invite.template', () => {
  const loginUrl = 'https://app.example.com/login';

  describe('getCompanyAdminInviteHtml', () => {
    it('includes escaped login URL and temporary password for new users', () => {
      const html = getCompanyAdminInviteHtml({
        loginUrl,
        temporaryPassword: 'Secret1!',
      });
      expect(html).toContain('href="https://app.example.com/login"');
      expect(html).toContain('Secret1!');
      expect(html).toContain('temporary password');
      expect(html).not.toContain('You already have an account');
    });

    it('omits password block for existing users (null temporaryPassword)', () => {
      const html = getCompanyAdminInviteHtml({
        loginUrl,
        temporaryPassword: null,
      });
      expect(html).not.toContain('Your temporary password is:');
      expect(html).toContain('You already have an account');
      expect(html).toContain('https://app.example.com/login');
    });

    it('escapes HTML in loginUrl for href and display', () => {
      const dangerous = `https://evil.com/login"><script>alert(1)</script>`;
      const html = getCompanyAdminInviteHtml({
        loginUrl: dangerous,
        temporaryPassword: null,
      });
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('includes platform header logo', () => {
      const html = getCompanyAdminInviteHtml({
        loginUrl,
        temporaryPassword: null,
      });
      expect(html).toContain(
        process.env.EMAIL_LOGO_URL!.trim().split('/').pop()!,
      );
      expect(html).toContain('width="600"');
    });

    it('uses bulletproof MSO button markup', () => {
      const html = getCompanyAdminInviteHtml({
        loginUrl,
        temporaryPassword: null,
      });
      expect(html).toContain('v:roundrect');
      expect(html).toContain('<!--[if !mso]><!-- -->');
      expect(html).toContain('Sign in to BSPBlueprint');
    });
  });

  describe('getCompanyAdminInviteText', () => {
    it('includes login URL and temp password for new users', () => {
      const text = getCompanyAdminInviteText({
        loginUrl,
        temporaryPassword: 'Temp9x!',
      });
      expect(text).toContain(loginUrl);
      expect(text).toContain('Temp9x!');
      expect(text).toContain('temporary password');
    });

    it('uses existing-user copy when temporaryPassword is null', () => {
      const text = getCompanyAdminInviteText({
        loginUrl,
        temporaryPassword: null,
      });
      expect(text).toContain(loginUrl);
      expect(text).toContain('already have an account');
      expect(text).not.toMatch(/Your temporary password is:/);
    });
  });
});
