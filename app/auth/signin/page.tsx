import { signIn } from "@/lib/auth"
import { ShieldCheck } from "lucide-react"
import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sign In | SecureUploadHub",
  description: "Sign in to manage your secure upload portals.",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Side: Illustration (Visible on large screens) */}
      <div className="hidden lg:flex lg:flex-1 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        {/* Background Gradients/Elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_var(--tw-gradient-stops))] from-blue-900/40 via-slate-900 to-slate-900"></div>
        <div className="absolute top-20 left-20 w-64 h-64 bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-20 right-20 w-64 h-64 bg-slate-600/20 rounded-full blur-[100px]"></div>

        <div className="relative z-10 w-full max-w-lg">
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Trusted by 10,000+ users
            </div>
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Securely Manage Your <span className="text-blue-500">File Portals</span>
            </h2>
            <p className="text-slate-400 text-lg">
              The professional way to collect files from anyone, anywhere, with military-grade security.
            </p>
          </div>

          <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-800">
            <Image
              src="/auth-illustration.png"
              alt="Secure Upload Illustration"
              fill
              className="object-cover"
              priority
            />
          </div>
        </div>
      </div>

      {/* Right Side: Sign In Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50 relative">
        {/* Background Decoration for Mobile/Tablet */}
        <div className="absolute inset-0 lg:hidden -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100/40 via-white to-white"></div>

        <div className="w-full max-w-md">
          <div className="flex justify-center mb-10 lg:hidden">
            <div className="bg-slate-900 p-3 rounded-2xl shadow-lg shadow-slate-200/50">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="bg-white lg:bg-transparent p-8 lg:p-0 rounded-[2rem] lg:rounded-none shadow-xl lg:shadow-none shadow-slate-200/50 border border-slate-100 lg:border-none">
            <div className="text-center lg:text-left mb-10">
              <div className="hidden lg:flex items-center gap-2 mb-8 text-slate-900">
                <div className="bg-slate-900 p-2 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight">SecureUploadHub</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
                Welcome back
              </h1>
              <p className="text-slate-500 text-lg">
                Sign in to your account
              </p>
            </div>

            <div className="space-y-4">
              {/* Google Sign In */}
              <form
                action={async () => {
                  "use server"
                  await signIn("google", { redirectTo: "/dashboard" })
                }}
              >
                <button
                  type="submit"
                  className="group w-full flex items-center justify-center gap-3 px-4 py-4 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-slate-700 active:scale-[0.98] shadow-sm"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </button>
              </form>

              {/* Dropbox Sign In */}
              <form
                action={async () => {
                  "use server"
                  await signIn("dropbox", { redirectTo: "/dashboard" })
                }}
              >
                <button
                  type="submit"
                  className="group w-full flex items-center justify-center gap-3 px-4 py-4 border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-slate-700 active:scale-[0.98] shadow-sm"
                >
                  <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" fill="#0061FF">
                    <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 14l6 4 6-4-6-4-6 4z" />
                  </svg>
                  Continue with Dropbox
                </button>
              </form>
            </div>

            <div className="mt-12 pt-8 border-t border-slate-200/60 lg:max-w-xs">
              <p className="text-xs text-slate-400 leading-relaxed text-center lg:text-left">
                By signing in, you agree to our <Link href="/terms" className="underline hover:text-slate-600 transition-colors">Terms of Service</Link> and <Link href="/privacy" className="underline hover:text-slate-600 transition-colors">Privacy Policy</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


