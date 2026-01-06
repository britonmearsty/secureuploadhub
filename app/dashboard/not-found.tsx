"use client";

import Link from 'next/link';
import { ArrowLeft, Home, LayoutDashboard, Upload } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';

export default function DashboardNotFound() {
  const { resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 relative overflow-hidden">
      <div className="max-w-2xl mx-auto text-center relative z-10">
        {/* Animated 404 with Dashboard Icon */}
        <div className="relative mb-8">
          <div className="text-[12rem] md:text-[16rem] font-bold text-muted/20 select-none leading-none animate-pulse">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-info/10 flex items-center justify-center animate-float border-2 border-info/20">
              <LayoutDashboard className="w-12 h-12 md:w-16 md:h-16 text-info" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Dashboard Page Not Found
            </h1>
            <p className="text-lg text-muted-foreground max-w-md mx-auto leading-relaxed">
              The dashboard page you're looking for doesn't exist. Let's get you back to your workspace.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md hover:scale-105 transform"
            >
              <LayoutDashboard className="w-4 h-4" />
              My Dashboard
            </Link>
            
            <Link
              href="/dashboard/portals"
              className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-6 py-3 rounded-xl font-semibold hover:bg-secondary/80 transition-all border border-border hover:shadow-md hover:scale-105 transform"
            >
              <Upload className="w-4 h-4" />
              My Portals
            </Link>
          </div>

          {/* Dashboard Quick Links */}
          <div className="pt-12 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">
              Looking for something specific in your dashboard?
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard/portals"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Upload Portals
              </Link>
              <Link
                href="/dashboard/clients"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Clients
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Settings
              </Link>
              <Link
                href="/dashboard/billing"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4 hover:underline-offset-2"
              >
                Billing
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative Elements - Dashboard themed */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className={`absolute top-1/4 left-1/4 w-32 h-32 rounded-full blur-3xl animate-pulse ${
            resolvedTheme === 'dark' ? 'bg-info/10' : 'bg-info/5'
          }`}></div>
          <div className={`absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full blur-3xl animate-pulse delay-1000 ${
            resolvedTheme === 'dark' ? 'bg-success/20' : 'bg-success/10'
          }`}></div>
          <div className={`absolute top-1/2 right-1/3 w-24 h-24 rounded-full blur-2xl animate-pulse delay-500 ${
            resolvedTheme === 'dark' ? 'bg-primary/30' : 'bg-primary/20'
          }`}></div>
        </div>
      </div>
    </div>
  );
}