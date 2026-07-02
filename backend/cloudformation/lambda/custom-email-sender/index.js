const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { buildClient, CommitmentPolicy, KmsKeyringNode } = require('@aws-crypto/client-node');
const { toByteArray } = require('base64-js');

const region = process.env.AWS_REGION || 'us-east-1';
const sesClient = new SESClient({ region });
const SENDER_EMAIL = process.env.SES_SENDER_EMAIL;
const KMS_KEY_ARN = process.env.KMS_KEY_ARN;
// Logo: use a hosted public URL only (email clients block data/base64 images).
// Set LOGO_URL to your CloudFront or CDN URL, e.g. https://d1234.cloudfront.net/logo-email.png
const LOGO_URL = process.env.LOGO_URL || '';

// Build the AWS Encryption SDK client
const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_ALLOW_DECRYPT);

/**
 * Format code with hyphen after 3 digits (e.g., "123456" -> "123-456")
 */
function formatCode(code) {
  if (code && code.length === 6) {
    return `${code.slice(0, 3)}-${code.slice(3)}`;
  }
  return code;
}

/**
 * Decrypt the code sent by Cognito using AWS Encryption SDK
 */
async function decryptCode(encryptedCode) {
  try {
    console.log('Decrypting code with AWS Encryption SDK...');

    // Create a KMS keyring
    const keyring = new KmsKeyringNode({
      keyIds: [KMS_KEY_ARN],
    });

    // Decode base64 and decrypt
    const encryptedBytes = toByteArray(encryptedCode);
    const { plaintext } = await decrypt(keyring, encryptedBytes);

    const decryptedCode = Buffer.from(plaintext).toString('utf8');
    console.log('Code decrypted successfully');
    return decryptedCode;
  } catch (error) {
    console.error('Decryption error:', error.name, error.message);
    throw error;
  }
}

/**
 * Generate HTML email for login verification (matches verification-code.template.ts shell).
 */
function getLoginVerificationHtml(code) {
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
<head>
  <meta charset="UTF-8">
  <meta content="width=device-width, initial-scale=1" name="viewport">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta content="telephone=no" name="format-detection">
  <title>Login Verification Code - BSPBlueprint</title>
  <!--[if (mso 16)]><style type="text/css">a {text-decoration: none;}</style><![endif]-->
  <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]-->
  <!--[if gte mso 9]><noscript><xml><o:OfficeDocumentSettings><o:AllowPNG></o:AllowPNG><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <!--[if mso]><xml><w:WordDocument xmlns:w="urn:schemas-microsoft-com:office:word"><w:DontUseAdvancedTypographyReadingMail/></w:WordDocument></xml><![endif]-->
  <style type="text/css">#outlook a{padding:0;}span.MsoHyperlink,span.MsoHyperlinkFollowed{color:inherit;mso-style-priority:99;}</style>
</head>
<body style="width:100%;height:100%;font-family:arial, 'helvetica neue', helvetica, sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;padding:0;Margin:0">
  <div dir="ltr" lang="en" style="background-color:#F8F7FB">
    <table width="100%" cellspacing="0" cellpadding="0" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;padding:0;Margin:0;width:100%;height:100%">
      <tr>
        <td valign="top" style="padding:0;Margin:0">
          <table cellspacing="0" cellpadding="0" align="center" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:100%;table-layout:fixed !important">
            <tr>
              <td align="center" style="padding:24px 12px;Margin:0">
                <table cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;background-color:#FFFFFF;width:600px;max-width:600px;border-radius:20px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08)">
                  <tr>
                    <td align="center" style="padding:0;Margin:0;font-size:0;line-height:0"><img src="${LOGO_URL}" alt="BSP Blueprint" width="600" title="BSP Blueprint" style="display:block;font-size:14px;border:0;outline:none;text-decoration:none;margin:0;width:600px;max-width:100%;border-radius:20px 20px 0 0" /></td>
                  </tr>
                  <tr>
                    <td style="padding:0;Margin:0">
                      <table cellspacing="0" cellpadding="0" width="600" role="presentation" style="mso-table-lspace:0pt;mso-table-rspace:0pt;border-spacing:0px;width:600px">
                        <tr>
                          <td align="center" style="padding:30px 24px 32px 24px;Margin:0;text-align:center">
                            <h1 style="margin:0 0 10px;padding:0;font-weight:600;font-size:20px;line-height:25px;color:#2F414A;">Verification Code</h1>
                            <p style="margin:0 0 20px;padding:0;font-weight:400;font-size:14px;line-height:21px;color:#385966;">This code is valid for the next 3 minutes.</p>
                            <div style="font-weight:700;font-size:50px;line-height:60px;color:#2F414A;margin-top:20px;margin-bottom:20px;">${code}</div>
                            <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0 16px;" />
                            <p style="margin:0;font-size:12px;line-height:1.5;color:#888888;text-align:center;">
                              In case you didn't trigger this, please contact our
                              <a href="mailto:support@bspblueprint.com" style="color:#1a73e8;">Support Team</a>.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
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

