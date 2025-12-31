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
  Sparkles
} from 'lucide-react';
import Image from 'next/image';
import {
  VideoModal,
  Navigation,
  FadeIn,
  ScaleIn,
  Counter,
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
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Premium Background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100/40 via-white to-white"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-slate-300/10 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn delay={0.1}>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-8 max-w-5xl mx-auto leading-[1.1]">
              The professional way to receive client files ! <br className="hidden lg:block" />
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
              Collect large files from clients without email limits, broken links, or back-and-forth follow-ups. Create a branded upload portal in minutes and let files sync automatically to your storage.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
              <Link
                href="/auth/signin"
                onClick={handleCtaClick}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-bold text-lg hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group ring-4 ring-transparent hover:ring-primary/10"
              >
                Create your free portal
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={handleDemoVideoClick}
                className="w-full sm:w-auto bg-white border border-border text-foreground px-8 py-4 rounded-2xl font-bold text-lg hover:bg-muted/50 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-primary border-b-[5px] border-b-transparent ml-1"></div>
                </div>
                View demo
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex flex-col items-center gap-6">
              <p className="text-sm font-semibold text-muted-foreground tracking-wide">Trusted by professionals handling sensitive client files</p>
              <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 opacity-80">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">Designers</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">Agencies</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">Accountants</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">Legal teams</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">Consultants</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Used worldwide to collect files safely and professionally.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Problem Section – "Why file transfer is broken" */}
      <section id="features" className="py-24 bg-secondary/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Why traditional file transfer doesn't work anymore</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Email attachments, generic cloud links, and chat apps weren't built for professional client workflows. They create friction, risk, and wasted time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
            {/* Large Card */}
            <FadeIn delay={0.1} className="md:col-span-2">
              <div className="glass-panel p-10 rounded-[2rem] h-full">
                <div className="bg-red-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-8">
                  <MailWarning className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground tracking-tight">No more "file too large" emails</h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                  Clients can upload large files without compression, split archives, or failed sends.
                </p>
              </div>
            </FadeIn>

            {/* Small Card 1 */}
            <ScaleIn delay={0.2}>
              <div className="bg-foreground text-background rounded-[2rem] p-8 flex flex-col items-start justify-between relative overflow-hidden h-full">
                <div className="absolute inset-0 opacity-20 pointer-events-none">
                  <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary blur-3xl" />
                  <div className="absolute -left-16 -bottom-10 w-52 h-52 rounded-full bg-slate-500 blur-3xl" />
                </div>
                <div className="relative z-10 w-full h-full flex flex-col">
                  <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center mb-auto backdrop-blur-md">
                    <Lock className="w-6 h-6 text-white" />
                  </div>
                  <div className="mt-8">
                    <h3 className="text-xl font-bold mb-3 text-white">Lost links & missing context</h3>
                    <p className="text-slate-100/80 text-sm leading-relaxed">Files arrive without structure, labels, or client details.</p>
                  </div>
                </div>
              </div>
            </ScaleIn>

            {/* Small Card 2 */}
            <ScaleIn delay={0.3}>
              <div className="bg-white border border-border p-8 rounded-[2rem] flex flex-col items-start justify-between relative overflow-hidden shadow-sm h-full">
                <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-auto">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-3 text-foreground">Security & compliance risks</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Personal links and shared folders expose sensitive data.</p>
                </div>
              </div>
            </ScaleIn>

            {/* Medium Card */}
            <FadeIn delay={0.4} className="md:col-span-2">
              <div className="glass-panel p-10 rounded-[2rem] flex flex-col md:flex-row gap-10 items-center h-full">
                <div className="flex-1">
                  <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                    <Zap className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-3xl font-bold mb-4 text-foreground tracking-tight">Chasing clients wastes time</h3>
                  <p className="text-lg text-muted-foreground leading-relaxed">Manual follow-ups slow projects and frustrate everyone.</p>
                </div>
                <div className="w-full md:w-2/5 flex justify-center">
                  <div className="w-60 h-60 bg-white rounded-full flex items-center justify-center p-4">
                    <Lottie animationData={featureAnimation} loop={true} />
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Solution Section – Value Proposition */}
      <section id="use-cases" className="py-32 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Built for modern client workflows</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Everything you need to collect files professionally — without changing how you already work.
            </p>
          </div>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="grid gap-8 md:grid-cols-2">
              {[
                {
                  icon: Sparkles,
                  title: "Branded Upload Portals",
                  desc: "Create a clean, professional upload page with your logo, colors, and instructions.",
                },
                {
                  icon: Zap,
                  title: "Zero Friction for Clients",
                  desc: "No accounts. No installs. Just open the link and upload.",
                },
                {
                  icon: FolderSync,
                  title: "Automatic File Sync",
                  desc: "Files sync directly to your existing cloud storage.",
                },
                {
                  icon: ShieldCheck,
                  title: "Security First",
                  desc: "Encrypted uploads, access controls, and audit-ready logs.",
                }
              ].map((item, i) => (
                <FadeIn key={i} delay={i * 0.1} className="h-full">
                  <div className="bg-background border border-border rounded-3xl p-8 flex flex-col gap-4 h-full">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary">
                      <item.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-foreground tracking-tight">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed flex-grow">
                      {item.desc}
                    </p>
                  </div>
                </FadeIn>
              ))}
            </div>
            <div className="relative h-full flex justify-center items-center">
              <Image
                src="/images/secure-data.png"
                alt="Secure data illustration"
                width={500}
                height={500}
                className="rounded-3xl shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works (Process clarity) */}
      <section id="how-it-works" className="py-32 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">How it works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-12 lg:gap-16 relative">
            <div className="absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-border to-transparent hidden md:block" />

            {/* Step 1 */}
            <FadeIn delay={0.1}>
              <div className="relative text-center group">
                <div
                  className="bg-background relative z-10 w-24 h-24 rounded-3xl border border-border shadow-sm flex items-center justify-center mx-auto mb-8"
                >
                  <div className="bg-primary/5 w-16 h-16 rounded-2xl flex items-center justify-center">
                    <LinkIcon className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">Step 1</span>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Create your portal</h3>
                <p className="text-muted-foreground leading-relaxed px-4">
                  Set up a branded upload page in minutes. Choose storage, permissions, and file rules.
                </p>
              </div>
            </FadeIn>

            {/* Step 2 */}
            <FadeIn delay={0.2}>
              <div className="relative text-center group">
                <div
                  className="bg-background relative z-10 w-24 h-24 rounded-3xl border border-border shadow-sm flex items-center justify-center mx-auto mb-8"
                >
                  <div className="bg-secondary w-16 h-16 rounded-2xl flex items-center justify-center">
                    <Send className="w-8 h-8 text-foreground" />
                  </div>
                </div>
                <span className="inline-block bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">Step 2</span>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Share the link</h3>
                <p className="text-muted-foreground leading-relaxed px-4">
                  Send a single link to your client — email, chat, or embed it on your site.
                </p>
              </div>
            </FadeIn>

            {/* Step 3 */}
            <FadeIn delay={0.3}>
              <div className="relative text-center group">
                <div
                  className="bg-background relative z-10 w-24 h-24 rounded-3xl border border-border shadow-sm flex items-center justify-center mx-auto mb-8"
                >
                  <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center">
                    <FolderSync className="w-8 h-8 text-emerald-600" />
                  </div>
                </div>
                <span className="inline-block bg-emerald-500/10 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">Step 3</span>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Files sync automatically</h3>
                <p className="text-muted-foreground leading-relaxed px-4">
                  Uploads go straight into your storage, organized and ready to use.
                </p>
              </div>
            </FadeIn>
          </div>

          <div className="text-center mt-20">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95"
            >
              Create your first portal
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Security & Compliance Section */}
      <section id="security" className="py-32 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Security you can show your auditor</h2>
              <p className="text-xl text-muted-foreground leading-relaxed mb-10">
                Built with enterprise-grade security so you can confidently collect sensitive files.
              </p>

              <ul className="space-y-4 text-lg text-muted-foreground">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  Encrypted uploads (in transit & at rest)
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  Controlled access & permissions
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  Activity logs & audit trails
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  Data ownership stays with you
                </li>
              </ul>
              <div className="mt-10">
                <Link href="/security" className="text-primary font-bold hover:underline">
                  View security details <ArrowRight className="inline w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/20 to-primary/20 rounded-[3rem] blur-3xl -z-10" />
              <div className="glass-panel p-8 rounded-[2.5rem] border border-white/40 shadow-2xl">
                <div className="bg-slate-950 rounded-2xl p-6 font-mono text-xs text-slate-300 shadow-inner">
                  <div className="flex gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-amber-500" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  </div>
                  <p className="text-emerald-400">$ Encrypting file "tax_return_2024.pdf"...</p>
                  <p className="text-slate-500 mt-1">Done (0.4s)</p>
                  <p className="text-emerald-400 mt-2">$ Verifying signature...</p>
                  <p className="text-slate-500 mt-1">Verified.</p>
                  <p className="text-emerald-400 mt-2">$ Uploading to secure_bucket_us_east...</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-emerald-500 w-[75%] h-full rounded-full animate-pulse" />
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-foreground">Audit Log</p>
                    <p className="text-sm text-muted-foreground">Real-time security monitoring</p>
                  </div>
                  <div className="bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">Active</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations / Storage Section */}
      <section id="integrations" className="py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Fits into your existing storage</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              No need to migrate or duplicate files. Connect the tools you already use.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
            {/* Google Drive Card */}
            <FadeIn delay={0.1} className="bg-background border border-border rounded-3xl p-8 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Google Drive</h3>
                  <p className="text-muted-foreground text-sm">Seamless cloud storage integration</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl">
                  <UploadCloud className="w-6 h-6 text-primary" />
                </div>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Auto-organize files by project
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Share folders with team instantly
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Real-time sync and versioning
                </li>
              </ul>
            </FadeIn>

            {/* Dropbox Card */}
            <FadeIn delay={0.2} className="bg-background border border-border rounded-3xl p-8 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-foreground mb-2">Dropbox</h3>
                  <p className="text-muted-foreground text-sm">Sync files everywhere you work</p>
                </div>
                <div className="bg-sky-100 p-3 rounded-xl">
                  <UploadCloud className="w-6 h-6 text-sky-600" />
                </div>
              </div>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Access files on any device
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Collaborative file management
                </li>
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  Advanced backup and restore
                </li>
              </ul>
            </FadeIn>
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
