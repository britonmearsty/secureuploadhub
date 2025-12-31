import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FadeIn, ScaleIn } from './animations';

interface HeroSectionProps {
  onCtaClick: () => void;
  onDemoVideoClick: () => void;
}

export function HeroSection({ onCtaClick, onDemoVideoClick }: HeroSectionProps) {
  return (
    <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-40 overflow-hidden">
      {/* Premium Background */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100/40 via-white to-white"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <FadeIn className="space-y-8">
            <div>
              <span className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary font-semibold text-sm mb-6">No more file chasing</span>
              <h1 className="text-5xl lg:text-7xl font-bold text-foreground mb-6 tracking-tight leading-tight">
                Secure client uploads made simple
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
                Create a professional upload portal in seconds. Clients send files without confusion. No logins, no fuss.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4">
              <Link
                href="/auth/signin"
                onClick={onCtaClick}
                className="bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-start"
              >
                Create Your Portal Link
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button
                onClick={onDemoVideoClick}
                className="border-2 border-foreground text-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-foreground hover:text-white transition-all w-full sm:w-auto"
              >
                View demo
              </button>
            </div>
          </FadeIn>

          <ScaleIn className="relative h-96 lg:h-full">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl"></div>
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
              [Hero Image/Illustration]
            </div>
          </ScaleIn>
        </div>
      </div>
    </section>
  );
}
