"use client";

import React, { useState } from 'react';
import posthog from 'posthog-js';
import Link from 'next/link';
import Lottie from 'lottie-react';
import featureAnimation from '@/public/lottie/feature.json';
import {
  ShieldCheck,
  UploadCloud,
  Zap,
  Lock,
  MailWarning,
  CheckCircle2,
  ArrowRight,
  Link as LinkIcon,
  Send,
  FolderSync,
  Sparkles,
  FileText,
  Users
} from 'lucide-react';
import Image from 'next/image';
import {
  VideoModal,
  Navigation,
  FadeIn,
  ScaleIn,
  TestimonialsSection,
  PricingSection,
  FAQSection,
  FinalCTASection,
  Footer
} from '@/components/landingpage';

export default function LandingPage() {
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  const handleCtaClick = () => {
    posthog.capture('cta_clicked', {
      cta_location: 'hero',
      cta_text: 'Create Your Portal Link',
    });
  };

  const handleDemoVideoClick = () => {
    posthog.capture('demo_video_clicked', {
      cta_location: 'hero',
    });
    setIsVideoModalOpen(true);
  };

  const handleFreePlanClick = () => {
    posthog.capture('free_plan_clicked', {
      plan: 'individual',
      billing_period: 'none',
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-slate-200 selection:text-slate-900 font-sans">
      <VideoModal isOpen={isVideoModalOpen} onClose={() => setIsVideoModalOpen(false)} />
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden border-b border-slate-200/60 bg-white">
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <FadeIn delay={0.1}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              The secure way to request files
            </div>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-[1.1]">
              Secure file collection for <br className="hidden lg:block" />
              <span className="text-slate-600">modern professionals.</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              Stop chasing email attachments. Create a branded upload portal in seconds and let clients send you files securely.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/auth/signin"
                onClick={handleCtaClick}
                className="w-full sm:w-auto bg-slate-900 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
              >
                Start for free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button
                onClick={handleDemoVideoClick}
                className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[6px] border-l-slate-900 border-b-[4px] border-b-transparent ml-0.5"></div>
                </div>
                View demo
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="pt-8 border-t border-slate-100 max-w-2xl mx-auto">
              <p className="text-sm font-medium text-slate-500 mb-6">Trusted by professionals at</p>
              <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 opacity-70 grayscale">
                {['Acme Corp', 'Global Inc', 'NextGen', 'Stark Ind'].map((company, i) => (
                  <div key={i} className="text-lg font-bold text-slate-400 select-none block">{company}</div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Feature Grid (Bento Style) */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4 tracking-tight">Everything you need to receive files</h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Replace messy email threads with a streamlined, professional workflow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-4 gap-6 content-stretch">
            {/* Main Value - Large Card */}
            <div className="md:col-span-3 lg:col-span-2 row-span-2 group relative overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <UploadCloud className="w-64 h-64 text-slate-900 -mr-16 -mt-16" />
              </div>
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-6 text-white">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-3">Unlimited Large Uploads</h3>
                  <p className="text-slate-500 leading-relaxed">
                    Receive huge files without worrying about email attachment limits. Clients can upload securely from any device, anywhere.
                  </p>
                </div>
                <div className="mt-8 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">PDF</div>
                    <div className="flex-1">
                      <div className="h-2 w-24 bg-slate-200 rounded-full mb-1"></div>
                      <div className="h-1.5 w-12 bg-slate-100 rounded-full"></div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">ZIP</div>
                    <div className="flex-1">
                      <div className="h-2 w-32 bg-slate-200 rounded-full mb-1"></div>
                      <div className="h-1.5 w-16 bg-slate-100 rounded-full"></div>
                    </div>
                    <div className="text-xs text-slate-400 font-mono">Uploading...</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Security Card */}
            <div className="md:col-span-3 lg:col-span-2 group overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Bank-Grade Security</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                End-to-end encryption for sensitive documents. Your client data is safe, compliant, and always protected.
              </p>
            </div>

            {/* Organization Card */}
            <div className="md:col-span-3 lg:col-span-2 group overflow-hidden rounded-3xl bg-white border border-slate-200 p-8 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-6">
                <FolderSync className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Auto-Organized</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Files are automatically sorted into folders. No more searching through lost emails or disparate download links.
              </p>
            </div>

            {/* Speed Card */}
            <div className="md:col-span-3 lg:col-span-4 rounded-3xl bg-slate-900 text-white p-8 shadow-lg flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex-1 relative z-10">
                <div className="flex items-center gap-2 mb-4 text-emerald-400 font-mono text-sm">
                  <Zap className="w-4 h-4" /> Lightning Fast
                </div>
                <h3 className="text-2xl font-bold mb-3">Save 10+ hours a week</h3>
                <p className="text-slate-300 leading-relaxed max-w-lg">
                  Stop chasing clients for files. Send one link, get everything you need. No login required for your clients.
                </p>
              </div>
              <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10 w-full md:w-auto min-w-[300px]">
                <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white text-xs">JD</div>
                    <div className="text-sm">
                      <div className="font-semibold">John Doe</div>
                      <div className="text-xs text-slate-400">Uploaded 5 files</div>
                    </div>
                  </div>
                  <span className="text-xs font-mono text-emerald-400">Just now</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-white/10 rounded-full w-3/4"></div>
                  <div className="h-2 bg-white/10 rounded-full w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works - Horizontal Process */}
      <section className="py-24 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
            <p className="mt-4 text-lg text-slate-500">Simple for you, effortless for your clients.</p>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-slate-100 z-0"></div>

            <div className="grid md:grid-cols-3 gap-12 relative z-10">
              <div className="text-center">
                <div className="w-24 h-24 mx-auto bg-white border border-slate-200 rounded-3xl flex items-center justify-center shadow-sm mb-6">
                  <span className="text-3xl font-bold text-slate-900">1</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Create a Portal</h3>
                <p className="text-slate-500 px-4">Generate a secure upload link with your branding in seconds.</p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 mx-auto bg-white border border-slate-200 rounded-3xl flex items-center justify-center shadow-sm mb-6">
                  <span className="text-3xl font-bold text-slate-900">2</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Share the Link</h3>
                <p className="text-slate-500 px-4">Send the link via email, SMS, or paste it on your website.</p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 mx-auto bg-white border border-slate-200 rounded-3xl flex items-center justify-center shadow-sm mb-6">
                  <span className="text-3xl font-bold text-slate-900">3</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Files Sync Auto</h3>
                <p className="text-slate-500 px-4">Receive files directly in your dashboard or cloud storage.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-12">Connect the tools you use</h2>
          <div className="flex flex-wrap justify-center gap-6">
            {['Google Drive', 'Dropbox', 'OneDrive', 'Box', 'Slack'].map((tool) => (
              <div key={tool} className="bg-white px-8 py-4 rounded-xl border border-slate-200 font-semibold text-slate-600 shadow-sm hover:border-slate-300 transition-colors">
                {tool}
              </div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />
      <PricingSection onFreePlanClick={handleFreePlanClick} />
      <FAQSection />
      <FinalCTASection onCtaClick={handleCtaClick} />
      <Footer />
    </div>
  );
}
