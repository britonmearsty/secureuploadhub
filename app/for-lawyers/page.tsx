import type { Metadata } from "next";
import Link from "next/link";
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Scale,
  Lock,
  FolderSync,
  AlertTriangle
} from "lucide-react";

export const metadata: Metadata = {
  title: "GDPR-Compliant File Portal for Law Firms | SecureUploadHub",
  description: "Secure client document collection for lawyers and law firms. Collect contracts, legal documents, and sensitive case files with attorney-client privilege protection.",
  keywords: "lawyer file collection, legal document portal, law firm file sharing, attorney client portal, legal document upload, confidential file collection, GDPR compliant legal portal",
  alternates: {
    canonical: "https://secureuploadhub.com/for-lawyers",
  },
  openGraph: {
    title: "GDPR-Compliant File Portal for Law Firms",
    description: "Secure client document collection for lawyers and law firms. Collect contracts, legal documents, and sensitive case files with attorney-client privilege protection.",
    type: "website",
    url: "https://secureuploadhub.com/for-lawyers",
  },
};

export default function LawyersPage() {
  const useCases = [
    "Contract and agreement collection",
    "Case document submissions",
    "Evidence and exhibit uploads", 
    "Client intake documentation",
    "Discovery document collection",
    "Confidential settlement documents"
  ];

  const benefits = [
    {
      icon: <Scale className="w-6 h-6" />,
      title: "Attorney-Client Privilege",
      description: "Maintain confidentiality with secure, encrypted file transfers"
    },
    {
      icon: <ShieldCheck className="w-6 h-6" />,
      title: "GDPR Compliant",
      description: "Meet European data protection requirements for international clients"
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Audit Trail",
      description: "Complete documentation of file access for legal compliance"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Faster Case Prep",
      description: "Collect all case documents in one secure location quickly"
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
      <section className="pt-20 pb-16 bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Scale className="w-8 h-8 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">For Law Firms & Attorneys</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                GDPR-Compliant File Portal for <span className="text-emerald-600">Law Firms</span>
              </h1>
              
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Maintain attorney-client privilege while collecting sensitive legal documents. Create secure, branded portals for contract submissions, case files, and confidential client communications.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/auth/signin"
                  className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
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
                  <span>Attorney-Client Privilege</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>End-to-End Encrypted</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Scale className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Morrison & Associates</h3>
                    <p className="text-sm text-slate-500">Case Document Portal</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Contract_Amendment_v3.pdf</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Evidence_Photos.zip</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <FileText className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">Witness_Statement.docx</span>
                    <div className="ml-auto text-xs text-emerald-600">Uploading... 92%</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-medium text-amber-800">Confidential - Attorney Work Product</span>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Legal Practice Use Cases</h2>
            <p className="text-lg text-slate-600">Secure document collection for every area of legal practice</p>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Law Firms Choose SecureUploadHub</h2>
            <p className="text-lg text-slate-600">Built with legal confidentiality and compliance in mind</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
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
              <h2 className="text-3xl font-bold mb-6">Legal-Grade Security & Compliance</h2>
              <p className="text-lg text-slate-300 mb-8">
                Protect attorney-client privilege and meet the highest standards for legal document security. Our platform is designed specifically for the legal industry's stringent requirements.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Scale className="w-5 h-5 text-green-400" />
                  <span>Attorney-client privilege protection</span>
                </div>
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-400" />
                  <span>End-to-end encryption for all communications</span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-400" />
                  <span>Complete audit trails for litigation support</span>
                </div>
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-green-400" />
                  <span>GDPR and international compliance</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-green-400" />
                  <span>Role-based access for legal teams</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <h3 className="text-xl font-semibold mb-4">Legal Compliance Features</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">Data Encryption</span>
                  <span className="text-green-400 font-semibold">AES-256</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">GDPR Compliance</span>
                  <span className="text-green-400 font-semibold">Full</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">Audit Logging</span>
                  <span className="text-green-400 font-semibold">Complete</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700">
                  <span className="text-slate-300">Data Residency</span>
                  <span className="text-green-400 font-semibold">EU/US Options</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-slate-300">Legal Hold</span>
                  <span className="text-green-400 font-semibold">Supported</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-emerald-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Protect Your Clients' Confidential Information
          </h2>
          <p className="text-xl text-emerald-100 mb-8">
            Join law firms worldwide who trust SecureUploadHub for secure, compliant document collection.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="bg-white text-emerald-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/"
              className="border border-emerald-400 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors text-center"
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