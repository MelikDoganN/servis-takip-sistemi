"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { authService } from "@/services/authService";
import { setToken } from "@/lib/auth";
import { ApiError } from "@/types/api";
import { Settings2 } from "lucide-react";

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (mode === "register" && !fullName.trim()) {
      newErrors.fullName = "Ad soyad boş olamaz";
    }
    if (!email.trim()) {
      newErrors.email = "E-posta adresi boş olamaz";
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Geçerli bir e-posta adresi girin";
    }
    if (!password.trim()) {
      newErrors.password = "Şifre boş olamaz";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError("");
    setSuccessMessage("");
    if (!validate()) return;

    setLoading(true);
    try {
      if (mode === "register") {
        const result = await authService.register({
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim() || undefined,
        });
        setSuccessMessage(result.message || "Kayıt başarılı. Şimdi giriş yapabilirsiniz.");
        setMode("login");
        setPassword("");
        return;
      }

      const result = await authService.login({
        email: email.trim(),
        password,
      });

      if (!result?.token) {
        setApiError("Giriş yanıtında token bulunamadı.");
        return;
      }

      setToken(result.token);
      router.replace("/dashboard");
    } catch (err) {
      const apiErr = err as ApiError;
      setApiError(apiErr.message || "Giriş yapılamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-700/40 via-slate-950 to-slate-950" />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-primary-600/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-10 h-72 w-72 rounded-full bg-sky-500/10 blur-3xl" />

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-800 shadow-elevated">
            <Settings2 className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Servis Takip Sistemi</h1>
          <p className="mt-2 text-sm text-slate-300">
            {mode === "login" ? "Yönetim paneline giriş yapın" : "Yeni hesap oluşturun"}
          </p>
        </div>

        <Card className="border-slate-200/20 bg-white/95 shadow-elevated backdrop-blur">
          <CardContent className="py-6">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {apiError && <ErrorMessage message={apiError} />}
              {successMessage && (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 animate-slide-up">
                  {successMessage}
                </p>
              )}

              {mode === "register" && (
                <>
                  <Input
                    label="Ad Soyad"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    error={errors.fullName}
                  />
                  <Input
                    label="Telefon"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                error={errors.email}
                autoComplete="email"
              />

              <Input
                label="Şifre"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={errors.password}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />

              <Button type="submit" fullWidth size="lg" loading={loading}>
                {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
              </Button>

              <p className="text-center text-sm text-slate-500">
                {mode === "login" ? (
                  <>
                    Hesabınız yok mu?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary-600 transition hover:text-primary-700"
                      onClick={() => {
                        setMode("register");
                        setApiError("");
                        setSuccessMessage("");
                      }}
                    >
                      Kayıt ol
                    </button>
                  </>
                ) : (
                  <>
                    Zaten hesabınız var mı?{" "}
                    <button
                      type="button"
                      className="font-medium text-primary-600 transition hover:text-primary-700"
                      onClick={() => {
                        setMode("login");
                        setApiError("");
                        setSuccessMessage("");
                      }}
                    >
                      Giriş yap
                    </button>
                  </>
                )}
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
