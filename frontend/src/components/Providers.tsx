"use client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import { CookieConsent } from "@/components/CookieConsent";

export function Providers({ children }: { children: React.ReactNode }) {
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <ToastProvider>
            {children}
            <CookieConsent />
          </ToastProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}
