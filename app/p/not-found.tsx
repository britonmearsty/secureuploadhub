"use client";

import Link from 'next/link';
import { ArrowLeft, Home, Upload, ExternalLink } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { ThemeWrapper } from '@/components/theme-wrapper';

function PortalNotFoundContent() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <div className="max-w-2xl mx-auto text-center relative z-10">
        {/* Animated 404 with Upload Icon */}
        <div className="relative mb-8">
          <div className="text-[12rem] md:text-[16rem] font-bold text-muted/20 select-none leading-none animate-pulse">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-warning/10 flex items-center justify-center animate-float border-2 border-warning/20">
              <Upload className="w-12 h-12 md:w-16 md:h-16 text-warning" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Upload Portal Not Found
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              The upload portal you're looking for doesn't exist, has expired, or the link may be incorrect.
            </p>
          </div>

          {/* Portal Info */}
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-6 max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-3">
              <ExternalLink className="w-5 h-5 text-warning" />
              <span className="font-semibold text-warning">Invalid Portal Link</span>
            </div>
            <div className="text-sm text-muted-foreground text-left space-y-2">
              <p>This could happen if:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>The portal has been deleted or expired</li>
                <li>The link was typed incorrectly</li>
                <li>The portal owner has restricted access</li>
              </ul>
            </div>
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
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all border border-border hover:shadow-md hover:scale-105 transform"
            >
              <Upload className="w-4 h-4" />
              Create Portal
            </Link>
          </div>

          {/* Help Section */}
          <div className="pt-12 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Need help or have questions?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/auth/signin"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Sign In
              </Link>
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Learn More
              </Link>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Privacy Policy
              </Link>
              <Link
                href="/security"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Security
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Elements - Portal themed */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl animate-pulse ${
            resolvedTheme === 'dark' ? 'bg-warning/10' : 'bg-warning/5'
          }`}></div>
          <div className={`absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl animate-pulse delay-1000 ${
            resolvedTheme === 'dark' ? 'bg-success/20' : 'bg-success/10'
          }`}></div>
          <div className={`absolute top-1/2 right-1/3 w-24 h-24 rounded-full blur-2xl animate-pulse delay-500 ${
            resolvedTheme === 'dark' ? 'bg-info/30' : 'bg-info/20'
          }`}></div>
        </div>
      </div>
    </div>
  );
}

export default function PortalNotFound() {
  return (
    <ThemeWrapper>
      <PortalNotFoundContent />
    </ThemeWrapper>
  );
}