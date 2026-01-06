import type { Metadata } from "next";
import Link from "next/link";
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Briefcase,
  Lock,
  FolderSync,
  TrendingUp
} from "lucide-react";

export const metadata: Metadata = {
  title: "Professional File Sharing for Consultants | SecureUploadHub",
  description: "Secure client document collection for consultants and advisory firms. Collect project files, reports, and sensitive business documents with professional branding.",
  keywords: "consultant file collection, consulting portal, business consultant file sharing, advisory firm portal, professional document collection, consultant client portal",
  alternates: {
    canonical: "https://secureuploadhub.com/for-consultants",
  },
  openGraph: {
    title: "Professional File Sharing for Consultants",
    description: "Secure client document collection for consultants and advisory firms. Collect project files, reports, and sensitive business documents with professional branding.",
    type: "website",
    url: "https://secureuploadhub.com/for-consultants",
  },
};

export default function ConsultantsPage() {
  const useCases = [
    "Client data and analytics collection",
    "Project documentation uploads",
    "Financial report submissions", 
    "Strategic planning document gathering",
    "Due diligence file collection",
    "Confidential business information"
  ];

  const benefits = [
    {
      icon: <Briefcase className="w-6 h-6" />,
      title: "Professional Branding",
      description: "Present a polished, professional image to enterprise clients"
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "Bank-grade encryption for sensitive business documents"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Faster Engagements",
      description: "Collect all necessary files upfront to accelerate project delivery"
    },
    {
      icon: <FolderSync className="w-6 h-6" />,
      title: "Organized Workflow",
      description: "Automatically organize files by client and engagement"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-xl font-bold text-slate-900">
              SecureUploadHub
            </Link>
            <Link 
              href="/auth/signin"
              className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium hover:bg-slate-800 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-indigo-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Briefcase className="w-8 h-8 text-indigo-600" />
                <span className="text-indigo-600 font-semibold">For Consultants & Advisory Firms</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Professional File Sharing for <span className="text-indigo-600">Consultants</span>
              </h1>
              
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Elevate your consulting practice with professional, branded file collection portals. Securely gather client data, project documents, and sensitive business information while maintaining your professional image.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/auth/signin"
                  className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  href="/"
                  className="border border-slate-300 text-slate-700 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-slate-50 transition-colors text-center"
                >
                  View Demo
                </Link>
              </div>

              <div className="flex items-center gap-6 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Enterprise Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-green-600" />
                  <span>Professional Branding</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Confidential & Secure</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Strategic Advisory Group</h3>
                    <p className="text-sm text-slate-500">Client Data Collection</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Financial_Analysis_Q4.xlsx</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Market_Research_Data.pdf</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span className="text-sm font-medium text-indigo-800">Strategic_Plan_Draft.docx</span>
                    <div className="ml-auto text-xs text-indigo-600">Uploading... 84%</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-700">Engagement: Digital Transformation</span>
                    <span className="text-xs text-slate-500">3 of 8 deliverables</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Consulting Engagement Use Cases</h2>
            <p className="text-lg text-slate-600">Streamline document collection for every type of consulting project</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((useCase, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span className="font-medium text-slate-900">{useCase}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Consultants Choose SecureUploadHub</h2>
            <p className="text-lg text-slate-600">Built for the professional standards of consulting practices</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-slate-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Enterprise-Grade Features for Professional Consultants</h2>
              <p className="text-lg text-slate-300 mb-8">
                Handle sensitive business information with the security and professionalism your enterprise clients expect. Our platform meets the highest standards for consulting practices.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                  <span>Bank-grade encryption for confidential data</span>
                </div>
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-green-400" />
                  <span>Professional branding and white-label options</span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-400" />
                  <span>Complete audit trails for compliance</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-green-400" />
                  <span>Team collaboration and access controls</span>
                </div>
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <span>Analytics and engagement tracking</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <h3 className="text-xl font-semibold mb-4">Professional Features</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">Custom Branding</span>
                  <span className="text-green-400 font-semibold">Full Control</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">White Label</span>
                  <span className="text-green-400 font-semibold">Available</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">Team Access</span>
                  <span className="text-green-400 font-semibold">Unlimited</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">Client Portals</span>
                  <span className="text-green-400 font-semibold">Unlimited</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Enterprise Support</span>
                  <span className="text-green-400 font-semibold">Priority</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Client Types */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Trusted by Consultants Across Industries</h2>
          <p className="text-lg text-slate-600 mb-12">From strategy to implementation, handle any consulting engagement</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { title: "Strategy Consulting", description: "Market analysis, strategic planning" },
              { title: "Management Consulting", description: "Operations, process improvement" },
              { title: "Financial Advisory", description: "M&A, financial planning" },
              { title: "Technology Consulting", description: "Digital transformation, IT strategy" }
            ].map((industry, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Briefcase className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{industry.title}</h3>
                <p className="text-sm text-slate-600">{industry.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Elevate Your Consulting Practice?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join professional consultants worldwide who trust SecureUploadHub for secure, branded client interactions.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="bg-white text-indigo-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/"
              className="border border-indigo-400 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-colors text-center"
            >
              Schedule Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <Link href="/" className="text-xl font-bold">SecureUploadHub</Link>
              <p className="text-slate-400 mt-1">Professional file collection platform</p>
            </div>
            <div className="flex gap-6 text-sm">
              <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">Terms</Link>
              <Link href="/security" className="text-slate-400 hover:text-white transition-colors">Security</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}