import { signIn } from "@/lib/auth"
import { Cloud, Mail, ShieldCheck } from "lucide-react"
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | SecureUploadHub",
  description: "Sign in to manage your secure upload portals.",
};

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100/40 via-white to-white"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-slate-200/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-slate-200/20 blur-[100px]" />
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-lg shadow-slate-200/50">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">
              Welcome back
            </h1>
            <p className="text-slate-500">
              Sign in to manage your secure upload portals
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
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-slate-700 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all font-semibold text-slate-700 active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#0061FF">
                  <path d="M6 2L0 6l6 4-6 4 6 4 6-4-6-4 6-4-6-4zm12 0l-6 4 6 4-6 4 6 4 6-4-6-4 6-4-6-4zM6 14l6 4 6-4-6-4-6 4z" />
                </svg>
                Continue with Dropbox
              </button>
            </form>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-center text-xs text-slate-400">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

