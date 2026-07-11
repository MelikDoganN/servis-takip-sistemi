"use client";

import { FormEvent, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

interface FormErrors {
  email?: string;
  password?: string;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateForm(email: string, password: string): FormErrors {
  const errors: FormErrors = {};

  if (!email.trim()) {
    errors.email = "E-posta adresi boş olamaz";
  } else if (!emailRegex.test(email)) {
    errors.email = "Geçerli bir e-posta adresi girin";
  }

  if (!password.trim()) {
    errors.password = "Şifre boş olamaz";
  }

  return errors;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const validationErrors = validateForm(email, password);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      setSubmitted(true);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-primary-700 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 shadow-lg">
            <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Servis Takip Sistemi</h1>
          <p className="mt-2 text-sm text-gray-300">Yönetim paneline giriş yapın</p>
        </div>

        <Card>
          <CardContent className="py-6">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
                autoComplete="current-password"
              />

              <Button type="submit" fullWidth size="lg">
                Giriş Yap
              </Button>

              {submitted && (
                <p className="rounded-lg bg-green-50 px-4 py-3 text-center text-sm text-green-700">
                  Form doğrulaması başarılı. Backend entegrasyonu Gün 6&apos;da yapılacak.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
