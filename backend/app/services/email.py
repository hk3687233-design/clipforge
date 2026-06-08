"""
Email delivery via Resend (free 3000/month).
Falls back to console log if RESEND_API_KEY not set (local dev).
"""
import urllib.request
import urllib.parse
import json
from app.config import settings


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

    if not settings.resend_api_key:
        print(f"\n📧 [DEV EMAIL] To: {to_email}")
        print(f"   Subject: {subject}")
        print(f"   License Key: {license_key}\n")
        return True

    try:
        payload = json.dumps({
            "from": settings.email_from,
            "to": [to_email],
            "subject": subject,
            "html": html,
        }).encode("utf-8")

        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload,
            headers={
                "Authorization": f"Bearer {settings.resend_api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status in (200, 201)
    except Exception as e:
        print(f"Email send failed: {e}")
        return False
