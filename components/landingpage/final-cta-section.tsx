import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface FinalCTASectionProps {
  onCtaClick: () => void;
}

export function FinalCTASection({ onCtaClick }: FinalCTASectionProps) {
  return (
    <section className="py-12 sm:py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-foreground rounded-[3rem] relative overflow-hidden py-20 px-8 text-center">
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-4xl lg:text-6xl font-bold text-white mb-8 tracking-tight">
              Ready to stop chasing files?
            </h2>
            <p className="text-xl text-slate-200 mb-12 max-w-2xl mx-auto font-medium">
              Create a professional upload portal and let clients send files the easy way.
            </p>
            <div className="flex items-center justify-center">
              <Link
                href="/auth/signin"
                onClick={onCtaClick}
                className="bg-white text-foreground px-4 py-3 rounded-lg font-medium text-sm hover:bg-slate-50 transition-all shadow-md inline-flex items-center justify-center gap-2"
              >
                Create your free portal
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
