"use client";

import { useState } from "react";
import Link from "next/link";
import { TRPCSessionProvider } from "@/client/components/TRPCSessionProvider";
import { trpc } from "@/client/lib/trpc";

function RequestResetForm() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const requestReset = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    requestReset.mutate({ email });
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 mb-2">Check your email</h2>
        <p className="text-zinc-600 mb-4">
          If an account exists with <strong>{email}</strong>, you&apos;ll receive a password reset link shortly.
        </p>
        <Link href="/signin" className="text-blue-600 hover:underline font-medium">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="you@example.com"
        />
      </div>

      <button
        type="submit"
        disabled={requestReset.isPending}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {requestReset.isPending ? "Sending..." : "Send Reset Link"}
      </button>

      <div className="text-center">
        <Link href="/signin" className="text-sm text-zinc-600 hover:text-zinc-900">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <TRPCSessionProvider>
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="font-bold text-xl text-zinc-900">Todo App</span>
            </Link>
            <h1 className="text-2xl font-bold text-zinc-900">Reset your password</h1>
            <p className="text-zinc-600 mt-1">Enter your email to receive a reset link</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-6">
            <RequestResetForm />
          </div>
        </div>
      </main>
    </TRPCSessionProvider>
  );
}
