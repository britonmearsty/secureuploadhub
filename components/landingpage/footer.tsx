import React from 'react';
import { ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-background border-t border-border py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="bg-foreground p-2 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">SecureUploadHub</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap justify-center">
            <a href="/privacy" className="hover:text-primary transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-primary transition-colors">Terms</a>
            <a href="/security" className="hover:text-primary transition-colors">Security</a>
            <a href="/cookie-policy" className="hover:text-primary transition-colors">Cookies</a>
            <a href="/gdpr" className="hover:text-primary transition-colors">GDPR</a>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} SecureUploadHub</p>
        </div>
      </div>
    </footer>
  );
}
