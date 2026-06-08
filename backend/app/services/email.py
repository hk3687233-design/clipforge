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
    subject = f"🎉 Your ClipForge {plan_label} License Key"
    html = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0f;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:40px;">
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 16px;">
        <tr>
          <td style="vertical-align:middle;padding-right:12px;">
            <!-- Logo icon: gradient square with scissors SVG -->
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="width:48px;height:48px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:12px;text-align:center;vertical-align:middle;">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:inline-block;vertical-align:middle;">
                    <circle cx="6" cy="6" r="3" stroke="white" stroke-width="2"/>
                    <circle cx="6" cy="18" r="3" stroke="white" stroke-width="2"/>
                    <line x1="8.5" y1="7.5" x2="21" y2="3" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="8.5" y1="16.5" x2="21" y2="21" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="8.5" y1="7.5" x2="14" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
                    <line x1="8.5" y1="16.5" x2="14" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </td>
              </tr>
            </table>
          </td>
          <td style="vertical-align:middle;">
            <span style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">ClipForge</span>
          </td>
        </tr>
      </table>
      <div style="display:inline-block;background:rgba(124,58,237,0.15);border:1px solid rgba(124,58,237,0.3);border-radius:20px;padding:4px 14px;">
        <span style="font-size:11px;font-weight:600;color:#a78bfa;letter-spacing:1.5px;text-transform:uppercase;">AI-Powered Clip Extractor</span>
      </div>
    </div>

    <!-- Main card -->
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;">
      <p style="font-size:28px;font-weight:800;margin:0 0 8px;">You're in! 🚀</p>
      <p style="color:rgba(255,255,255,0.5);margin:0 0 32px;font-size:15px;">Your ClipForge {plan_label} license is ready to use.</p>

      <!-- License key box -->
      <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.3);border-radius:14px;padding:20px;text-align:center;margin-bottom:28px;">
        <p style="color:rgba(255,255,255,0.4);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px;">Your License Key</p>
        <p style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#a78bfa;letter-spacing:2px;margin:0;word-break:break-all;">{license_key}</p>
      </div>

      <!-- Steps -->
      <div style="margin-bottom:32px;">
        <p style="font-weight:700;margin:0 0 16px;font-size:15px;">How to activate:</p>
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="width:24px;height:24px;background:rgba(124,58,237,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:700;color:#a78bfa;">1</div>
            <p style="margin:0;color:rgba(255,255,255,0.6);font-size:14px;">Go to <strong style="color:#fff;">getclipforge.online</strong></p>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="width:24px;height:24px;background:rgba(124,58,237,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:700;color:#a78bfa;">2</div>
            <p style="margin:0;color:rgba(255,255,255,0.6);font-size:14px;">Click <strong style="color:#fff;">"Activate License"</strong> in the top right</p>
          </div>
          <div style="display:flex;align-items:flex-start;gap:12px;">
            <div style="width:24px;height:24px;background:rgba(124,58,237,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:12px;font-weight:700;color:#a78bfa;">3</div>
            <p style="margin:0;color:rgba(255,255,255,0.6);font-size:14px;">Paste your key and click <strong style="color:#fff;">Activate</strong></p>
          </div>
        </div>
      </div>

      <a href="https://getclipforge.online" style="display:block;background:linear-gradient(135deg,#7c3aed,#9333ea);color:#fff;text-align:center;padding:16px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;">
        Start Using ClipForge →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:32px;">
      <!-- Mini logo in footer -->
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 12px;">
        <tr>
          <td style="vertical-align:middle;padding-right:8px;">
            <div style="width:24px;height:24px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:6px;text-align:center;line-height:24px;font-size:13px;">✂</div>
          </td>
          <td style="vertical-align:middle;">
            <span style="font-size:14px;font-weight:700;color:rgba(255,255,255,0.3);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">ClipForge</span>
          </td>
        </tr>
      </table>
      <p style="color:rgba(255,255,255,0.2);font-size:12px;margin:0 0 6px;">
        Questions? Reply to this email — we're here to help.
      </p>
      <p style="color:rgba(255,255,255,0.15);font-size:11px;margin:0;">
        © 2025 ClipForge · <a href="https://getclipforge.online" style="color:rgba(124,58,237,0.6);text-decoration:none;">getclipforge.online</a> · Built for content creators
      </p>
    </div>
  </div>
</body>
</html>
"""

    if not settings.resend_api_key:
        # Dev mode: log to console
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
