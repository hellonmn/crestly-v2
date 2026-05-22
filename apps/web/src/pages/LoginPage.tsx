import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { CrestlyLogo } from "@crestly/icons";
import { api, getErrorMessage } from "@/lib/api";
import { authStore, useAuth } from "@/lib/auth-store";
import { BrandDot } from "@/components/BrandDot";
import type { LoginResponse } from "@crestly/shared";

/**
 * CDS-faithful login screen. Markup + inline styles mirror erp/login.php
 * line-for-line so the visual output is identical.
 */
export function LoginPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", { phone, password });
      authStore.set(data.accessToken, data.user);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Wrong mobile number or password."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <style>{LOGIN_CSS}</style>
      <div className="login-page">
        <div className="login-card">
          <div className="login-brand">
            <div className="login-brand__logo">
              <CrestlyLogo width={32} height={32} />
            </div>
            <div>
              <div className="login-brand__name">
                Crestly<BrandDot />
              </div>
              <div className="login-brand__sub">SCHOOL ERP · Login</div>
            </div>
          </div>

          {error && (
            <div className="banner banner--error" style={{ marginBottom: 14 }}>
              <span>{error}</span>
            </div>
          )}

          <form className="login-form" onSubmit={onSubmit} autoComplete="on">
            <div className="field">
              <label className="field__label field__label--req" htmlFor="phone">
                Mobile number
              </label>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink-40)",
                    fontSize: 13,
                    pointerEvents: "none",
                  }}
                >
                  +91
                </span>
                <input
                  id="phone"
                  className="input"
                  type="tel"
                  name="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoFocus
                  inputMode="numeric"
                  maxLength={13}
                  autoComplete="tel"
                  pattern="[0-9 +]{10,13}"
                  placeholder="98765 43210"
                  style={{ paddingLeft: 46, letterSpacing: "0.04em" }}
                />
              </div>
              <span className="field__hint">10-digit Indian mobile, with or without +91.</span>
            </div>

            <div className="field">
              <label className="field__label field__label--req" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="input"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--full"
              style={{ marginTop: 6 }}
              disabled={busy}
            >
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>

          <div className="login-help">
            Forgot your password? Ask the Admin to reset it from <b>Team → Edit member</b>.
          </div>
        </div>
        <div className="login-credit">
          Powered by <b>Shadowbiz Startups Developer</b>
          <BrandDot />
        </div>
      </div>
    </>
  );
}

/* Verbatim from erp/login.php inline <style>. */
const LOGIN_CSS = `
.login-page { background: var(--cream); display: grid; place-items: center; min-height: 100vh; padding: 20px; }
.login-card {
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: var(--r-4);
  padding: 32px;
  width: 100%;
  max-width: 380px;
  box-shadow: var(--shadow-2);
}
.login-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
.login-brand__logo {
  width: 48px; height: 48px; border-radius: var(--r-4);
  background: var(--ink); display: grid; place-items: center;
}
.login-brand__name {
  font-family: var(--font-display); font-weight: 800;
  font-size: 22px; letter-spacing: -0.025em;
}
.login-brand__sub {
  font-family: var(--font-mono); font-size: 10px;
  letter-spacing: 0.14em; color: var(--ink-40); text-transform: uppercase;
}
.login-form { display: flex; flex-direction: column; gap: 14px; }
.login-help {
  margin-top: 18px; padding-top: 18px;
  border-top: 1px solid var(--rule-soft);
  font-size: 12px; color: var(--ink-60);
  line-height: 1.55;
}
.login-help b { color: var(--ink); }
.login-credit {
  margin-top: 18px; text-align: center;
  font-family: var(--font-mono); font-size: 11px;
  letter-spacing: 0.05em; color: var(--ink-40);
}
.login-credit b { color: var(--ink-60); font-weight: 600; }
@media (max-width: 480px) {
  .login-card { padding: 24px; border-radius: var(--r-3); }
}
`;
