import { escapeHtmlForEmail } from './email-html.util';

/** XHTML + MSO head boilerplate for Outlook-safe emails. */
export function renderEmailHead(title: string): string {
  const safeTitle = escapeHtmlForEmail(title);
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta content="telephone=no" name="format-detection">
  <title>${safeTitle}</title>
  <!--[if (mso 16)]><style type="text/css">a {text-decoration: none;}</style><![endif]-->
  <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]-->
  <!--[if gte mso 9]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG></o:AllowPNG><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <!--[if mso]><xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail/></w:WordDocument></xml><![endif]-->
  <style type="text/css">#outlook a{padding:0;}span.MsoHyperlink,span.MsoHyperlinkFollowed{color:inherit;mso-style-priority:99;}a.es-button{mso-style-priority:100!important;text-decoration:none!important;}.msohide{mso-hide:all;}</style>
</head>`;
}

/** Full-width header image row (600px, matches card). */
export function renderEmailHeaderRow(): string {
  const url = process.env.EMAIL_LOGO_URL?.trim() ?? '';
  const img = `<img src="${escapeHtmlForEmail(url)}" alt="BSP Blueprint" width="600" title="BSP Blueprint" style="display:block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0;width:600px;max-width:100%;border-radius:20px 20px 0 0" />`;

  return `<tr>
    <td align="center" style="padding:0;Margin:0;font-size:0;line-height:0">${img}</td>
  </tr>`;
}

export interface RenderEmailBodyRowParams {
  innerHtml: string;
  align?: 'left' | 'center';
  padding?: string;
}

/** Standard body row — 600px column with horizontal padding on inner cell. */
export function renderEmailBodyRow(p: RenderEmailBodyRowParams): string {
  const align = p.align ?? 'left';
  const padding = p.padding ?? '30px 24px 32px 24px';
  const innerAlign = align === 'center' ? 'center' : 'left';

  return `<tr>
    <td align="left" style="padding:0;Margin:0">
      <table cellspacing="0" cellpadding="0" width="600" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:600px">
        <tr>
          <td align="${innerAlign}" style="padding:${padding};Margin:0;text-align:${align};color:#2F414A">
            ${p.innerHtml}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export interface WrapEmailHtmlParams {
  title: string;
  /** One or more &lt;tr&gt;...&lt;/tr&gt; rows inside the white card after the header. */
  contentRows: string;
}

/** Full HTML document with MSO shell, unified header, and caller-supplied body rows. */
export function wrapEmailHtml(p: WrapEmailHtmlParams): string {
  return `${renderEmailHead(p.title)}
<body style="width:100%;height:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
  <div dir="ltr" lang="en" style="background-color:#F8F7FB">
    <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%">
      <tr>
        <td valign="top" style="padding:0;Margin:0">
          <table cellspacing="0" cellpadding="0" align="center" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:100%;table-layout:fixed !important">
            <tr>
              <td align="center" style="padding:24px 12px;Margin:0">
                <table cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;background-color:#FFFFFF;width:600px;max-width:600px;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
                  ${renderEmailHeaderRow()}
                  ${p.contentRows}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

export interface BulletproofButtonParams {
  href: string;
  label: string;
  bgColor?: string;
  textColor?: string;
  borderRadius?: number;
  padding?: string;
  fontSize?: string;
  fontWeight?: string | number;
  align?: 'left' | 'center' | 'right';
}

/** MSO v:roundrect + non-MSO anchor — mandatory for all CTA buttons. */
export function renderBulletproofButton(p: BulletproofButtonParams): string {
  const bg = p.bgColor ?? '#1a73e8';
  const color = p.textColor ?? '#ffffff';
  const radius = p.borderRadius ?? 6;
  const padding = p.padding ?? '12px 24px';
  const fontSize = p.fontSize ?? '15px';
  const fontWeight = p.fontWeight ?? 600;
  const href = p.href;
  const label = p.label;

  const padMatch = padding.match(/(\d+)px\s+(\d+)px/);
  const padV = padMatch ? parseInt(padMatch[1], 10) : 12;
  const padH = padMatch ? parseInt(padMatch[2], 10) : 24;
  const approxWidth = padH * 2 + label.length * 9;
  const approxHeight = padV * 2 + 18;
  const arcsize = Math.min(Math.round((radius / approxHeight) * 100), 50);

  return `<!--[if mso]><a href="${href}" target="_blank" hidden>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:${approxHeight}px;v-text-anchor:middle;width:${approxWidth}px" arcsize="${arcsize}%" strokecolor="${bg}" strokeweight="0" fillcolor="${bg}">
  <w:anchorlock></w:anchorlock>
  <center style="color:${color};font-family:arial,helvetica,sans-serif;font-size:${fontSize};font-weight:${fontWeight};">${label}</center>
</v:roundrect></a><![endif]-->
<!--[if !mso]><!-- --><span class="msohide" style="display:inline-block;border-radius:${radius}px;background:${bg};mso-hide:all"><a href="${href}" target="_blank" class="es-button" style="mso-style-priority:100 !important;text-decoration:none !important;color:${color};font-size:${fontSize};font-weight:${fontWeight};padding:${padding};display:inline-block;background:${bg};border-radius:${radius}px;font-family:arial,helvetica,sans-serif;line-height:1.2;text-align:center;">${label}</a></span><!--<![endif]-->`;
}
