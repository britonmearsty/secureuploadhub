import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Cookie Policy - DropPortal",
  description: "Cookie Policy for DropPortal",
};

export default function CookiePolicy() {
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

        <h1 className="text-4xl font-bold text-white mb-2">Cookie Policy</h1>
        <p className="text-sm text-slate-400 mb-12">Last updated: December 2024</p>

        <div className="space-y-8">
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">1. What Are Cookies?</h2>
            <p>
              Cookies are small text files that are stored on your device when you visit a website. They allow the website to remember information about your visit and preferences. Cookies can be either "persistent" (remaining on your device for a set period) or "session-based" (deleted when you close your browser).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">2. How We Use Cookies</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.1 Essential Cookies</h3>
                <p>
                  These cookies are necessary for the website to function properly. They enable you to navigate the site and use its features. Without these cookies, our services cannot be provided.
                </p>
                <p className="text-sm text-slate-400 mt-2">Examples: Session tokens, authentication cookies, security tokens</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.2 Performance Cookies</h3>
                <p>
                  These cookies collect information about how you use our website, such as which pages you visit and any errors you encounter. This helps us improve the performance and functionality of our services.
                </p>
                <p className="text-sm text-slate-400 mt-2">Examples: Analytics cookies, performance monitoring</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.3 Functional Cookies</h3>
                <p>
                  These cookies enhance the functionality of our website by remembering your preferences, such as language selection or display settings.
                </p>
                <p className="text-sm text-slate-400 mt-2">Examples: Language preference, theme selection</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">2.4 Marketing Cookies</h3>
                <p>
                  These cookies track your online activity to deliver targeted advertisements and measure the effectiveness of marketing campaigns.
                </p>
                <p className="text-sm text-slate-400 mt-2">Examples: Conversion tracking, retargeting cookies</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">3. Third-Party Cookies</h2>
            <p className="mb-4">
              We may allow third-party service providers to place cookies on your device for the purposes of:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>Analytics and usage tracking (e.g., Google Analytics, PostHog)</li>
              <li>Customer support and engagement</li>
              <li>Marketing and advertising</li>
              <li>Payment processing</li>
            </ul>
            <p className="mt-4">
              These third parties are bound by confidentiality agreements and are not permitted to use your information for their own purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">4. Cookie Duration</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Session Cookies</h3>
                <p>
                  Deleted automatically when you close your browser.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Persistent Cookies</h3>
                <p>
                  Remain on your device for a specified period (typically 1 month to 1 year, depending on the cookie's purpose).
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">5. Managing Your Cookie Preferences</h2>
            <p className="mb-4">
              Most modern browsers allow you to:
            </p>
            <ul className="space-y-3 list-disc list-inside">
              <li>View cookies stored on your device</li>
              <li>Delete specific cookies or all cookies</li>
              <li>Block cookies from specific websites</li>
              <li>Disable cookies entirely</li>
            </ul>
            <p className="mt-4">
              Please note that disabling essential cookies may affect your ability to use certain features of our website.
            </p>
            <div className="bg-slate-800 rounded-lg p-4 mt-4">
              <p className="font-semibold text-white mb-2">Browser Cookie Management:</p>
              <ul className="space-y-2 text-sm list-disc list-inside">
                <li>Chrome: Settings → Privacy and security → Cookies and other site data</li>
                <li>Firefox: Preferences → Privacy & Security → Cookies and Site Data</li>
                <li>Safari: Preferences → Privacy → Cookies and website data</li>
                <li>Edge: Settings → Privacy and security → Clear browsing data</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">6. Do Not Track (DNT)</h2>
            <p>
              Some browsers include a "Do Not Track" feature. Currently, there is no universal standard for recognizing DNT signals. Our website does not currently respond to DNT browser signals, but you can use the cookie management tools described above to control cookie usage.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">7. Cookie Consent</h2>
            <p>
              When you first visit our website, we display a cookie consent banner. Essential cookies are set automatically to provide basic functionality. Performance, functional, and marketing cookies require your explicit consent before being placed on your device.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">8. Privacy and Security</h2>
            <p>
              We do not store sensitive personal information such as passwords or payment card details in cookies. All cookies are transmitted securely over HTTPS in production environments.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">9. Our Cookie List</h2>
            <div className="bg-slate-800 rounded-lg p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-4 font-semibold">Cookie Name</th>
                    <th className="text-left py-2 px-4 font-semibold">Purpose</th>
                    <th className="text-left py-2 px-4 font-semibold">Type</th>
                    <th className="text-left py-2 px-4 font-semibold">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-4">next-auth.session-token</td>
                    <td className="py-2 px-4">Authentication</td>
                    <td className="py-2 px-4">Essential</td>
                    <td className="py-2 px-4">30 days</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-4">_ga</td>
                    <td className="py-2 px-4">Google Analytics</td>
                    <td className="py-2 px-4">Performance</td>
                    <td className="py-2 px-4">2 years</td>
                  </tr>
                  <tr className="border-b border-slate-700">
                    <td className="py-2 px-4">ph_phg</td>
                    <td className="py-2 px-4">PostHog Analytics</td>
                    <td className="py-2 px-4">Performance</td>
                    <td className="py-2 px-4">1 year</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-4">theme-preference</td>
                    <td className="py-2 px-4">User theme preference</td>
                    <td className="py-2 px-4">Functional</td>
                    <td className="py-2 px-4">1 year</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">10. Changes to This Policy</h2>
            <p>
              We may update this Cookie Policy periodically to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes by updating the "Last Updated" date of this policy.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-white mb-4">11. Contact Us</h2>
            <p className="mb-4">
              If you have questions about our use of cookies, please contact us at:
            </p>
            <div className="bg-slate-800 rounded-lg p-6">
              <p className="font-semibold text-white mb-2">DropPortal Privacy Team</p>
              <p>Email: privacy@secureuploadhub.com</p>
              <p>Address: [Your Company Address]</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
