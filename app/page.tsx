"use client";

import React, { useState } from 'react';
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
  X
} from 'lucide-react';

export default function LandingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-700 font-sans">

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
              <a href="#security" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Security</a>
              <a href="#pricing" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Pricing</a>
              <button className="bg-slate-900 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95">
                Get Started Free
              </button>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
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
            <button className="w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2 group">
              Create Your Portal Link
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button className="w-full sm:w-auto bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all">
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
            <div className="md:col-span-2 bg-slate-50 border border-slate-100 p-8 rounded-3xl hover:shadow-md transition-shadow">
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
              <div className="w-full md:w-1/3 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="h-2 w-3/4 bg-slate-100 rounded mb-2"></div>
                <div className="h-8 w-full bg-indigo-50 rounded mb-2 flex items-center px-2">
                  <div className="h-2 w-1/2 bg-indigo-200 rounded"></div>
                </div>
                <div className="h-8 w-full bg-indigo-600 rounded flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">UPLOAD COMPLETE</span>
                </div>
              </div>
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
                onClick={() => setIsAnnual(!isAnnual)}
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
              <button className="w-full py-3 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 transition-all">Get Started</button>
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
              <button className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">Start 14-Day Free Trial</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 text-white mb-6">
                <ShieldCheck className="w-6 h-6 text-indigo-400" />
                <span className="text-xl font-bold tracking-tight">SecureUploadHub</span>
              </div>
              <p className="max-w-sm mb-6">
                Building the bridge between professional services and their clients. Secure, fast, and remarkably simple file collection.
              </p>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-xs flex justify-between items-center">
            <p>© 2024 SecureUploadHub Inc. All rights reserved.</p>
            <div className="flex gap-4">
              <Globe className="w-4 h-4" />
              <span>English (US)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}