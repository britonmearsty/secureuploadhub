import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface FinalCTASectionProps {
  onCtaClick: () => void;
}

export function FinalCTASection({ onCtaClick }: FinalCTASectionProps) {
  return (
    <section className="py-24 px-4 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="bg-slate-900 rounded-3xl relative overflow-hidden py-20 px-8 text-center shadow-xl">
          {/* Background Decorative Circles */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-slate-800 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-900/40 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

          <div className="max-w-3xl mx-auto relative z-10">
            <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 tracking-tight">
              Ready to streamline your workflow?
            </h2>
            <p className="text-lg text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Join thousands of professionals who use our platform to request files securely and professionally.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/signin"
                onClick={onCtaClick}
                className="w-full sm:w-auto bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-100 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                Get Started for Free
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
