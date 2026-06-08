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
      <div style="display:inline-flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="width:40px;height:40px;background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:10px;display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-size:18px;">✂</span>
        </div>
        <span style="font-size:22px;font-weight:800;color:#fff;">ClipForge</span>
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
      <p style="color:rgba(255,255,255,0.2);font-size:12px;margin:0;">
        Questions? Reply to this email — we're here to help.<br>
        ClipForge · Built for content creators
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
