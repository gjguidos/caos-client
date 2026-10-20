"use client";

import { useRouter } from "next/navigation";

const BRAND_COLORS = {
  primary: "#000000",
  primaryDark: "#1a1a1a",
  secondary: "#FFDB00",
  background: "#F5F5F5",
} as const;

function LockIcon() {
  return (
    <svg
      className="h-12 w-12"
      style={{ color: BRAND_COLORS.primaryDark }}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <main className="w-full bg-white">
        <div className="mx-auto max-w-5xl px-4 pb-64 pt-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2">
            {/* Right Column - Content */}
            <div className="flex flex-col justify-center space-y-8">
              {/* Headline */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <LockIcon />
                  <h1 className="text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
                    Access denied
                  </h1>
                </div>

                <p className="text-lg text-gray-600 sm:text-xl">
                  You don't have permission to access this page.
                </p>
              </div>

              {/* What to do */}
              <ul className="space-y-2 text-base text-gray-700">
                <li className="flex items-start">
                  <span>Contact your administrator to request access</span>
                </li>
                <li className="flex items-start">
                  <span>Return to your dashboard</span>
                </li>
                <li className="flex items-start">
                  <span>Try logging out and back in if this is an error</span>
                </li>
              </ul>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => router.push("/")}
                  className="group inline-flex items-center justify-center rounded-full px-8 py-3 text-base font-semibold text-white transition-all hover:shadow-lg"
                  style={{
                    backgroundColor: BRAND_COLORS.primary,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      BRAND_COLORS.primaryDark;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      BRAND_COLORS.primary;
                  }}
                >
                  Go to agents
                </button>

                <button
                  onClick={() => router.back()}
                  className="group inline-flex items-center justify-center rounded-full border-2 px-8 py-3 text-base font-semibold transition-all hover:bg-gray-50"
                  style={{
                    borderColor: BRAND_COLORS.primary,
                    color: BRAND_COLORS.primary,
                  }}
                >
                  Go back
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
