"""
Email delivery via Resend (free 3000/month).
Falls back to console log if RESEND_API_KEY not set (local dev).
"""
import json
import logging
import requests
from app.config import settings

logger = logging.getLogger("clipforge.email")

FRONTEND_URL = "https://getclipforge.online"


def _send_email(to_email: str, subject: str, html: str) -> bool:
    if not settings.resend_api_key:
        logger.info(f"[DEV] Email to={to_email} subject={subject}")
        return True
    resp = requests.post(
        "https://api.resend.com/emails",
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "from": settings.email_from,
            "to": [to_email],
            "subject": subject,
            "html": html,
        },
        timeout=15,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Resend {resp.status_code}: {resp.text}")
    return True


def _email_wrapper(title: str, body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f7;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

<!-- Header -->
<tr><td align="center" style="padding-bottom:24px;">
<table cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background-color:#7c3aed;border-radius:14px;width:48px;height:48px;text-align:center;vertical-align:middle;padding:0 14px;">
<span style="color:#ffffff;font-size:22px;line-height:48px;">&#9986;</span></td>
<td style="padding-left:12px;vertical-align:middle;">
<span style="font-size:26px;font-weight:900;color:#1a1a2e;letter-spacing:-0.5px;">ClipForge</span></td>
</tr></table></td></tr>

<!-- Card -->
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" border="0"
style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
{body_html}
</table></td></tr>

<!-- Footer -->
<tr><td style="padding-top:28px;text-align:center;">
<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#7c3aed;">&#9986; ClipForge</p>
<p style="margin:0;font-size:12px;color:#9ca3af;">
&copy; 2025 ClipForge &middot; <a href="{FRONTEND_URL}" style="color:#9ca3af;text-decoration:none;">getclipforge.online</a>
</p></td></tr>

</table></td></tr></table>
</body></html>"""


def send_password_reset_email(to_email: str, token: str) -> bool:
    reset_url = f"{FRONTEND_URL}/auth/reset-password?token={token}"
    body = f"""
<tr><td style="background-color:#7c3aed;padding:32px 40px;text-align:center;">
<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ddd6fe;letter-spacing:3px;text-transform:uppercase;">Password Reset</p>
<p style="margin:0;font-size:26px;font-weight:900;color:#ffffff;">Reset Your Password</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 8px;font-size:16px;color:#374151;">Hi there &#128075;</p>
<p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
We received a request to reset your ClipForge password. Click the button below to set a new password.
This link expires in <strong style="color:#1a1a2e;">1 hour</strong>.</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
<tr><td align="center">
<a href="{reset_url}" style="display:inline-block;background-color:#7c3aed;color:#ffffff;
font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:12px;">
Reset Password &#8594;</a></td></tr></table>
<p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">If the button doesn't work, copy and paste this link:</p>
<p style="margin:0;font-size:12px;color:#7c3aed;word-break:break-all;">{reset_url}</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
<tr><td style="border-top:1px solid #f3f4f6;">&nbsp;</td></tr></table>
<p style="margin:0;font-size:13px;color:#9ca3af;">If you didn't request this, you can safely ignore this email.</p>
</td></tr>"""
    html = _email_wrapper("Reset Your Password — ClipForge", body)
    return _send_email(to_email, "Reset your ClipForge password", html)


def send_welcome_email(to_email: str, name: str) -> bool:
    body = f"""
<tr><td style="background-color:#7c3aed;padding:32px 40px;text-align:center;">
<p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ddd6fe;letter-spacing:3px;text-transform:uppercase;">Welcome</p>
<p style="margin:0;font-size:26px;font-weight:900;color:#ffffff;">Welcome to ClipForge! &#127881;</p>
</td></tr>
<tr><td style="padding:40px;">
<p style="margin:0 0 8px;font-size:16px;color:#374151;">Hey {name} &#128075;</p>
<p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;">
Thanks for creating your ClipForge account! You can now turn any review video into product clips automatically.</p>
<p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1a1a2e;">Here's how to get started:</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td style="padding:6px 0;"><span style="color:#7c3aed;font-weight:700;">1.</span>
<span style="font-size:14px;color:#374151;margin-left:8px;">Paste a YouTube, TikTok, or Instagram URL</span></td></tr>
<tr><td style="padding:6px 0;"><span style="color:#7c3aed;font-weight:700;">2.</span>
<span style="font-size:14px;color:#374151;margin-left:8px;">AI detects every product mentioned</span></td></tr>
<tr><td style="padding:6px 0;"><span style="color:#7c3aed;font-weight:700;">3.</span>
<span style="font-size:14px;color:#374151;margin-left:8px;">Download your clips as a ZIP</span></td></tr>
</table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
<tr><td align="center">
<a href="{FRONTEND_URL}/tool" style="display:inline-block;background-color:#7c3aed;color:#ffffff;
font-size:16px;font-weight:700;text-decoration:none;padding:16px 48px;border-radius:12px;">
Start Clipping &#8594;</a></td></tr></table>
</td></tr>
<tr><td style="background-color:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
<p style="margin:0;font-size:13px;color:#6b7280;">Questions? Reply to this email or reach us at
<a href="mailto:support@getclipforge.online" style="color:#7c3aed;font-weight:600;text-decoration:none;">support@getclipforge.online</a></p>
</td></tr>"""
    html = _email_wrapper("Welcome to ClipForge!", body)
    return _send_email(to_email, f"Welcome to ClipForge, {name}!", html)


def send_license_email(to_email: str, license_key: str, plan: str = "pro") -> bool:
    """Send license key to customer after purchase."""
    plan_label = "Pro" if plan == "pro" else "Free"
    subject = f"Your ClipForge {plan_label} License Key is Ready"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Your ClipForge License Key</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:Arial,Helvetica,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- ── HEADER ── -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color:#7c3aed;border-radius:14px;width:48px;height:48px;text-align:center;vertical-align:middle;padding:0 14px;">
                    <span style="color:#ffffff;font-size:22px;line-height:48px;">&#9986;</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="font-size:26px;font-weight:900;color:#1a1a2e;letter-spacing:-0.5px;">ClipForge</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── MAIN CARD ── -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background-color:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                <!-- Purple top banner -->
                <tr>
                  <td style="background-color:#7c3aed;padding:32px 40px;text-align:center;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#ddd6fe;letter-spacing:3px;text-transform:uppercase;">
                      &#10024; Purchase Confirmed
                    </p>
                    <p style="margin:0;font-size:30px;font-weight:900;color:#ffffff;">
                      You're Pro now! &#128640;
                    </p>
                  </td>
                </tr>

                <!-- Body -->
                <tr>
                  <td style="padding:40px;">

                    <p style="margin:0 0 8px;font-size:16px;color:#374151;">
                      Hi there &#128075;
                    </p>
                    <p style="margin:0 0 32px;font-size:15px;color:#6b7280;line-height:1.6;">
                      Thank you for purchasing <strong style="color:#1a1a2e;">ClipForge {plan_label}</strong>.
                      Your license key is ready — activate it below and start turning any review video
                      into product clips automatically!
                    </p>

                    <!-- License Key Box -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                      <tr>
                        <td style="background-color:#faf5ff;border:2px dashed #7c3aed;border-radius:14px;padding:24px;text-align:center;">
                          <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#7c3aed;letter-spacing:3px;text-transform:uppercase;">
                            &#128273; Your License Key
                          </p>
                          <p style="margin:0;font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;
                                     color:#4c1d95;letter-spacing:3px;word-break:break-all;">
                            {license_key}
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Steps -->
                    <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#1a1a2e;">
                      How to activate in 3 steps:
                    </p>

                    <!-- Step 1 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                      <tr>
                        <td style="width:36px;vertical-align:top;padding-top:2px;">
                          <div style="width:28px;height:28px;background-color:#7c3aed;border-radius:50%;
                                      text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#ffffff;">
                            1
                          </div>
                        </td>
                        <td style="vertical-align:top;padding-left:12px;">
                          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                            Go to
                            <a href="https://getclipforge.online" style="color:#7c3aed;font-weight:700;text-decoration:none;">
                              getclipforge.online
                            </a>
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Step 2 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                      <tr>
                        <td style="width:36px;vertical-align:top;padding-top:2px;">
                          <div style="width:28px;height:28px;background-color:#7c3aed;border-radius:50%;
                                      text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#ffffff;">
                            2
                          </div>
                        </td>
                        <td style="vertical-align:top;padding-left:12px;">
                          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                            Click <strong style="color:#1a1a2e;">"Activate License"</strong> in the top-right corner
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- Step 3 -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
                      <tr>
                        <td style="width:36px;vertical-align:top;padding-top:2px;">
                          <div style="width:28px;height:28px;background-color:#7c3aed;border-radius:50%;
                                      text-align:center;line-height:28px;font-size:13px;font-weight:700;color:#ffffff;">
                            3
                          </div>
                        </td>
                        <td style="vertical-align:top;padding-left:12px;">
                          <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                            Paste your key and click <strong style="color:#1a1a2e;">Activate</strong> — done!
                          </p>
                        </td>
                      </tr>
                    </table>

                    <!-- CTA Button -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
                      <tr>
                        <td align="center">
                          <a href="https://getclipforge.online"
                             style="display:inline-block;background-color:#7c3aed;color:#ffffff;
                                    font-size:16px;font-weight:700;text-decoration:none;
                                    padding:16px 48px;border-radius:12px;letter-spacing:0.3px;">
                            Start Using ClipForge &#8594;
                          </a>
                        </td>
                      </tr>
                    </table>

                    <!-- Divider -->
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
                      <tr>
                        <td style="border-top:1px solid #f3f4f6;font-size:0;">&nbsp;</td>
                      </tr>
                    </table>

                    <!-- What's included -->
                    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1a1a2e;">
                      What's included in your Pro plan:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#7c3aed;font-weight:700;">&#10003;</span>
                          <span style="font-size:14px;color:#374151;margin-left:10px;">Unlimited video jobs</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#7c3aed;font-weight:700;">&#10003;</span>
                          <span style="font-size:14px;color:#374151;margin-left:10px;">100+ products detected per video</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#7c3aed;font-weight:700;">&#10003;</span>
                          <span style="font-size:14px;color:#374151;margin-left:10px;">Auto-generated affiliate buy links</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#7c3aed;font-weight:700;">&#10003;</span>
                          <span style="font-size:14px;color:#374151;margin-left:10px;">Instant clip downloads (ZIP)</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="color:#7c3aed;font-weight:700;">&#10003;</span>
                          <span style="font-size:14px;color:#374151;margin-left:10px;">Lifetime access — one-time payment</span>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <!-- Support bar -->
                <tr>
                  <td style="background-color:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;text-align:center;">
                    <p style="margin:0;font-size:13px;color:#6b7280;">
                      Questions? Reply to this email or reach us at
                      <a href="mailto:support@getclipforge.online"
                         style="color:#7c3aed;font-weight:600;text-decoration:none;">
                        support@getclipforge.online
                      </a>
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ── FOOTER ── -->
          <tr>
            <td style="padding-top:28px;text-align:center;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#7c3aed;">
                &#9986; ClipForge
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                &copy; 2025 ClipForge &middot;
                <a href="https://getclipforge.online" style="color:#9ca3af;text-decoration:none;">
                  getclipforge.online
                </a>
                &middot; Built for content creators
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>"""

    return _send_email(to_email, subject, html)
