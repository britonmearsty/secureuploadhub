"use client";

import Link from 'next/link';
import { ArrowLeft, Home, LogIn, UserPlus } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { ThemeWrapper } from '@/components/theme-wrapper';

function AuthNotFoundContent() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <div className="max-w-2xl mx-auto text-center relative z-10">
        {/* Animated 404 with Auth Icon */}
        <div className="relative mb-8">
          <div className="text-[12rem] md:text-[16rem] font-bold text-muted/20 select-none leading-none animate-pulse">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-warning/10 flex items-center justify-center animate-float border-2 border-warning/20">
              <LogIn className="w-12 h-12 md:w-16 md:h-16 text-warning" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Authentication Page Not Found
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              The authentication page you're looking for doesn't exist. Let's get you signed in.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:scale-105 transform"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </Link>
            
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all border border-border hover:shadow-md hover:scale-105 transform"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
          </div>

          {/* Auth Quick Actions */}
          <div className="pt-12 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Need help with your account?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/auth/signin"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signin"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Create Account
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Elements - Auth themed */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl animate-pulse ${
            resolvedTheme === 'dark' ? 'bg-warning/10' : 'bg-warning/5'
          }`}></div>
          <div className={`absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl animate-pulse delay-1000 ${
            resolvedTheme === 'dark' ? 'bg-info/20' : 'bg-info/10'
          }`}></div>
          <div className={`absolute top-1/2 right-1/3 w-24 h-24 rounded-full blur-2xl animate-pulse delay-500 ${
            resolvedTheme === 'dark' ? 'bg-success/30' : 'bg-success/20'
          }`}></div>
        </div>
      </div>
    </div>
  );
}

export default function AuthNotFound() {
  return (
    <ThemeWrapper>
      <AuthNotFoundContent />
    </ThemeWrapper>
  );
}