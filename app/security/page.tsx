import Link from "next/link";
import { ArrowLeft, Shield, Lock, Eye, AlertCircle } from "lucide-react";

export const metadata = {
  title: "Security - SecureUploadHub",
  description: "Security Information for SecureUploadHub",
};

export default function Security() {
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

        <h1 className="text-4xl font-bold text-white mb-2">Security</h1>
        <p className="text-sm text-slate-400 mb-12">Last updated: December 2024</p>

        <div className="space-y-8">
          <section className="bg-slate-800 rounded-lg p-6 border border-blue-500/20">
            <div className="flex items-start gap-4">
              <Shield className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Security is Our Top Priority</h2>
                <p>
                  At SecureUploadHub, we understand that your data is sensitive and valuable. Security is embedded in every aspect of our platform, from infrastructure to application design. We are committed to protecting your files and personal information with enterprise-grade security measures.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. Encryption</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-400" />
                  Encryption in Transit
                </h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>All data transmitted to/from SecureUploadHub is encrypted using TLS 1.3</li>
                  <li>HTTP requests are automatically redirected to HTTPS</li>
                  <li>Certificate pinning prevents man-in-the-middle attacks</li>
                  <li>Perfect forward secrecy ensures past communications remain secure even if keys are compromised</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-400" />
                  Encryption at Rest
                </h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>All uploaded files are encrypted using AES-256-GCM encryption</li>
                  <li>Encryption keys are stored separately from encrypted data</li>
                  <li>Database records are encrypted at rest</li>
                  <li>Regular key rotation follows industry best practices</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. Authentication & Access Control</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Multi-Factor Authentication (MFA)</h3>
                <p>
                  We support multiple authentication methods including passwords, OAuth providers, and time-based one-time passwords (TOTP).
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Password Security</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Passwords are hashed using bcrypt with salt</li>
                  <li>Minimum password requirements enforced (12+ characters recommended)</li>
                  <li>Password history prevents reuse of recent passwords</li>
                  <li>Account lockout after failed login attempts</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Session Management</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Secure session tokens with expiration</li>
                  <li>HttpOnly and Secure cookie flags prevent JavaScript access</li>
                  <li>CSRF tokens protect against cross-site attacks</li>
                  <li>Automatic session timeout after inactivity</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Role-Based Access Control (RBAC)</h3>
                <p>
                  Users have different permission levels (viewer, editor, admin) with granular access controls to files and features.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Infrastructure Security</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Network Security</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Web Application Firewall (WAF) protects against common attacks</li>
                  <li>DDoS protection with rate limiting and traffic analysis</li>
                  <li>Intrusion detection and prevention systems</li>
                  <li>Network segmentation isolates critical components</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Database Security</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Databases are isolated from public networks</li>
                  <li>Connection pooling with credential encryption</li>
                  <li>Automated backups with encryption</li>
                  <li>Point-in-time recovery for disaster recovery</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Cloud Security</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Infrastructure runs on secure, isolated cloud environments</li>
                  <li>Regular infrastructure security audits</li>
                  <li>Vulnerability scanning and patching</li>
                  <li>Compliance with cloud provider security standards</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Application Security</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Code Security</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Regular code reviews by security-trained developers</li>
                  <li>Static application security testing (SAST)</li>
                  <li>Dependency scanning for known vulnerabilities</li>
                  <li>Secure coding practices enforced throughout development</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Input Validation</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>All user inputs are validated and sanitized</li>
                  <li>Protection against SQL injection attacks</li>
                  <li>XSS (Cross-Site Scripting) prevention</li>
                  <li>CSRF token validation on all state-changing operations</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">API Security</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Rate limiting to prevent abuse</li>
                  <li>API authentication via OAuth 2.0 and JWT tokens</li>
                  <li>Request signing and verification</li>
                  <li>Comprehensive API logging and monitoring</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Compliance & Certifications</h2>
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-white mb-2">SOC 2 Type II</h3>
                <p>
                  We maintain SOC 2 Type II compliance, independently audited annually. This certification demonstrates our commitment to security, availability, and confidentiality controls.
                </p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-white mb-2">GDPR Compliant</h3>
                <p>
                  Full compliance with EU General Data Protection Regulation, including data protection assessments, privacy by design, and user rights management.
                </p>
              </div>
              <div className="bg-slate-800 rounded-lg p-4">
                <h3 className="text-xl font-semibold text-white mb-2">ISO 27001 Certification</h3>
                <p>
                  Our information security management system follows ISO 27001 standards for protecting sensitive data.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Security Monitoring & Response</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">24/7 Monitoring</h3>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Continuous security monitoring and threat detection</li>
                  <li>Automated alerts for suspicious activities</li>
                  <li>Log aggregation and analysis</li>
                  <li>Real-time security incident response</li>
                </ul>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Incident Response</h3>
                <p className="mb-3">
                  We maintain a comprehensive incident response plan with:
                </p>
                <ul className="space-y-2 list-disc list-inside">
                  <li>Dedicated incident response team</li>
                  <li>Rapid containment and mitigation procedures</li>
                  <li>User notification within 72 hours of confirmed breach</li>
                  <li>Post-incident analysis and preventive measures</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Penetration Testing</h2>
            <p className="mb-4">
              We conduct regular third-party penetration testing and security audits to identify and address vulnerabilities. Tests include:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Annual comprehensive penetration testing</li>
              <li>Quarterly vulnerability assessments</li>
              <li>Web application security testing</li>
              <li>Social engineering assessments</li>
              <li>Infrastructure security audits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Vulnerability Disclosure</h2>
            <p className="mb-4">
              We take security vulnerabilities seriously. If you discover a security vulnerability, please report it responsibly:
            </p>
            <div className="bg-slate-800 rounded-lg p-6">
              <p className="font-semibold text-white mb-2">Report Security Issues To:</p>
              <p>Email: security@secureuploadhub.com</p>
              <p className="text-sm text-slate-400 mt-4">
                Please include details about the vulnerability and avoid public disclosure until we've had time to investigate and patch.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. User Security Best Practices</h2>
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <Eye className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Protect Yourself</h3>
                  <ul className="space-y-2 list-disc list-inside">
                    <li>Use strong, unique passwords (12+ characters with mixed case, numbers, symbols)</li>
                    <li>Enable multi-factor authentication on your account</li>
                    <li>Never share your credentials with others</li>
                    <li>Log out from public computers</li>
                    <li>Keep your browser and operating system updated</li>
                    <li>Be cautious of phishing attempts</li>
                    <li>Report suspicious activities immediately</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Data Retention & Deletion</h2>
            <p className="mb-4">
              Your data security extends to proper deletion:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Files you delete are securely wiped using cryptographic erasure</li>
              <li>Account deletion removes all associated personal data</li>
              <li>Backups are encrypted and retained according to recovery requirements</li>
              <li>Legal holds may retain data as required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Third-Party Security</h2>
            <p className="mb-4">
              We carefully vet all third-party vendors and service providers:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Security assessments of all vendor integrations</li>
              <li>Data Processing Agreements with all processors</li>
              <li>Regular vendor security audits</li>
              <li>Restricted data access based on operational need</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">12. Security Roadmap</h2>
            <p className="mb-4">
              We continuously improve our security posture. Planned enhancements include:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Advanced threat detection with machine learning</li>
              <li>Zero-trust network architecture</li>
              <li>Hardware security module (HSM) integration</li>
              <li>Enhanced audit logging and forensics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">13. Security Updates & Patches</h2>
            <p>
              Security patches are applied immediately upon availability. Critical vulnerabilities are addressed within 24 hours. We maintain a detailed patch management and version tracking system to ensure all systems remain up-to-date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">14. Contact Security Team</h2>
            <div className="bg-slate-800 rounded-lg p-6 space-y-4">
              <p className="font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Report Security Issues
              </p>
              <p>Email: security@secureuploadhub.com</p>
              <p className="text-sm text-slate-400">
                For general security questions or concerns about this policy, please contact our security team.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
