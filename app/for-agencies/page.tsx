import type { Metadata } from "next";
import Link from "next/link";
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Palette,
  Lock,
  FolderSync,
  Zap
} from "lucide-react";

export const metadata: Metadata = {
  title: "Branded File Collection for Creative Agencies | SecureUploadHub",
  description: "Professional file upload portal for creative agencies and design studios. Collect client assets, project files, and creative materials with your agency branding.",
  keywords: "agency file collection, creative agency portal, design file upload, client asset collection, agency file sharing, branded upload portal, creative file management",
  alternates: {
    canonical: "https://secureuploadhub.com/for-agencies",
  },
  openGraph: {
    title: "Branded File Collection for Creative Agencies",
    description: "Professional file upload portal for creative agencies and design studios. Collect client assets, project files, and creative materials with your agency branding.",
    type: "website",
    url: "https://secureuploadhub.com/for-agencies",
  },
};

export default function AgenciesPage() {
  const useCases = [
    "Client logo and brand asset collection",
    "Project brief and content uploads",
    "High-resolution image submissions", 
    "Video and multimedia file collection",
    "Campaign asset gathering",
    "Client feedback and revision files"
  ];

  const benefits = [
    {
      icon: <Palette className="w-6 h-6" />,
      title: "Full Brand Customization",
      description: "Match your agency's brand with custom colors, logos, and messaging"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Large File Support",
      description: "Handle massive creative files without size restrictions"
    },
    {
      icon: <FolderSync className="w-6 h-6" />,
      title: "Project Organization",
      description: "Automatically organize files by client and project"
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: "Faster Project Kickoff",
      description: "Get all client assets upfront to start projects immediately"
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
      <section className="pt-20 pb-16 bg-gradient-to-br from-purple-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Palette className="w-8 h-8 text-purple-600" />
                <span className="text-purple-600 font-semibold">For Creative Agencies</span>
              </div>
              
              <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                Branded File Collection for <span className="text-purple-600">Creative Agencies</span>
              </h1>
              
              <p className="text-xl text-slate-600 mb-8 leading-relaxed">
                Stop chasing clients for project assets. Create stunning, branded upload portals that match your agency's aesthetic while collecting high-resolution files, brand assets, and project materials effortlessly.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Link
                  href="/auth/signin"
                  className="bg-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
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
                  <span>Unlimited File Sizes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-green-600" />
                  <span>Full Brand Customization</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>Secure & Fast</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Palette className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Creative Studio Pro</h3>
                    <p className="text-sm text-slate-500">Brand Asset Collection</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      AI
                    </div>
                    <span className="text-sm font-medium text-green-800">Brand_Logo_Vector.ai</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-pink-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      PSD
                    </div>
                    <span className="text-sm font-medium text-green-800">Hero_Image_4K.psd</span>
                    <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-green-600 rounded flex items-center justify-center text-white text-xs font-bold">
                      MP4
                    </div>
                    <span className="text-sm font-medium text-purple-800">Product_Demo_Video.mp4</span>
                    <div className="ml-auto text-xs text-purple-600">Uploading... 67%</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-purple-800">Total: 847 MB</span>
                    <span className="text-xs text-purple-600">3 of 12 files uploaded</span>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Creative Agency Use Cases</h2>
            <p className="text-lg text-slate-600">Streamline asset collection for every type of creative project</p>
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
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Creative Agencies Choose SecureUploadHub</h2>
            <p className="text-lg text-slate-600">Built for the unique needs of creative professionals</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-600">
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                <p className="text-slate-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Brand Customization Showcase */}
      <section className="py-20 bg-gradient-to-br from-purple-900 to-pink-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Make It Yours: Complete Brand Customization</h2>
              <p className="text-lg text-purple-100 mb-8">
                Your upload portal should reflect your agency's creative excellence. Customize every element to create a seamless brand experience for your clients.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Palette className="w-5 h-5 text-pink-400" />
                  <span>Custom colors, fonts, and styling</span>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-pink-400" />
                  <span>Branded welcome messages and instructions</span>
                </div>
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-pink-400" />
                  <span>Client-specific portal customization</span>
                </div>
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-pink-400" />
                  <span>Custom file type requirements</span>
                </div>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h3 className="text-xl font-semibold mb-6">Customization Options</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="text-purple-100">Logo Upload</span>
                  <span className="text-pink-400 font-semibold">✓ Included</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="text-purple-100">Color Schemes</span>
                  <span className="text-pink-400 font-semibold">✓ Unlimited</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="text-purple-100">Custom Messages</span>
                  <span className="text-pink-400 font-semibold">✓ Full Control</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/20">
                  <span className="text-purple-100">Background Images</span>
                  <span className="text-pink-400 font-semibold">✓ Supported</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-purple-100">White Label</span>
                  <span className="text-pink-400 font-semibold">✓ Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* File Types Support */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-4">Support for All Creative File Types</h2>
          <p className="text-lg text-slate-600 mb-12">Handle any file format your creative projects require</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { type: "AI", color: "from-orange-400 to-orange-600", name: "Illustrator" },
              { type: "PSD", color: "from-blue-400 to-blue-600", name: "Photoshop" },
              { type: "INDD", color: "from-pink-400 to-pink-600", name: "InDesign" },
              { type: "MP4", color: "from-red-400 to-red-600", name: "Video" },
              { type: "PNG", color: "from-green-400 to-green-600", name: "Images" },
              { type: "ZIP", color: "from-purple-400 to-purple-600", name: "Archives" }
            ].map((fileType, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-slate-200 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 bg-gradient-to-br ${fileType.color} rounded-lg flex items-center justify-center mx-auto mb-3 text-white font-bold text-sm`}>
                  {fileType.type}
                </div>
                <p className="text-sm font-medium text-slate-700">{fileType.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Elevate Your Client Experience?
          </h2>
          <p className="text-xl text-purple-100 mb-8">
            Join creative agencies worldwide who use SecureUploadHub to streamline their project workflows.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/signin"
              className="bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/"
              className="border border-purple-400 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:bg-purple-700 transition-colors text-center"
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