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
import Image from 'next/image';

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
                <span className="font-medium">Designers</span>
                <span className="text-2xl text-muted-foreground/50">&bull;</span>
                <span className="font-medium">Agencies</span>
                <span className="text-2xl text-muted-foreground/50">&bull;</span>
                <span className="font-medium">Accountants</span>
                <span className="text-2xl text-muted-foreground/50">&bull;</span>
                <span className="font-medium">Legal teams</span>
                <span className="text-2xl text-muted-foreground/50">&bull;</span>
                <span className="font-medium">Consultants</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Used worldwide to collect files safely and professionally.</p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Problem Section – “Why file transfer is broken” */}
      <section id="features" className="py-24 bg-secondary/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[100px] -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Why traditional file transfer doesn’t work anymore</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Email attachments, generic cloud links, and chat apps weren’t built for professional client workflows. They create friction, risk, and wasted time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(200px,auto)]">
            {/* Large Card */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2rem] hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300 group">
              <FadeIn delay={0.1} className="h-full">
                <div className="bg-red-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-red-500/20 transition-colors">
                  <MailWarning className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground tracking-tight">No more "file too large" emails</h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
                  Clients can upload large files without compression, split archives, or failed sends.
                </p>
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
                  <h3 className="text-xl font-bold mb-3 text-white">Lost links & missing context</h3>
                  <p className="text-slate-100/80 text-sm leading-relaxed">Files arrive without structure, labels, or client details.</p>
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
                  <h3 className="text-xl font-bold mb-3 text-foreground">Security & compliance risks</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">Personal links and shared folders expose sensitive data.</p>
                </div>
              </ScaleIn>
            </div>

            {/* Medium Card */}
            <div className="md:col-span-2 glass-panel p-10 rounded-[2rem] flex flex-col md:flex-row gap-10 items-center hover:shadow-2xl hover:shadow-primary/5 transition-all duration-300">
              <FadeIn delay={0.4} className="flex-1">
                <div className="bg-primary/10 w-14 h-14 rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-3xl font-bold mb-4 text-foreground tracking-tight">Chasing clients wastes time</h3>
                <p className="text-lg text-muted-foreground leading-relaxed">Manual follow-ups slow projects and frustrate everyone.</p>
              </FadeIn>
              <div className="w-full md:w-2/5 flex justify-center">
                <ScaleIn delay={0.5} className="w-60 h-60 bg-white rounded-full shadow-2xl shadow-slate-100 flex items-center justify-center p-4">
                  <Lottie animationData={featureAnimation} loop={true} />
                </ScaleIn>
              </div>
            </div>
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
                  <div className="bg-background border border-border rounded-3xl p-8 flex flex-col gap-4 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group h-full">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 text-primary group-hover:scale-110 transition-transform">
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
                <a href="#" className="text-primary font-bold hover:underline">
                  View security details <ArrowRight className="inline w-4 h-4" />
                </a>
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

          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-75">
            <div className="text-center">
              <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-lg">Google Drive</p>
            </div>
            <div className="text-center">
              <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-lg">Dropbox</p>
            </div>
            <div className="text-center">
              <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-lg">Amazon S3</p>
            </div>
            <div className="text-center">
              <UploadCloud className="w-12 h-12 mx-auto text-slate-400 mb-2" />
              <p className="font-bold text-lg">Custom storage (API-based)</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials & Metrics Section */}
      <section id="testimonials" className="py-32 bg-background relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Loved by professionals</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white border border-border p-8 rounded-[2rem]">
              <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                “We stopped chasing files and started focusing on real work.”
              </p>
              <p className="font-bold text-foreground">— Agency Owner</p>
            </div>
            <div className="bg-white border border-border p-8 rounded-[2rem]">
              <p className="text-muted-foreground mb-6 leading-relaxed text-lg">
                “Clients upload files without confusion. It just works.”
              </p>
              <p className="font-bold text-foreground">— Consultant</p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                <Counter end={10} suffix="K+" />
              </p>
              <p className="text-muted-foreground font-medium">professionals</p>
            </div>
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                <Counter end={2} suffix="M+" />
              </p>
              <p className="text-muted-foreground font-medium">files uploaded</p>
            </div>
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                <Counter end={99.9} suffix="%" decimals={1} />
              </p>
              <p className="text-muted-foreground font-medium">uptime</p>
            </div>
            <div className="p-4">
              <p className="text-4xl lg:text-5xl font-bold text-primary mb-2">
                <Counter end={4.9} suffix="/5" decimals={1} />
              </p>
              <p className="text-muted-foreground font-medium">average rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (SEO + transparency) */}
      <section id="pricing" className="py-32 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight">Simple, transparent pricing</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <ScaleIn className="h-full">
              <div className="bg-background p-10 rounded-[2.5rem] border border-border flex flex-col h-full hover:scale-105 transition-transform">
                <h3 className="text-xl font-bold mb-2 text-foreground">Free</h3>
                <div className="mb-8">
                  <span className="text-5xl font-bold text-foreground tracking-tight">$0</span>
                </div>
                <ul className="space-y-4 mb-10 flex-1">
                  <li className="flex items-center gap-3 text-foreground/80 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> 1 portal
                  </li>
                  <li className="flex items-center gap-3 text-foreground/80 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Basic uploads
                  </li>
                  <li className="flex items-center gap-3 text-foreground/80 text-sm font-medium">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Secure hosting
                  </li>
                </ul>
                <Link href="/auth/signin" onClick={handleFreePlanClick} className="block w-full py-4 rounded-xl border-2 border-border font-bold hover:bg-muted transition-all text-center text-foreground">Get started free</Link>
              </div>
            </ScaleIn>

            {/* Pro Plan */}
            <ScaleIn delay={0.1} className="h-full">
              <div className="bg-foreground p-10 rounded-[2.5rem] border-2 border-foreground shadow-2xl flex flex-col relative h-full hover:scale-105 transition-transform">
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
                <Link href="/auth/signin" className="relative z-10 block w-full py-4 rounded-xl bg-white text-foreground font-bold hover:bg-slate-50 transition-all shadow-lg text-center">
                  Upgrade to Pro
                </Link>
              </div>
            </ScaleIn>
          </div>
        </div>
      </section>

      {/* FAQ Section (SEO gold) */}
      <section id="faq" className="py-32 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">Frequently asked questions</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                question: "Do clients need an account?",
                answer: "No. Clients upload files without signing up."
              },
              {
                question: "How large can files be?",
                answer: "Large files are supported without email limits."
              },
              {
                question: "Is it secure?",
                answer: "Yes. All uploads are encrypted and access-controlled."
              },
              {
                question: "Where are files stored?",
                answer: "Files sync directly to your connected storage."
              },
              {
                question: "Can I brand the upload page?",
                answer: "Yes. Logos, colors, and instructions are customizable."
              }
            ].map((faq, index) => (
              <div key={index} className="border border-border/50 rounded-2xl overflow-hidden bg-secondary/10">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-semibold text-foreground pr-4 text-base md:text-lg">{faq.question}</span>
                  <div className={`w-8 h-8 rounded-full bg-background flex items-center justify-center border border-border/50 transition-transform duration-300 ${openFaq === index ? 'rotate-180' : ''}`}>
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
        </div>
      </section>

      {/* Final CTA (Conversion) */}
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
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link
                  href="/auth/signin"
                  className="w-full sm:w-auto bg-white text-foreground px-8 py-4 rounded-xl font-bold text-lg hover:bg-slate-50 transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  Create your free portal
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <button
                  onClick={handleDemoVideoClick}
                  className="w-full sm:w-auto border-2 border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10"
                >
                  View demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t border-border pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-12 mb-16">
            <div className="col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-foreground p-2 rounded-xl">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">SecureUploadHub</span>
              </div>
              <p className="text-muted-foreground leading-relaxed max-w-xs mb-8">
                Secure client file uploads for professionals, agencies, and teams worldwide.
              </p>
            </div>
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
              <h4 className="font-bold mb-6 text-foreground">Legal</h4>
              <ul className="space-y-4 text-sm text-muted-foreground">
                <li><a href="/privacy" className="hover:text-primary transition-colors">Privacy</a></li>
                <li><a href="/terms" className="hover:text-primary transition-colors">Terms</a></li>
                <li><a href="/security" className="hover:text-primary transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} SecureUploadHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}