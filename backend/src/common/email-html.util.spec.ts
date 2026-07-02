import { escapeHtmlForEmail } from './email-html.util';

describe('escapeHtmlForEmail', () => {
  it('escapes HTML-sensitive characters including single quotes', () => {
    expect(escapeHtmlForEmail(`a&b<c>"e'f`)).toBe(
      'a&amp;b&lt;c&gt;&quot;e&#39;f',
    );
  });
});