/**
 * Generate plain text email for login verification
 */
function getLoginVerificationText(code) {
  return `Login Verification Code - BSPBlueprint

Use this code to complete your login:

${code}

This code is valid for the next 3 minutes.

In case you didn't trigger this, please contact our Support Team at support@bspblueprint.com`;
}

/**
 * Send email via SES
 */
async function sendEmail(to, subject, htmlBody, textBody) {
  const command = new SendEmailCommand({
    Source: SENDER_EMAIL,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
        Text: { Data: textBody, Charset: 'UTF-8' },
      },
    },
  });

  await sesClient.send(command);
  console.log(`Email sent to ${to}`);
}

/**
 * Main Lambda handler for Cognito CustomEmailSender trigger
 */
exports.handler = async (event) => {
  console.log('CustomEmailSender event:', JSON.stringify(event, null, 2));

  const { triggerSource, request } = event;
  const { code, userAttributes } = request;
  const email = userAttributes?.email;

  if (!code || !email) {
    console.log('No code or email provided, skipping');
    return event;
  }

  try {
    // Decrypt the code from Cognito using AWS Encryption SDK
    const decryptedCode = await decryptCode(code);

    // Format code with hyphen (e.g., "123456" -> "123-456")
    const formattedCode = formatCode(decryptedCode);

    // Handle different trigger sources
    let subject, htmlBody, textBody;

    switch (triggerSource) {
      case 'CustomEmailSender_Authentication':
        // MFA login code
        subject = 'Login Verification Code - BSPBlueprint';
        htmlBody = getLoginVerificationHtml(formattedCode);
        textBody = getLoginVerificationText(formattedCode);
        break;

      case 'CustomEmailSender_SignUp':
      case 'CustomEmailSender_ResendCode':
      case 'CustomEmailSender_VerifyUserAttribute':
        subject = 'Verify Your Email - BSPBlueprint';
        htmlBody = getLoginVerificationHtml(formattedCode);
        textBody = getLoginVerificationText(formattedCode);
        break;

      case 'CustomEmailSender_ForgotPassword':
        subject = 'Reset Your Password - BSPBlueprint';
        htmlBody = getLoginVerificationHtml(formattedCode);
        textBody = getLoginVerificationText(formattedCode);
        break;

      case 'CustomEmailSender_AdminCreateUser':
        subject = 'Welcome to BSPBlueprint';
        htmlBody = getLoginVerificationHtml(formattedCode);
        textBody = getLoginVerificationText(formattedCode);
        break;

      default:
        console.log('Unknown trigger source:', triggerSource);
        subject = 'Your Verification Code - BSPBlueprint';
        htmlBody = getLoginVerificationHtml(formattedCode);
        textBody = getLoginVerificationText(formattedCode);
    }

    await sendEmail(email, subject, htmlBody, textBody);
    console.log(`Email sent successfully for trigger: ${triggerSource}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }

  return event;
};
