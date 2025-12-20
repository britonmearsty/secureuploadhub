import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "GDPR Compliance - DropPortal",
  description: "GDPR Compliance Information for DropPortal",
};

export default function GDPRCompliance() {
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

        <h1 className="text-4xl font-bold text-white mb-2">GDPR Compliance</h1>
        <p className="text-sm text-slate-400 mb-12">Last updated: December 2024</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. GDPR Overview</h2>
            <p className="mb-4">
              The General Data Protection Regulation (GDPR) is a comprehensive data protection law that applies to organizations operating in the European Union (EU) and those processing the personal data of EU residents. DropPortal is fully committed to complying with GDPR requirements.
            </p>
            <p>
              This page explains how we meet GDPR obligations and what rights you have under the regulation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Legal Basis for Processing</h2>
            <p className="mb-4">
              We process personal data under the following legal bases:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.1 Contract Performance</h3>
                <p>
                  Processing necessary to provide DropPortal services, such as account creation, file storage, and service delivery.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.2 Legitimate Interests</h3>
                <p>
                  Processing for fraud prevention, security, network optimization, and analytics that do not override your privacy rights.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.3 Legal Compliance</h3>
                <p>
                  Processing required by law, regulation, or court order.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.4 Consent</h3>
                <p>
                  Processing with your explicit consent for specific purposes (e.g., marketing communications, analytics).
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Your GDPR Rights</h2>
            <p className="mb-4">
              Under GDPR, you have the following rights:
            </p>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">3.1 Right of Access</h3>
                <p>
                  You have the right to request a copy of the personal data we hold about you, along with information about how we process it.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">3.2 Right to Rectification</h3>
                <p>
                  You can request that we correct any inaccurate or incomplete personal data we hold about you.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">3.3 Right to Erasure ("Right to Be Forgotten")</h3>
                <p>
                  You can request deletion of your personal data, subject to certain exceptions (e.g., legal obligations, dispute resolution).
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">3.4 Right to Restrict Processing</h3>
                <p>
                  You can request that we limit how we use your personal data in certain circumstances.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">3.5 Right to Data Portability</h3>
                <p>
                  You can request your personal data in a structured, commonly used format to transfer to another service provider.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">3.6 Right to Object</h3>
                <p>
                  You can object to our processing of your personal data for direct marketing, automated decision-making, or legitimate interests.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">3.7 Rights Related to Automated Decision-Making</h3>
                <p>
                  You have rights regarding automated decision-making and profiling that produces legal or similarly significant effects.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. How to Exercise Your Rights</h2>
            <p className="mb-4">
              To exercise any of the rights above, please contact us with:
            </p>
            <ul className="space-y-3 list-disc list-inside mb-4">
              <li>Your name and account email address</li>
              <li>A clear description of your request</li>
              <li>Any supporting documentation</li>
            </ul>
            <p className="mb-4">
              We will respond to your request within 30 days. If we need additional time or information, we will inform you accordingly.
            </p>
            <div className="bg-slate-800 rounded-lg p-6">
              <p className="font-semibold text-white mb-2">Contact us at:</p>
              <p>Email: gdpr@secureuploadhub.com</p>
              <p className="text-sm text-slate-400 mt-2">Include "GDPR Request" in your subject line</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Data Protection Officer</h2>
            <p className="mb-4">
              We have appointed a Data Protection Officer (DPO) to oversee our GDPR compliance. You can contact our DPO regarding data protection matters:
            </p>
            <div className="bg-slate-800 rounded-lg p-6">
              <p className="font-semibold text-white mb-2">Data Protection Officer</p>
              <p>Email: dpo@secureuploadhub.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Data Transfers</h2>
            <p className="mb-4">
              DropPortal operates primarily within the EU. If we transfer personal data outside the EU, we ensure appropriate safeguards are in place:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Standard Contractual Clauses (SCCs) for transfers to countries with adequacy decisions</li>
              <li>Data Processing Agreements (DPAs) with all third-party processors</li>
              <li>Binding Corporate Rules where applicable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Data Retention</h2>
            <p>
              We retain personal data only for as long as necessary to provide services and comply with legal obligations. You can request deletion of your data at any time, subject to legitimate retention requirements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Automated Decision-Making and Profiling</h2>
            <p className="mb-4">
              DropPortal does not engage in automated decision-making or profiling that produces legal or similarly significant effects affecting you. Any automated processes are used only for:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Fraud detection and prevention</li>
              <li>Security monitoring</li>
              <li>Performance optimization</li>
            </ul>
            <p className="mt-4">
              You have the right to request human intervention or contest these automated decisions.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Privacy by Design</h2>
            <p>
              We implement GDPR principles throughout our operations:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Data minimization: collecting only necessary information</li>
              <li>Purpose limitation: using data only for stated purposes</li>
              <li>Storage limitation: retaining data only as long as needed</li>
              <li>Integrity and confidentiality: securing data against unauthorized access</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Data Breach Notification</h2>
            <p>
              In the unlikely event of a personal data breach, we will notify affected individuals and relevant authorities within 72 hours of discovering the breach, as required by GDPR.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. International Transfers for UK Users</h2>
            <p>
              For users in the United Kingdom, we comply with UK GDPR and UK Data Protection Act 2018 requirements. Transfers outside the UK follow similar safeguards as EU transfers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Supervisory Authority</h2>
            <p className="mb-4">
              If you believe we are not complying with GDPR, you have the right to lodge a complaint with your local data protection authority:
            </p>
            <p className="text-sm text-slate-400">
              You can find your local authority at <a href="https://edpb.ec.europa.eu/about-edpb/members_en" className="text-blue-400 hover:text-blue-300">European Data Protection Board</a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Contact Information</h2>
            <div className="bg-slate-800 rounded-lg p-6 space-y-4">
              <div>
                <p className="font-semibold text-white mb-2">For GDPR-related inquiries:</p>
                <p>Email: gdpr@secureuploadhub.com</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">For general inquiries:</p>
                <p>Email: privacy@secureuploadhub.com</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Data Protection Officer:</p>
                <p>Email: dpo@secureuploadhub.com</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
