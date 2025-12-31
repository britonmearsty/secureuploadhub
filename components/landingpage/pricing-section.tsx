import React from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import { ScaleIn } from './animations';

interface PricingSectionProps {
  onFreePlanClick: () => void;
}

export function PricingSection({ onFreePlanClick }: PricingSectionProps) {
  return (
    <section id="pricing" className="py-24 bg-slate-50 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 tracking-tight">Simple, transparent pricing</h2>
          <p className="text-lg text-slate-500">Pick the plan that works for you. No hidden fees.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <ScaleIn className="h-full">
            <div className="bg-white p-10 rounded-3xl border border-slate-200 flex flex-col h-full hover:shadow-xl transition-all duration-300">
              <h3 className="text-xl font-bold mb-2 text-slate-900">Free</h3>
              <div className="mb-8">
                <span className="text-5xl font-bold text-slate-900 tracking-tight">$0</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                <li className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> 1 portal
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Basic uploads
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm font-medium">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Secure hosting
                </li>
              </ul>
              <Link href="/auth/signin" onClick={onFreePlanClick} className="block w-full py-4 rounded-xl border-2 border-slate-200 font-bold hover:border-slate-300 hover:bg-slate-50 transition-all text-center text-slate-900">Get started free</Link>
            </div>
          </ScaleIn>

          {/* Pro Plan */}
          <ScaleIn delay={0.1} className="h-full">
            <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 shadow-2xl flex flex-col relative h-full hover:shadow-emerald-900/20 transition-all duration-300">
              <div className="absolute top-0 right-0 -mt-2 -mr-2">
                <span className="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</span>
              </div>
              <h3 className="text-xl font-bold mb-2 text-white relative z-10">Professional</h3>
              <div className="mb-8 relative z-10">
                <span className="text-5xl font-bold text-white tracking-tight">$12</span>
                <span className="text-slate-400 font-medium">/ month</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1 relative z-10">
                <li className="flex items-center gap-3 text-slate-200 text-sm font-medium">
                  <div className="bg-white/10 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div> Unlimited portals
                </li>
                <li className="flex items-center gap-3 text-slate-200 text-sm font-medium">
                  <div className="bg-white/10 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div> Branded uploads
                </li>
                <li className="flex items-center gap-3 text-slate-200 text-sm font-medium">
                  <div className="bg-white/10 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div> Storage integrations
                </li>
                <li className="flex items-center gap-3 text-slate-200 text-sm font-medium">
                  <div className="bg-white/10 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div> Priority support
                </li>
              </ul>
              <Link href="/auth/signin" className="relative z-10 block w-full py-4 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 transition-all shadow-lg text-center">
                Upgrade to Pro
              </Link>
            </div>
          </ScaleIn>
        </div>
      </div>
    </section>
  );
}
