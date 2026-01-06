import type { Metadata } from "next";
import Link from "next/link";
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Calculator,
  Lock,
  FolderSync
} from "lucide-react";

export const metadata: Metadata = {
  title: "Secure Client Document Collection for Accountants | SecureUploadHub",
  description: "Professional file upload portal designed for accountants. Collect tax documents, financial statements, and sensitive client files securely. GDPR compliant with audit trails.",
  keywords: "accountant file collection, tax document upload, secure accounting portal, client document collection, CPA file sharing, accounting firm portal, tax preparation files",
  alternates: {
    canonical: "https://secureuploadhub.com/for-accountants",
  },
  openGraph: {
    title: "Secure Client Document Collection for Accountants",
    description: "Professional file upload portal designed for accountants. Collect tax documents, financial statements, and sensitive client files securely.",
    type: "website",
    url: "https://secureuploadhub.com/for-accountants",
  },
};

export default function AccountantsPage() {
  const useCases = [
    "Tax document collection (W-2s, 1099s, receipts)",
    "Financial statement uploads",
    "Bank statement collection", 
    "Receipt and expense documentation",
    "Audit documentation gathering",
    "Payroll document collection"
  ];

  const benefits = [
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "Bank-Level Security",
      description: "AES-256 encryption ensures client financial data stays protected"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Audit Trail",
      description: "Complete logging of who uploaded what and when for compliance"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Save 10+ Hours Weekly",
      description: "Stop chasing clients for missing documents during tax season"
    },
    {
      icon: <FolderSync className="w-6 h-6" />,
      title: "Auto-Organization",
      description: "Files automatically sorted by client and document type"
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
      <section className="pt-20 pb-16 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Calculator className="w-8 h-8 text-blue-600" />
                <span className="text-blue-600 font-semibold">For Accountants & CPAs</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Secure Client Document Collection for <span className="text-blue-600">Accountants</span>
              </h1>
              
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Stop chasing clients for tax documents. Create a professional, branded portal where clients can securely upload W-2s, receipts, and financial statements directly to your practice.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/auth/signin"
                  className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
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
                  <span>GDPR Compliant</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-green-600" />
                  <span>SOC 2 Type II</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Bank-Grade Security</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calculator className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Smith & Associates CPA</h3>
                    <p className="text-sm text-slate-500">Tax Document Portal</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">W-2_Johnson_2023.pdf</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">1099_Freelance_2023.pdf</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Receipts_Q4_2023.zip</span>
                    <div className="ml-auto text-xs text-blue-600">Uploading... 78%</div>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Common Accounting Use Cases</h2>
            <p className="text-lg text-slate-600">Streamline document collection for every aspect of your practice</p>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Accountants Choose SecureUploadHub</h2>
            <p className="text-lg text-slate-600">Built specifically for the needs of accounting professionals</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-600">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-slate-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Security & Compliance for Financial Data</h2>
              <p className="text-lg text-slate-300 mb-8">
                Handle sensitive financial documents with confidence. Our platform meets the highest security standards required for accounting practices.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                  <span>AES-256 encryption for all file transfers</span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-400" />
                  <span>Complete audit trails for compliance</span>
                </div>
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-green-400" />
                  <span>GDPR and SOC 2 Type II compliant</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-green-400" />
                  <span>Role-based access controls</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <h3 className="text-xl font-semibold mb-4">Compliance Features</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">Data Encryption</span>
                  <span className="text-green-400 font-semibold">AES-256</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">Audit Logging</span>
                  <span className="text-green-400 font-semibold">Complete</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">Data Residency</span>
                  <span className="text-green-400 font-semibold">Configurable</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Retention Policies</span>
                  <span className="text-green-400 font-semibold">Customizable</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Streamline Your Document Collection?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of accounting professionals who trust SecureUploadHub for secure client file collection.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/"
              className="border border-blue-400 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-blue-700 transition-colors text-center"
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