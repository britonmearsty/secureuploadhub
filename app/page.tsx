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
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-700 font-sans">
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
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-white/70 border-b border-slate-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900">SecureUploadHub</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">How It Works</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Pricing</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">FAQ</a>
              <Link href="/auth/signin" className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95">
                Get Started Free
              </Link>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} aria-label="Toggle menu">
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden border-t border-slate-200 py-4">
              <div className="flex flex-col gap-4">
                <a href="#features" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors px-4 py-2">Features</a>
                <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors px-4 py-2">How It Works</a>
                <a href="#pricing" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors px-4 py-2">Pricing</a>
                <a href="#faq" onClick={() => setIsMenuOpen(false)} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors px-4 py-2">FAQ</a>
                <div className="px-4 pt-2">
                  <Link href="/auth/signin" className="block w-full bg-slate-900 text-white px-5 py-3 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all text-center">
                    Get Started Free
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-100/50 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-100/50 blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full text-indigo-700 text-xs font-bold tracking-wide uppercase mb-6 animate-fade-in">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Now supporting 100GB+ Transfers
          </div>

          <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-8 max-w-4xl mx-auto leading-[1.1]">
            The professional way to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">collect client files.</span>
          </h1>

          <p className="text-lg lg:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop chasing email attachments. Give your clients a secure, branded upload portal that pipes files directly into your Google Drive or Dropbox.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/auth/signin"
              onClick={handleCtaClick}
              className="w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 group"
            >
              Create Your Portal Link
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={handleDemoVideoClick}
              className="w-auto bg-white border border-slate-200 text-slate-700 px-6 py-3 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all"
            >
              Watch 1-min Demo
            </button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest">Trusted by industry leaders</p>
            <div className="flex flex-wrap justify-center gap-8 opacity-50 grayscale">
              <span className="text-xl font-bold">TAXPRO</span>
              <span className="text-xl font-bold">CREATIVE-CO</span>
              <span className="text-xl font-bold">LEGAL-LY</span>
              <span className="text-xl font-bold">STREAMLINE</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Grid Feature Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Why file transfer is broken</h2>
            <p className="text-slate-600 max-w-xl mx-auto">Standard tools weren't built for client workflows. SecureUploadHub was.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Card */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-100 p-8 rounded-3xl">
              <div className="bg-red-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                <MailWarning className="text-red-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">No more "File too large" emails</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Gmail's 25MB limit is the enemy of productivity. We handle files up to 100GB without breaking a sweat, ensuring you get the high-res content you actually need.
              </p>
              <div className="flex gap-2">
                <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-semibold text-slate-500 italic">"Sent 5 emails for 1 project" — Never again.</span>
              </div>
            </div>

            {/* Small Card 1 */}
            <div className="bg-indigo-600 p-8 rounded-3xl text-white flex flex-col justify-between">
              <Lock className="w-10 h-10 opacity-80" />
              <div>
                <h3 className="text-xl font-bold mb-2">Permission Control</h3>
                <p className="text-indigo-100 text-sm">No "Request Access" loops. Clients upload, you own the file instantly.</p>
              </div>
            </div>

            {/* Small Card 2 */}
            <div className="bg-slate-900 p-8 rounded-3xl text-white flex flex-col justify-between">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
              <div>
                <h3 className="text-xl font-bold mb-2">SOC2 Ready</h3>
                <p className="text-slate-400 text-sm">Enterprise-grade encryption for sensitive tax and legal documents.</p>
              </div>
            </div>

            {/* Medium Card */}
            <div className="md:col-span-2 bg-slate-50 border border-slate-100 p-8 rounded-3xl flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1">
                <div className="bg-blue-100 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
                  <Zap className="text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Zero-Friction for Clients</h3>
                <p className="text-slate-600">Your clients don't need to create an account, download an app, or remember a password. They just drag, drop, and done.</p>
              </div>
              <div className="w-full md:w-2/5 flex justify-center">
                <div className="w-72 h-72">
                  <Lottie animationData={featureAnimation} loop={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">How it works</h2>
            <p className="text-slate-600 max-w-xl mx-auto">Get started in under 2 minutes. No technical setup required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="relative text-center">
              <div 
                className="bg-indigo-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 cursor-pointer hover:bg-indigo-200 transition-all hover:scale-110 relative"
                onClick={() => setExpandedStep(expandedStep === 0 ? null : 0)}
              >
                <LinkIcon className="w-8 h-8 text-indigo-600" />
                {expandedStep === 0 && (
                  <>
                    <div className="absolute left-1/2 -top-16 transform -translate-x-1/2 animate-ping z-10">
                      <div className="bg-indigo-100 w-10 h-10 rounded-xl flex items-center justify-center opacity-75">
                        <Palette className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                    <div className="absolute -right-6 -top-6 animate-bounce z-10" style={{ animation: 'bounce 2s infinite 0.1s' }}>
                      <div className="bg-indigo-100 w-10 h-10 rounded-xl flex items-center justify-center">
                        <Palette className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                    <div className="absolute -left-6 -top-6 animate-bounce z-10" style={{ animation: 'bounce 2s infinite 0.2s' }}>
                      <div className="bg-indigo-100 w-10 h-10 rounded-xl flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="absolute top-8 left-[60%] w-[80%] h-0.5 bg-indigo-200 hidden md:block" />
              <span className="inline-block bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-4">Step 1</span>
              <h3 className="text-xl font-bold mb-3">Create Your Portal</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Sign up and create a branded upload portal in seconds. Customize colors, add your logo, and set file requirements.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative text-center">
              <div 
                className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 cursor-pointer hover:bg-blue-200 transition-all hover:scale-110 relative"
                onClick={() => setExpandedStep(expandedStep === 1 ? null : 1)}
              >
                <Send className="w-8 h-8 text-blue-600" />
                {expandedStep === 1 && (
                  <>
                    <div className="absolute left-1/2 -top-16 transform -translate-x-1/2 animate-ping z-10">
                      <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center opacity-75">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="absolute -right-6 -top-6 animate-bounce z-10" style={{ animation: 'bounce 2s infinite 0.1s' }}>
                      <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center">
                        <Mail className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                    <div className="absolute -left-6 -top-6 animate-bounce z-10" style={{ animation: 'bounce 2s infinite 0.2s' }}>
                      <div className="bg-blue-100 w-10 h-10 rounded-xl flex items-center justify-center">
                        <Globe className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="absolute top-8 left-[60%] w-[80%] h-0.5 bg-indigo-200 hidden md:block" />
              <span className="inline-block bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-4">Step 2</span>
              <h3 className="text-xl font-bold mb-3">Share the Link</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Send your unique portal link to clients via email, text, or embed it on your website. No account needed for them.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative text-center">
              <div 
                className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 cursor-pointer hover:bg-emerald-200 transition-all hover:scale-110 relative"
                onClick={() => setExpandedStep(expandedStep === 2 ? null : 2)}
              >
                <FolderSync className="w-8 h-8 text-emerald-600" />
                {expandedStep === 2 && (
                  <>
                    <div className="absolute left-1/2 -top-16 transform -translate-x-1/2 animate-ping z-10">
                      <div className="bg-emerald-100 w-10 h-10 rounded-xl flex items-center justify-center opacity-75">
                        <Bell className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                    <div className="absolute -right-6 -top-6 animate-bounce z-10" style={{ animation: 'bounce 2s infinite 0.1s' }}>
                      <div className="bg-emerald-100 w-10 h-10 rounded-xl flex items-center justify-center">
                        <Bell className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                    <div className="absolute -left-6 -top-6 animate-bounce z-10" style={{ animation: 'bounce 2s infinite 0.2s' }}>
                      <div className="bg-emerald-100 w-10 h-10 rounded-xl flex items-center justify-center">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <span className="inline-block bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full mb-4">Step 3</span>
              <h3 className="text-xl font-bold mb-3">Files Sync Automatically</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Uploaded files appear instantly in your Google Drive or Dropbox. Get email notifications for every upload.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all"
            >
              Try It Free — No Credit Card
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Loved by professionals</h2>
            <p className="text-slate-600 max-w-xl mx-auto">See why thousands of businesses trust SecureUploadHub for their file collection.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 leading-relaxed">
                {/* PLACEHOLDER: Replace with real testimonial */}
                "SecureUploadHub has transformed how we collect documents from clients. What used to take days of back-and-forth emails now happens in minutes."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
                  {/* PLACEHOLDER: Replace with actual avatar */}
                  SM
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{/* PLACEHOLDER */}Sarah Mitchell</p>
                  <p className="text-sm text-slate-500">{/* PLACEHOLDER */}CPA, Mitchell & Associates</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 leading-relaxed">
                {/* PLACEHOLDER: Replace with real testimonial */}
                "The branded portals make us look incredibly professional. Clients love how easy it is — no login required, just drag and drop."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  {/* PLACEHOLDER: Replace with actual avatar */}
                  JR
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{/* PLACEHOLDER */}James Rodriguez</p>
                  <p className="text-sm text-slate-500">{/* PLACEHOLDER */}Creative Director, PixelCraft Studio</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-slate-700 mb-6 leading-relaxed">
                {/* PLACEHOLDER: Replace with real testimonial */}
                "Security was our top concern with client documents. The SOC2 compliance and encryption gives us peace of mind."
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                  {/* PLACEHOLDER: Replace with actual avatar */}
                  AL
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{/* PLACEHOLDER */}Amanda Liu</p>
                  <p className="text-sm text-slate-500">{/* PLACEHOLDER */}Partner, Liu Legal Group</p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-indigo-600">{/* PLACEHOLDER */}10K+</p>
              <p className="text-slate-600 text-sm mt-1">Active Users</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-indigo-600">{/* PLACEHOLDER */}2M+</p>
              <p className="text-slate-600 text-sm mt-1">Files Transferred</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-indigo-600">{/* PLACEHOLDER */}99.9%</p>
              <p className="text-slate-600 text-sm mt-1">Uptime SLA</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-indigo-600">{/* PLACEHOLDER */}4.9/5</p>
              <p className="text-slate-600 text-sm mt-1">Customer Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold mb-6">Simple, transparent pricing</h2>

            {/* Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm ${!isAnnual ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>Monthly</span>
              <button
                onClick={handlePricingToggle}
                className="w-12 h-6 bg-slate-200 rounded-full relative transition-colors duration-200"
              >
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${isAnnual ? 'translate-x-6 !bg-indigo-600' : ''}`} />
              </button>
              <span className={`text-sm ${isAnnual ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                Yearly <span className="text-emerald-600 font-bold ml-1">(-20%)</span>
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
              <h3 className="text-lg font-bold mb-2">Individual</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> 1 Portal Link
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> 500MB Max File Size
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Google Drive Integration
                </li>
              </ul>
              <Link href="/auth/signin" onClick={handleFreePlanClick} className="block w-full py-3 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 transition-all text-center">Get Started</Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white p-8 rounded-3xl border-2 border-indigo-600 shadow-xl shadow-indigo-100 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1 rounded-bl-xl text-xs font-bold uppercase tracking-widest">
                Most Popular
              </div>
              <h3 className="text-lg font-bold mb-2">Professional</h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{isAnnual ? '$12' : '$15'}</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Unlimited Portal Links
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500" /> 100GB Max File Size
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Custom Branding (Logo & Colors)
                </li>
                <li className="flex items-center gap-3 text-slate-600 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-indigo-500" /> Password Protected Portals
                </li>
              </ul>
              <Link href="/auth/signin" className="block w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 text-center">Start 14-Day Free Trial</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <p className="text-slate-600">Everything you need to know about SecureUploadHub.</p>
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
              <div key={index} className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900 pr-4">{faq.question}</span>
                  <ChevronDown 
                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                      openFaq === index ? 'rotate-180' : ''
                    }`} 
                  />
                </button>
                <div 
                  className={`grid transition-all duration-300 ease-in-out ${
                    openFaq === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-6 text-slate-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-600 mb-4">Still have questions?</p>
            <a
              href="#"
              className="inline-flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Contact our support team
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-3xl relative overflow-hidden py-16 sm:py-24 px-4 sm:px-8 text-center">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
              <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
                Ready to stop chasing files?
              </h2>
              <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
                Join thousands of professionals who have simplified their file collection. Set up your first portal in under 2 minutes.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/auth/signin"
                  className="w-auto bg-white text-indigo-600 px-6 py-3 rounded-2xl font-bold text-lg hover:bg-indigo-50 transition-all shadow-xl flex items-center justify-center gap-2 group"
                >
                  Start Free Today
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <a
                  href="#pricing"
                  className="w-auto border-2 border-white/30 text-white px-6 py-3 rounded-2xl font-bold text-lg hover:bg-white/10 transition-all text-center"
                >
                  View Pricing
                </a>
              </div>
              <p className="text-indigo-200 text-sm mt-8">
                ✓ Free forever plan available &nbsp;&nbsp; ✓ No credit card required &nbsp;&nbsp; ✓ Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400">
        {/* Main Footer Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Column */}
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 text-white mb-4">
                <ShieldCheck className="w-8 h-8 text-indigo-500" />
                <span className="text-xl font-bold tracking-tight">SecureUploadHub</span>
              </div>
              <p className="text-sm leading-relaxed max-w-xs text-slate-400">
                Secure file sharing for professionals. Fast, simple, and remarkably reliable.
              </p>
            </div>

            {/* Links Column */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="text-white font-bold mb-4 text-sm">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="/cookie-policy" className="hover:text-white transition-colors">Cookie Policy</a></li>
                <li><a href="/gdpr" className="hover:text-white transition-colors">GDPR</a></li>
                <li><a href="/security" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
            <p>© {new Date().getFullYear()} SecureUploadHub Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}