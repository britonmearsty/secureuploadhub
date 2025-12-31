import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service - SecureUploadHub",
  description: "Terms of Service for SecureUploadHub",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-black text-slate-300 relative overflow-hidden">
      {/* Fixed blurry glowing component */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="fixed -top-60 -left-60 w-[500px] h-[500px] bg-blue-600 rounded-full mix-blend-screen opacity-[0.08] blur-3xl"></div>
        <div className="fixed -bottom-60 -right-60 w-[450px] h-[450px] bg-blue-500 rounded-full mix-blend-screen opacity-[0.05] blur-3xl"></div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <h1 className="text-4xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-sm text-slate-400 mb-12">Last updated: December 31, 2025</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Agreement to Terms</h2>
            <p>
              By accessing and using SecureUploadHub, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Use License</h2>
            <p className="mb-4">
              Permission is granted to temporarily download one copy of the materials (information or software) on SecureUploadHub for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Modifying or copying the materials</li>
              <li>Using the materials for any commercial purpose or for any public display</li>
              <li>Attempting to decompile or reverse engineer any software contained on SecureUploadHub</li>
              <li>Removing any copyright or other proprietary notations from the materials</li>
              <li>Transferring the materials to another person or "mirroring" the materials on any other server</li>
              <li>Uploading files containing malware, viruses, or harmful code</li>
              <li>Using the service to harass, harm, or defame others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Disclaimer</h2>
            <p className="mb-4">
              The materials on SecureUploadHub are provided on an "as is" basis. SecureUploadHub makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Limitations</h2>
            <p>
              In no event shall SecureUploadHub or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on SecureUploadHub.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Accuracy of Materials</h2>
            <p>
              The materials appearing on SecureUploadHub could include technical, typographical, or photographic errors. SecureUploadHub does not warrant that any of the materials on its website are accurate, complete, or current. SecureUploadHub may make changes to the materials contained on its website at any time without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Links</h2>
            <p>
              SecureUploadHub has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by SecureUploadHub of the site. Use of any such linked website is at the user's own risk.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Modifications</h2>
            <p>
              SecureUploadHub may revise these terms of service for its website at any time without notice. By using this website, you are agreeing to be bound by the then current version of these terms of service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Governing Law</h2>
            <p>
              These terms and conditions are governed by and construed in accordance with the laws of Kenya, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. User Accounts</h2>
            <div className="space-y-4">
              <p>
                If you create an account on SecureUploadHub, you are responsible for maintaining the confidentiality of your password and account information. You agree to accept responsibility for all activities that occur under your account.
              </p>
              <p>
                You must not:
              </p>
              <ul className="space-y-3 list-disc list-inside">
                <li>Share your account credentials with third parties</li>
                <li>Use another user's account without permission</li>
                <li>Create multiple accounts for fraudulent purposes</li>
                <li>Engage in any activity that violates these terms</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. File Storage and Limits</h2>
            <p className="mb-4">
              SecureUploadHub provides file storage services subject to:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Storage limits as specified in your plan</li>
              <li>File type restrictions for security purposes</li>
              <li>Bandwidth and usage limitations</li>
              <li>Retention policies as outlined in our Privacy Policy</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Prohibited Content</h2>
            <p>
              You agree not to upload, store, or transmit any content that is illegal, defamatory, abusive, obscene, or violates any third-party intellectual property rights. SecureUploadHub reserves the right to remove any content that violates these terms without notice.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Termination</h2>
            <p>
              SecureUploadHub may terminate your account and access to our services at any time for violation of these terms, payment issues, or at its sole discretion. Upon termination, your right to use the service will immediately cease.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Contact Us</h2>
            <p className="mb-4">
              If you have questions about these Terms of Service, please contact us at:
            </p>
            <div className="bg-slate-800 rounded-lg p-6">
              <p className="font-semibold text-white mb-2">SecureUploadHub Legal Team</p>
              <p>Email: hello@secureuploadhub.com</p>
              <p>Address: Nairobi, Kenya</p>
            </div>
          </section>
        </div>

        <div className="mt-20 pt-8 border-t border-slate-700 flex items-center justify-center gap-6 text-sm text-slate-400 flex-wrap">
          <Link href="/privacy" className="hover:text-slate-200 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-200 transition-colors">Terms</Link>
          <Link href="/security" className="hover:text-slate-200 transition-colors">Security</Link>
          <Link href="/cookie-policy" className="hover:text-slate-200 transition-colors">Cookies</Link>
          <Link href="/gdpr" className="hover:text-slate-200 transition-colors">GDPR</Link>
        </div>
      </div>
    </div>
  );
}
