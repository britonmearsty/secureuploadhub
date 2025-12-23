"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import posthog from 'posthog-js';
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
  FileText,
  Globe,
  Clock,
  Menu,
  X,
  Link as LinkIcon,
  Send,
  FolderSync,
  Star,
  ChevronDown,
  ChevronUp,
  Mail,
  MessageSquare,
  HelpCircle,
  Palette,
  Sparkles,
  Bell
} from 'lucide-react';
import { motion } from 'framer-motion';

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function ScaleIn({ children, delay = 0, className = "" }: { children: React.ReactNode, delay?: number, className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function Counter({ end, duration = 2000, suffix = '', prefix = '', decimals = 0 }: { end: number, duration?: number, suffix?: string, prefix?: string, decimals?: number }) {
  const [count, setCount] = useState(0);
  const countRef = React.useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (countRef.current) {
      observer.observe(countRef.current);
    }

    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Ease out quart
      const ease = 1 - Math.pow(1 - percentage, 4);

      setCount(end * ease);

      if (progress < duration) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration, isVisible]);

  return (
    <span ref={countRef}>
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
}

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const handlePricingToggle = () => {
    const newIsAnnual = !isAnnual;
    setIsAnnual(newIsAnnual);
    posthog.capture('pricing_toggle_changed', {
      billing_period: newIsAnnual ? 'annual' : 'monthly',
      previous_billing_period: isAnnual ? 'annual' : 'monthly',
    });
  };

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
      {/* Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setIsVideoModalOpen(false)}>
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsVideoModalOpen(false)}
              className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 rounded-full p-2 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6 text-slate-700" />
            </button>
            <div className="p-4 sm:p-8">
              <div className="relative w-full" style={{ paddingBottom: '56.25%', height: 0 }}>
                <video
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  controls
                  src="/hero.mp4"
                />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 transition-all duration-300">
        <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-b border-border/50 support-[backdrop-filter]:bg-white/60"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center gap-2 group cursor-pointer">
              <div className="bg-primary/10 p-2 rounded-xl group-hover:bg-primary/20 transition-colors">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                SecureUploadHub
              </span>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {['Features', 'Use Cases', 'How It Works', 'Security', 'Pricing'].map((item) => (
                <a
                  key={item}
                  href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-all"
                >
                  {item}
                </a>
              ))}
            </div>

            {/* CTA */}
            <div className="hidden md:flex items-center gap-4">
              <a href="#faq" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
              <Link
                href="/auth/signin"
                className="bg-primary text-primary-foreground px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
              >
                Get Started
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden absolute top-full left-0 w-full bg-white/95 backdrop-blur-xl border-b border-border p-4 shadow-xl animate-slide-up">
              <div className="flex flex-col gap-2">
                {['Features', 'Use Cases', 'How It Works', 'Security', 'Integrations', 'Pricing', 'FAQ'].map((item) => (
                  <a
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm font-medium text-muted-foreground hover:text-primary hover:bg-accent px-4 py-3 rounded-xl transition-all"
                  >
                    {item}
                  </a>
                ))}
                <div className="px-4 pt-4 border-t border-border mt-2">
                  <Link
                    href="/auth/signin"
                    className="flex items-center justify-center w-full bg-primary text-primary-foreground px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
                  >
                    Get Started Free
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-40 overflow-hidden">
        {/* Premium Background */}
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100/40 via-white to-white"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-slate-300/10 blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm border border-border px-4 py-1.5 rounded-full text-foreground text-xs font-semibold tracking-wide uppercase mb-8 shadow-sm animate-fade-in hover:scale-105 transition-transform cursor-default">
              <span className="relative flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Now supporting 100GB+ Transfers</span>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight text-foreground mb-8 max-w-5xl mx-auto leading-[1.1]">
              Client file collection, <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-slate-600 relative">
                perfected for professionals.
                {/* Underline decoration */}
                <svg className="absolute w-full h-3 -bottom-2 left-0 text-primary opacity-30" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.2}>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
              Stop chasing email attachments. Create a secure, branded portal in seconds and receive files directly to your Google Drive or Dropbox.
            </p>
          </FadeIn>

          <FadeIn delay={0.3}>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20">
              <Link
                href="/auth/signin"
                onClick={handleCtaClick}
                className="w-full sm:w-auto bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-bold text-lg hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group ring-4 ring-transparent hover:ring-primary/10"
              >
                Start for Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={handleDemoVideoClick}
                className="w-full sm:w-auto bg-white border border-border text-foreground px-8 py-4 rounded-2xl font-bold text-lg hover:bg-muted/50 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
              >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-primary border-b-[5px] border-b-transparent ml-1"></div>
                </div>
                Watch Demo
              </button>
            </div>
          </FadeIn>

          <FadeIn delay={0.4}>
            <div className="flex flex-col items-center gap-6">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Trusted by forward-thinking teams</p>
              <div className="flex flex-wrap justify-center gap-x-12 gap-y-8 opacity-60 hover:opacity-100 transition-opacity duration-500">
                {/* Logos could be images but using text for now with refined styles */}
                <span className="text-xl font-bold font-serif text-foreground/80">TAXPRO</span>
                <span className="text-xl font-bold tracking-tighter text-foreground/80">CREATIVE<span className="text-primary">CO</span></span>
                <span className="text-xl font-semibold italic text-foreground/80">Legal.ly</span>
                <span className="text-xl font-mono text-foreground/80">STREAMLINE</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Bento Grid Feature Section */}
      <section id="features" className="py-24 bg-secondary/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Why file transfer is broken</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Standard tools weren't built for client workflows. SecureUploadHub was designed to solve the friction.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
            {/* Large Card */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2rem] hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 group">
              <FadeIn delay={0.1} className="h-full">
                <div className="bg-red-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-red-500/20 transition-colors">
                  <MailWarning className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground tracking-tight">No more "File too large" emails</h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                  Gmail's 25MB limit is the enemy of productivity. We handle files up to 100GB without breaking a sweat, ensuring you get the high-res content you actually need.
                </p>
                <div className="flex gap-2">
                  <span className="bg-white/50 border border-border/50 px-4 py-1.5 rounded-full text-sm font-semibold text-muted-foreground italic backdrop-blur-sm">"Sent 5 emails for 1 project" — Never again.</span>
                </div>
              </FadeIn>
            </div>

            {/* Small Card 1 */}
            <div className="bg-foreground text-background rounded-[2rem] p-8 flex flex-col items-start justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary blur-3xl group-hover:bg-primary/80 transition-colors" />
                <div className="absolute -left-16 -bottom-10 w-52 h-52 rounded-full bg-slate-500 blur-3xl group-hover:bg-slate-400 transition-colors" />
              </div>
              <ScaleIn delay={0.2} className="relative z-10 w-full h-full flex flex-col">
                <div className="bg-white/10 w-12 h-12 rounded-xl flex items-center justify-center mb-auto backdrop-blur-md">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-3 text-white">Permission Control</h3>
                  <p className="text-slate-100/80 text-sm leading-relaxed">No "Request Access" loops. Clients upload, you own the file instantly.</p>
                </div>
              </ScaleIn>
            </div>

            {/* Small Card 2 */}
            <div className="bg-white border border-border p-8 rounded-[2rem] flex flex-col items-start justify-between relative overflow-hidden group hover:border-emerald-500/30 transition-colors shadow-sm hover:shadow-lg">
              <ScaleIn delay={0.3} className="w-full h-full flex flex-col justify-between">
                <div className="bg-emerald-500/10 w-12 h-12 rounded-xl flex items-center justify-center mb-auto">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="mt-8">
                  <h3 className="text-xl font-bold mb-3 text-foreground">SOC2 Ready</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Enterprise-grade encryption for sensitive tax and legal documents.</p>
                </div>
              </ScaleIn>
            </div>

            {/* Medium Card */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2rem] flex flex-col md:flex-row gap-10 items-center hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
              <FadeIn delay={0.4} className="flex-1">
                <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground tracking-tight">Zero-Friction for Clients</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">Your clients don't need to create an account, download an app, or remember a password. They just drag, drop, and done.</p>
              </FadeIn>
              <div className="w-full md:w-2/5 flex justify-center">
                <ScaleIn delay={0.5} className="w-60 h-60 bg-white rounded-full shadow-2xl shadow-slate-100 flex items-center justify-center p-4">
                  {/* Kept Lottie but constrained size properly */}
                  <Lottie animationData={featureAnimation} loop={true} />
                </ScaleIn>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-32 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Built for modern client workflows</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              SecureUploadHub is designed for teams that handle sensitive, high-volume client files every day.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: FileText,
                color: "text-slate-900 bg-slate-50",
                title: "Accounting & Tax",
                desc: "Collect W‑2s, 1099s, receipts, and full tax packages without chasing attachments or dealing with broken portals.",
                note: "Popular with solo CPAs and multi-partner firms."
              },
              {
                icon: UploadCloud,
                color: "text-slate-900 bg-slate-50",
                title: "Agencies & Creatives",
                desc: "Receive 4K footage, design files, and large exports without drive permission issues or hard drive swaps.",
                note: "Ideal for video, photo, and brand studios."
              },
              {
                icon: ShieldCheck,
                color: "text-emerald-600 bg-emerald-50",
                title: "Legal & Compliance",
                desc: "Share and receive contracts, KYC documents, and evidence securely with full audit trails and access control.",
                note: "Perfect for law firms and specialists handling PII."
              },
              {
                icon: Zap,
                color: "text-amber-600 bg-amber-50",
                title: "Operations & CS",
                desc: "Give customers a single, self-serve place to submit documents so your team can focus on work—not reminders.",
                note: "Great for onboarding, claims, and account updates."
              }
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 0.1} className="h-full">
                <div className="bg-background border border-border rounded-3xl p-8 flex flex-col gap-4 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group h-full">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-2xl ${item.color} group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground tracking-tight">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed flex-grow">
                    {item.desc}
                  </p>
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground/80 font-medium">
                      {item.note}
                    </p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-32 bg-background relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-24">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">How it works</h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">Get started in under 2 minutes. No technical setup required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 lg:gap-16 relative">
            <div className="absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-border to-transparent hidden md:block" />

            {/* Step 1 */}
            <FadeIn delay={0.1}>
              <div className="relative text-center group">
                <div
                  className="bg-background relative z-10 w-24 h-24 rounded-3xl border border-border shadow-sm flex items-center justify-center mx-auto mb-8 cursor-pointer group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300"
                  onClick={() => setExpandedStep(expandedStep === 0 ? null : 0)}
                >
                  <div className="bg-primary/5 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <LinkIcon className="w-8 h-8 text-primary" />
                  </div>
                  {expandedStep === 0 && (
                    <div className="absolute inset-0 rounded-3xl bg-primary/20 -z-10" />
                  )}
                </div>
                <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">Step 1</span>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Create Your Portal</h3>
                <p className="text-muted-foreground leading-relaxed px-4">
                  Sign up and create a branded upload portal in seconds. Customize colors, add your logo, and set file requirements.
                </p>
              </div>
            </FadeIn>

            {/* Step 2 */}
            <FadeIn delay={0.2}>
              <div className="relative text-center group">
                <div
                  className="bg-background relative z-10 w-24 h-24 rounded-3xl border border-border shadow-sm flex items-center justify-center mx-auto mb-8 cursor-pointer group-hover:border-slate-900 group-hover:shadow-lg transition-all duration-300"
                  onClick={() => setExpandedStep(expandedStep === 1 ? null : 1)}
                >
                  <div className="bg-secondary w-16 h-16 rounded-2xl flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                    <Send className="w-8 h-8 text-foreground" />
                  </div>
                  {expandedStep === 1 && (
                    <div className="absolute inset-0 rounded-3xl bg-foreground/20 -z-10" />
                  )}
                </div>
                <span className="inline-block bg-muted text-muted-foreground text-xs font-bold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">Step 2</span>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Share the Link</h3>
                <p className="text-muted-foreground leading-relaxed px-4">
                  Send your unique portal link to clients via email, text, or embed it on your website. No account needed for them.
                </p>
              </div>
            </FadeIn>

            {/* Step 3 */}
            <FadeIn delay={0.3}>
              <div className="relative text-center group">
                <div
                  className="bg-background relative z-10 w-24 h-24 rounded-3xl border border-border shadow-sm flex items-center justify-center mx-auto mb-8 cursor-pointer group-hover:border-emerald-500 group-hover:shadow-lg group-hover:shadow-emerald-500/10 transition-all duration-300"
                  onClick={() => setExpandedStep(expandedStep === 2 ? null : 2)}
                >
                  <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <FolderSync className="w-8 h-8 text-emerald-600" />
                  </div>
                  {expandedStep === 2 && (
                    <div className="absolute inset-0 rounded-3xl bg-emerald-500/20 -z-10" />
                  )}
                </div>
                <span className="inline-block bg-emerald-500/10 text-emerald-600 text-xs font-bold px-3 py-1 rounded-full mb-6 tracking-wide uppercase">Step 3</span>
                <h3 className="text-2xl font-bold mb-4 text-foreground">Files Sync Automatically</h3>
                <p className="text-muted-foreground leading-relaxed px-4">
                  Uploaded files appear instantly in your Google Drive or Dropbox. Get email notifications for every upload.
                </p>
              </div>
            </FadeIn>
          </div>

          <div className="text-center mt-20">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/25 transition-all active:scale-95"
            >
              Try It Free — No Credit Card
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="py-32 bg-secondary/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-6">
                <Lock className="w-3 h-3" />
                Enterprise Grade
              </div>
              <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Security you can show your auditor</h2>
              <p className="text-xl text-muted-foreground leading-relaxed mb-10">
                SecureUploadHub is built from the ground up for privacy‑sensitive industries where compliance actually matters.
              </p>

              <div className="space-y-6">
                {[
                  { icon: Lock, title: "End-to-end Encryption", desc: "TLS 1.3 in transit and AES-256 at rest." },
                  { icon: FileText, title: "SOC 2-ready controls", desc: "Audit trails, access logging, and least-privilege design." },
                  { icon: Globe, title: "Data Residency", desc: "Choose US or EU regions to meet GDPR requirements." },
                  { icon: Clock, title: "99.9% Uptime", desc: "Redundant infrastructure with continuous backups." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="bg-white border border-border p-3 rounded-xl shadow-sm">
                      <item.icon className="w-6 h-6 text-foreground" />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </div>
                ))}
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

      {/* Integrations Section */}
      <section id="integrations" className="py-32 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Fits into your existing storage</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Keep using the tools your team already knows. SecureUploadHub simply becomes the front door for uploads.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 items-stretch">
            <div className="bg-white border border-border rounded-[2rem] p-8 flex flex-col items-start justify-between hover:border-primary/50 transition-colors shadow-sm hover:shadow-lg group">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">Available today</p>
                <h3 className="text-2xl font-bold text-foreground mb-3">Google Drive</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Route uploads directly into structured Drive folders by client, project, or date—no extra steps required.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-border w-full flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">Supports shared drives</span>
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                  <FolderSync className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-border rounded-[2rem] p-8 flex flex-col items-start justify-between hover:border-blue-500/50 transition-colors shadow-sm hover:shadow-lg group">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">Available today</p>
                <h3 className="text-2xl font-bold text-foreground mb-3">Dropbox</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Automatically organize incoming assets into your existing Dropbox structure for instant team access.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-border w-full flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-medium">Auto-organization included</span>
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-blue-500/10 group-hover:text-blue-600 transition-colors">
                  <UploadCloud className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="bg-foreground text-background rounded-[2rem] p-8 flex flex-col items-start justify-between relative overflow-hidden group">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary blur-3xl" />
                <div className="absolute -left-16 -bottom-10 w-52 h-52 rounded-full bg-slate-500 blur-3xl" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-300 mb-4">Coming soon</p>
                <h3 className="text-2xl font-bold text-white mb-3">More destinations</h3>
                <p className="text-slate-300 leading-relaxed">
                  OneDrive, S3 buckets, and direct webhooks are on our roadmap so you can plug uploads into any workflow.
                </p>
              </div>
              <div className="mt-8 pt-8 border-t border-white/10 w-full relative z-10">
                <p className="text-xs text-slate-200">
                  Need something specific? <a href="#" className="underline hover:text-white">Reach out</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-32 bg-background relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-slate-500/5 rounded-full blur-[100px] -z-10" />
        <div className="absolute bottom-0 right-0 translate-y-1/3 translate-x-1/3 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Loved by professionals</h2>
            <p className="text-xl text-muted-foreground max-w-xl mx-auto">See why thousands of businesses trust SecureUploadHub for their file collection.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white border border-border p-8 rounded-[2rem] hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col">
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg flex-grow">
                "SecureUploadHub has transformed how we collect documents from clients. What used to take days of back-and-forth emails now happens in minutes."
              </p>
              <div className="flex items-center gap-4 pt-6 border-t border-border/50">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 font-bold text-lg">
                  SM
                </div>
                <div>
                  <p className="font-bold text-foreground">Sarah Mitchell</p>
                  <p className="text-sm text-muted-foreground font-medium">CPA, Mitchell & Associates</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white border border-border p-8 rounded-[2rem] hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col relative">
              {/* Decoration */}
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Zap className="w-24 h-24 text-primary rotate-12" />
              </div>
              <div className="flex gap-1 mb-6 relative z-10">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg flex-grow relative z-10">
                "The branded portals make us look incredibly professional. Clients love how easy it is — no login required, just drag and drop."
              </p>
              <div className="flex items-center gap-4 pt-6 border-t border-border/50 relative z-10">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-900 font-bold text-lg">
                  JR
                </div>
                <div>
                  <p className="font-bold text-foreground">James Rodriguez</p>
                  <p className="text-sm text-muted-foreground font-medium">Creative Director, PixelCraft</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white border border-border p-8 rounded-[2rem] hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col">
              <div className="flex gap-1 mb-6">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-muted-foreground mb-8 leading-relaxed text-lg flex-grow">
                "Security was our top concern with client documents. The SOC2 compliance and encryption gives us peace of mind."
              </p>
              <div className="flex items-center gap-4 pt-6 border-t border-border/50">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg">
                  AL
                </div>
                <div>
                  <p className="font-bold text-foreground">Amanda Liu</p>
                  <p className="text-sm text-muted-foreground font-medium">Partner, Liu Legal Group</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-border/50">
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                <Counter end={10} suffix="K+" />
              </p>
              <p className="text-muted-foreground font-medium">Active Users</p>
            </div>
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                <Counter end={2} suffix="M+" />
              </p>
              <p className="text-muted-foreground font-medium">Files Transferred</p>
            </div>
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                <Counter end={99.9} suffix="%" decimals={1} />
              </p>
              <p className="text-muted-foreground font-medium">Uptime SLA</p>
            </div>
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                <Counter end={4.9} suffix="/5" decimals={1} />
              </p>
              <p className="text-muted-foreground font-medium">Customer Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Simple, transparent pricing</h2>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm ${!isAnnual ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>Monthly</span>
              <button
                onClick={handlePricingToggle}
                className="w-14 h-8 bg-zinc-200 rounded-full relative transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isAnnual ? 'translate-x-6 bg-primary' : ''}`} >
                  {isAnnual && <div className="w-full h-full rounded-full bg-primary" />}
                </div>
              </button>
              <span className={`text-sm ${isAnnual ? 'text-foreground font-bold' : 'text-muted-foreground'}`}>
                Yearly <span className="text-emerald-600 font-bold ml-1 text-xs uppercase tracking-wide bg-emerald-100 px-2 py-0.5 rounded-full">Save 20%</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <ScaleIn className="h-full">
              <div className="bg-background p-10 rounded-[2.5rem] border border-border flex flex-col hover:border-border/80 transition-all duration-300 h-full">
                <h3 className="text-xl font-bold mb-2 text-foreground">Individual</h3>
                <p className="text-sm text-muted-foreground mb-6">Perfect for getting started</p>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-foreground tracking-tight">$0</span>
                  <span className="text-muted-foreground font-medium">/mo</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-center gap-3 text-foreground/80 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> 1 Portal Link
                  </li>
                  <li className="flex items-center gap-3 text-foreground/80 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> 500MB Max File Size
                  </li>
                  <li className="flex items-center gap-3 text-foreground/80 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Google Drive Integration
                  </li>
                </ul>
                <Link href="/auth/signin" onClick={handleFreePlanClick} className="block w-full py-4 rounded-xl border-2 border-border font-bold hover:bg-muted transition-all text-center text-foreground hover:border-foreground/10">Get Started</Link>
              </div>
            </ScaleIn>

            {/* Pro Plan */}
            <ScaleIn delay={0.1} className="h-full">
              <div className="bg-foreground p-10 rounded-[2.5rem] border-2 border-foreground shadow-2xl flex flex-col relative overflow-hidden group h-full">
                <div className="absolute top-0 right-0 bg-primary text-white px-6 py-2 rounded-bl-3xl text-sm font-bold uppercase tracking-widest">
                  Most Popular
                </div>
                {/* Abstract shine */}
                <div className="absolute -top-[100px] -right-[100px] w-[300px] h-[300px] bg-primary/20 blur-[80px] rounded-full pointer-events-none" />

                <h3 className="text-xl font-bold mb-2 text-white relative z-10">Professional</h3>
                <p className="text-sm text-slate-400 mb-6 relative z-10">For serious professionals</p>
                <div className="mb-8 relative z-10">
                  <span className="text-5xl font-bold text-white tracking-tight">{isAnnual ? '$12' : '$15'}</span>
                  <span className="text-slate-400 font-medium">/mo</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1 relative z-10">
                  <li className="flex items-center gap-3 text-slate-200 text-sm font-medium">
                    <div className="bg-white/10 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div> Unlimited Portal Links
                  </li>
                  <li className="flex items-center gap-3 text-slate-200 text-sm font-medium">
                    <div className="bg-white/10 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div> 100GB Max File Size
                  </li>
                  <li className="flex items-center gap-3 text-slate-200 text-sm font-medium">
                    <div className="bg-white/10 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div> Custom Branding
                  </li>
                  <li className="flex items-center gap-3 text-slate-200 text-sm font-medium">
                    <div className="bg-white/10 p-1 rounded-full"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div> Password Protection
                  </li>
                </ul>
                <Link href="/auth/signin" className="relative z-10 block w-full py-4 rounded-xl bg-white text-foreground font-bold hover:bg-slate-50 transition-all shadow-lg hover:shadow-xl text-center hover:scale-[1.02] active:scale-[0.98]">
                  Start 14-Day Free Trial
                </Link>
              </div>
            </ScaleIn>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-32 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">Frequently asked questions</h2>
            <p className="text-muted-foreground">Everything you need to know.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "Do my clients need to create an account?",
                answer: "No! That's the beauty of SecureUploadHub. Your clients simply click your portal link and start uploading — no signup, no app download, no password to remember. It's completely frictionless."
              },
              {
                question: "What file types and sizes can be uploaded?",
                answer: "We support all file types. On the free plan, files can be up to 500MB each. Professional plan users can upload files up to 100GB, perfect for video files, large design assets, and complete project archives."
              },
              {
                question: "How secure are the file transfers?",
                answer: "Security is our top priority. All files are encrypted in transit using TLS 1.3 and at rest using AES-256 encryption. We're SOC2 Type II compliant and regularly undergo third-party security audits."
              },
              {
                question: "Which cloud storage services do you integrate with?",
                answer: "Currently we integrate with Google Drive and Dropbox. OneDrive and custom S3 bucket integrations are coming soon. Files sync automatically to your chosen destination folder."
              },
              {
                question: "Can I customize the portal with my branding?",
                answer: "Yes! Professional plan users can add their company logo, customize colors to match their brand, and even use a custom domain for a fully white-labeled experience."
              },
              {
                question: "What happens when someone uploads a file?",
                answer: "You'll receive an instant email notification with details about the upload. The file automatically syncs to your connected cloud storage, and you can view upload history in your dashboard."
              },
              {
                question: "Is there a limit on the number of uploads?",
                answer: "There's no limit on the number of uploads for any plan. Upload as many files as you need. Storage is only limited by your connected cloud storage provider's limits."
              },
              {
                question: "Can I try the Professional plan before committing?",
                answer: "Absolutely! We offer a 14-day free trial of the Professional plan with all features included. No credit card required to start."
              }
            ].map((faq, index) => (
              <div key={index} className="border border-border/50 rounded-2xl overflow-hidden bg-secondary/10 hover:bg-secondary/30 transition-colors duration-300">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-semibold text-foreground pr-4 text-base md:text-lg">{faq.question}</span>
                  <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50 transition-transform duration-300 ${openFaq === index ? 'rotate-180 bg-primary text-white border-primary' : 'text-muted-foreground'}`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>
                <div
                  className={`grid transition-all duration-300 ease-in-out ${openFaq === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <a
              href="#"
              className="inline-flex items-center gap-2 text-primary font-bold hover:underline underline-offset-4 transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              Contact our support team
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-foreground rounded-[3rem] relative overflow-hidden py-20 px-8 text-center group">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary rounded-full blur-[150px] group-hover:bg-slate-800 transition-colors duration-700" />
              <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500 rounded-full blur-[150px] group-hover:bg-emerald-400 transition-colors duration-700" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
              <h2 className="text-4xl lg:text-6xl font-bold text-white mb-8 tracking-tight">
                Ready to stop chasing files?
              </h2>
              <p className="text-xl text-slate-200 mb-12 max-w-2xl mx-auto font-medium">
                Join thousands of professionals who have simplified their file collection. Set up your first portal in under 2 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link
                  href="/auth/signin"
                  className="w-full sm:w-auto bg-white text-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] flex items-center justify-center gap-2 group/btn"
                >
                  Start Free Today
                  <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#pricing"
                  className="w-full sm:w-auto border-2 border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 hover:border-white/40 transition-all text-center"
                >
                  View Pricing
                </a>
              </div>
              <p className="text-slate-300/80 text-sm mt-10 font-medium tracking-wide uppercase">
                Free forever plan &nbsp;•&nbsp; No credit card required &nbsp;•&nbsp; Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border pt-20 pb-10">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
            {/* Brand Column */}
            <div className="col-span-2 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-foreground p-2 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">SecureUploadHub</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-xs mb-8">
                Secure file sharing for professionals. Fast, simple, and remarkably reliable.
              </p>
              <div className="flex gap-4">
                {/* Social placeholders could go here */}
              </div>
            </div>

            {/* Links Column */}
            <div>
              <h4 className="font-bold mb-6 text-foreground">Product</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-primary transition-colors">How it works</a></li>
                <li><a href="#pricing" className="hover:text-primary transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-primary transition-colors">FAQ</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6 text-foreground">Company</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-primary transition-colors">About</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contact</a></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-bold mb-6 text-foreground">Legal</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="/cookie-policy" className="hover:text-primary transition-colors">Cookie Policy</a></li>
                <li><a href="/gdpr" className="hover:text-primary transition-colors">GDPR</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} SecureUploadHub Inc. All rights reserved.</p>
            <div className="flex gap-8">
              <span>Made with ❤️ for professionals</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}