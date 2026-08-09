"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Eye,
  EyeOff,
  FileBarChart2,
  MessageSquare,
  Settings2,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { authService } from "@/services/authService";
import { setToken, getDefaultHomePath } from "@/lib/auth";
import { navItems } from "@/config/navigation";
import { ApiError } from "@/types/api";

interface FormErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES = [
  { icon: ClipboardList, label: "İş Emri Takibi" },
  { icon: Wrench, label: "Teknisyen Yönetimi" },
  { icon: MessageSquare, label: "WhatsApp Bildirimleri" },
  { icon: FileBarChart2, label: "Garanti ve Raporlama" },
];

function mapLoginError(err: unknown): string {
  if (err && typeof err === "object" && "name" in err) {
    const name = String((err as { name?: string }).name || "");
    if (name === "TypeError" || name === "AbortError") {
      return "Sunucuya bağlanılamadı. Lütfen tekrar deneyin.";
    }
  }
  const apiErr = err as ApiError;
  if (!apiErr?.status && !apiErr?.message) {
    return "Sunucuya bağlanılamadı. Lütfen tekrar deneyin.";
  }
  if (apiErr.status === 401 || apiErr.status === 403) {
    return "E-posta veya şifre hatalı.";
  }
  const msg = (apiErr.message || "").toLowerCase();
  if (
    msg.includes("failed to fetch") ||
    msg.includes("network") ||
    msg.includes("bağlan")
  ) {
    return "Sunucuya bağlanılamadı. Lütfen tekrar deneyin.";
  }
  if (
    msg.includes("geçersiz") ||
    msg.includes("şifre") ||
    msg.includes("invalid") ||
    msg.includes("unauthorized")
  ) {
    return "E-posta veya şifre hatalı.";
  }
  return "E-posta veya şifre hatalı.";
}

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const syncCaps = (e: KeyboardEvent) => {
      if (typeof e.getModifierState === "function") {
        setCapsLockOn(e.getModifierState("CapsLock"));
      }
    };
    window.addEventListener("keydown", syncCaps);
    window.addEventListener("keyup", syncCaps);
    return () => {
      window.removeEventListener("keydown", syncCaps);
      window.removeEventListener("keyup", syncCaps);
    };
  }, []);

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
    if (loading) return;
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
        setApiError("Giriş tamamlanamadı. Lütfen tekrar deneyin.");
        return;
      }

      setToken(result.token);
      router.replace(getDefaultHomePath(navItems));
    } catch (err) {
      if (mode === "login") {
        setApiError(mapLoginError(err));
      } else {
        const apiErr = err as ApiError;
        setApiError(apiErr.message || "Kayıt tamamlanamadı.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Sol kurumsal panel */}
        <aside className="relative hidden overflow-hidden bg-navy-deep px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(18,167,205,0.22)_0%,transparent_45%,rgba(38,47,89,0.35)_100%)]" />
          <div className="pointer-events-none absolute -left-16 top-20 h-64 w-64 rounded-full bg-accent/15 blur-3xl" />
          <div className="pointer-events-none absolute bottom-10 right-0 h-72 w-72 rounded-full bg-white/5 blur-3xl" />

          <div className="relative">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
              <Settings2 className="h-6 w-6 text-white" aria-hidden />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Servis Takip Sistemi</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              Servis operasyonlarınızı tek panelden yönetin.
            </p>
          </div>

          <ul className="relative mt-10 space-y-3">
            {FEATURES.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/20">
                  <Icon className="h-4 w-4 text-accent" aria-hidden />
                </span>
                <span className="text-sm font-medium text-slate-100">{label}</span>
              </li>
            ))}
          </ul>

          <p className="relative mt-10 text-xs text-slate-400">
            Güvenli kurumsal erişim · Operasyon yönetimi
          </p>
        </aside>

        {/* Sağ giriş kartı */}
        <section className="flex items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-md animate-slide-up">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-navy">
                <ShieldCheck className="h-5 w-5 text-white" aria-hidden />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-navy">
                Servis Takip Sistemi
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Servis operasyonlarınızı tek panelden yönetin.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
              <div className="mb-6">
                <h2 className="text-xl font-semibold tracking-tight text-navy">
                  {mode === "login"
                    ? "Yönetim Paneline Hoş Geldiniz"
                    : "Yeni hesap oluşturun"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {mode === "login"
                    ? "Devam etmek için hesap bilgilerinizi girin."
                    : "Kurulum için ilk yönetici hesabını oluşturun."}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {apiError && <ErrorMessage message={apiError} />}
                {successMessage && (
                  <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
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
                        if (errors.fullName) {
                          setErrors((prev) => ({ ...prev, fullName: undefined }));
                        }
                      }}
                      error={errors.fullName}
                      autoComplete="name"
                    />
                    <Input
                      label="Telefon"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </>
                )}

                <Input
                  label="E-posta"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  error={errors.email}
                  autoComplete="email"
                  name="email"
                />

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Şifre
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) {
                          setErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      onKeyDown={(e) => {
                        if (typeof e.getModifierState === "function") {
                          setCapsLockOn(e.getModifierState("CapsLock"));
                        }
                      }}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      name="password"
                      className="field-base pr-11"
                      aria-invalid={!!errors.password}
                    />
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-navy"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-red-600">{errors.password}</p>
                  )}
                  {capsLockOn && (
                    <p className="mt-1.5 text-xs font-medium text-amber-600">
                      Caps Lock açık
                    </p>
                  )}
                </div>

                <Button type="submit" fullWidth size="lg" loading={loading} disabled={loading}>
                  {mode === "login" ? "Giriş Yap" : "Kayıt Ol"}
                </Button>

                <p className="text-center text-sm text-slate-500">
                  {mode === "login" ? (
                    <>
                      Hesabınız yok mu?{" "}
                      <button
                        type="button"
                        className="font-medium text-accent-strong transition hover:text-navy"
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
                        className="font-medium text-accent-strong transition hover:text-navy"
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
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
