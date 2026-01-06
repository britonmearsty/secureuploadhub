"use client";

import Link from 'next/link';
import { ArrowLeft, Home, Code, AlertTriangle } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { ThemeWrapper } from '@/components/theme-wrapper';

function ApiNotFoundContent() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <div className="max-w-2xl mx-auto text-center relative z-10">
        {/* Animated 404 with API Icon */}
        <div className="relative mb-8">
          <div className="text-[12rem] md:text-[16rem] font-bold text-muted/20 select-none leading-none animate-pulse font-mono">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-destructive/10 flex items-center justify-center animate-float border-2 border-destructive/20">
              <Code className="w-12 h-12 md:w-16 md:h-16 text-destructive" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-mono">
              API Endpoint Not Found
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              The API endpoint you're trying to access doesn't exist or has been moved.
            </p>
          </div>

          {/* Error Details */}
          <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <span className="font-semibold text-destructive">HTTP 404 - Not Found</span>
            </div>
            <p className="text-sm text-muted-foreground text-left">
              If you're a developer, check your API endpoint URL and ensure it matches the documented routes. 
              If you're a user, this page shouldn't be accessible through normal navigation.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:scale-105 transform"
            >
              <Home className="w-4 h-4" />
              Go Home
            </Link>
            
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all border border-border hover:shadow-md hover:scale-105 transform"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
          </div>

          {/* Developer Resources */}
          <div className="pt-12 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Developer resources:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href="#"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2 font-mono"
              >
                API Documentation
              </a>
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Dashboard
              </Link>
              <Link
                href="/auth/signin"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Authentication
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Elements - API/Tech themed */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl animate-pulse ${
            resolvedTheme === 'dark' ? 'bg-destructive/10' : 'bg-destructive/5'
          }`}></div>
          <div className={`absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl animate-pulse delay-1000 ${
            resolvedTheme === 'dark' ? 'bg-muted/20' : 'bg-muted/10'
          }`}></div>
          <div className={`absolute top-1/2 right-1/3 w-24 h-24 rounded-full blur-2xl animate-pulse delay-500 ${
            resolvedTheme === 'dark' ? 'bg-accent/30' : 'bg-accent/20'
          }`}></div>
        </div>
      </div>
    </div>
  );
}

export default function ApiNotFound() {
  return (
    <ThemeWrapper>
      <ApiNotFoundContent />
    </ThemeWrapper>
  );
}