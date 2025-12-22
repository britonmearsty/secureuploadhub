import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy - SecureUploadHub",
  description: "Privacy Policy for SecureUploadHub",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-slate-400 mb-12">Last updated: December 2024</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Introduction</h2>
            <p className="mb-4">
              SecureUploadHub ("we," "us," "our," or "Company") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our file upload and management services.
            </p>
            <p>
              Please read this Privacy Policy carefully. If you do not agree with our policies and practices, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.1 Account Information</h3>
                <p>
                  When you create an account, we collect information such as your name, email address, business information, and authentication credentials.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.2 Files and Content</h3>
                <p>
                  When you upload files to SecureUploadHub, we store the files and associated metadata (file name, size, upload date, file type).
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.3 Usage Data</h3>
                <p>
                  We automatically collect information about your device and usage patterns, including IP address, browser type, operating system, pages visited, time spent, and referring URLs.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.4 Communication Data</h3>
                <p>
                  We collect information from your communications with us, including support requests, feedback, and correspondence.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. How We Use Your Information</h2>
            <ul className="space-y-3 list-disc list-inside">
              <li>To provide, maintain, and improve our services</li>
              <li>To process your transactions and send related information</li>
              <li>To send service-related announcements and updates</li>
              <li>To respond to your inquiries and provide customer support</li>
              <li>To prevent fraudulent transactions and enhance security</li>
              <li>To comply with legal obligations and enforce our agreements</li>
              <li>To analyze usage patterns to improve user experience</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Data Security</h2>
            <p className="mb-4">
              We implement comprehensive security measures to protect your information:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>AES-256 encryption for files at rest</li>
              <li>TLS 1.3 encryption for data in transit</li>
              <li>Secure authentication mechanisms and session management</li>
              <li>Regular security audits and penetration testing</li>
              <li>SOC 2 Type II compliance</li>
              <li>Access controls and role-based permissions</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Sharing Your Information</h2>
            <p className="mb-4">
              We do not sell, trade, or rent your personal information to third parties. We may share information in the following cases:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>With service providers who assist us in operating our platform (under confidentiality agreements)</li>
              <li>When required by law or to protect our legal rights</li>
              <li>In connection with a merger, acquisition, or sale of assets</li>
              <li>With your explicit consent for specific purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Cookies and Tracking</h2>
            <p className="mb-4">
              We use cookies and similar tracking technologies to enhance your experience. You can control cookie preferences through your browser settings. For more information, see our Cookie Policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Your Rights</h2>
            <p className="mb-4">
              Depending on your location, you may have the following rights:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Right to access your personal data</li>
              <li>Right to correct inaccurate data</li>
              <li>Right to request deletion of your data</li>
              <li>Right to data portability</li>
              <li>Right to opt-out of certain processing</li>
              <li>Right to lodge complaints with data protection authorities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Retention of Data</h2>
            <p>
              We retain personal data for as long as necessary to provide our services and comply with legal obligations. Files are deleted when you remove them from your account. You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Contact Us</h2>
            <p className="mb-4">
              If you have questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <div className="bg-slate-800 rounded-lg p-6">
              <p className="font-semibold text-white mb-2">SecureUploadHub Privacy Team</p>
              <p>Email: privacy@secureuploadhub.com</p>
              <p>Address: [Your Company Address]</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Policy Updates</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of significant changes via email or prominent notice on our website. Your continued use of our services constitutes acceptance of the updated policy.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
