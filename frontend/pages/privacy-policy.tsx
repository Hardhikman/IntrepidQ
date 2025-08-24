"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-50 to-blue-50 p-4 space-y-6">
      {/* Header - Paper Style */}
      <Card className="max-w-4xl mx-auto shadow-xl border-0">
        <CardHeader className="py-10 text-center bg-white">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-gray-800 mb-6 leading-tight">
            Privacy Policy
          </CardTitle>
          <div className="h-px bg-gray-300 w-24 mx-auto mb-6"></div>
          <p className="text-base md:text-lg text-gray-600 font-serif italic max-w-3xl mx-auto leading-relaxed">
            Last Updated: August 24, 2025
          </p>
        </CardHeader>
      </Card>

      {/* Main Content - Paper Style */}
      <Card className="max-w-4xl mx-auto shadow-lg border-0">
        <CardContent className="p-8 sm:p-12 bg-white">
          <div className="space-y-8 font-serif">
            {/* Section 1 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                1. Introduction
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                This Privacy Policy describes how IntrepidQ ("we", "our", or "us") collects, uses, and protects your personal information when you use our website and services. We are committed to protecting your privacy and ensuring the security of your personal information.
              </p>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify mt-3">
                <span className="inline-block w-8"></span>
                By using our services, you agree to the collection and use of information in accordance with this policy.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                2. Information We Collect
              </h2>
              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3">
                2.1 Information You Provide Directly
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                When you create an account or use our services, we may collect:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Account Information: Email address, full name, username</li>
                <li>User Preferences: Preferred subjects for question generation</li>
                <li>Usage Data: Questions generated, study streaks, generation history</li>
                <li>Feedback: Ratings and comments you provide on generated questions</li>
              </ul>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                2.2 Information Collected Automatically
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We automatically collect certain information when you use our services:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>IP Address: For guest user rate limiting</li>
                <li>Browser and Device Information: Type of browser, operating system, device identifiers</li>
                <li>Usage Information: Pages visited, features used, time spent on the site</li>
                <li>Performance Data: AI model performance metrics</li>
              </ul>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                2.3 Cookies and Tracking Technologies
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We use cookies and similar tracking technologies to enhance your experience:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Essential Cookies: Required for authentication and core functionality</li>
                <li>Analytics Cookies: Help us understand how users interact with our service</li>
                <li>Preference Cookies: Remember your settings and preferences</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                3. How We Use Your Information
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We use the collected information for the following purposes:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Service Provision: Generate UPSC questions, maintain your study history</li>
                <li>Account Management: Create and manage your user profile</li>
                <li>Rate Limiting: Enforce daily limits for both authenticated and guest users</li>
                <li>Personalization: Customize content based on your preferences</li>
                <li>Improvement: Enhance our services and user experience</li>
                <li>Analytics: Monitor and analyze usage patterns and performance</li>
                <li>Communication: Send important updates about your account or our services</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                4. Data Retention and Deletion
              </h2>
              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3">
                4.1 Data Retention Periods
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We retain different types of data for varying periods:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>User Generated Questions: 30 days</li>
                <li>Guest User Data: 7 days</li>
                <li>Cache Data: 7 days (automatically expires)</li>
                <li>Model Performance Data: 30 days</li>
                <li>Analytics Data: As needed for service improvement</li>
              </ul>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                4.2 Data Deletion
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You may request deletion of your account and associated data by contacting us. Upon account deletion:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Your profile information will be removed</li>
                <li>Your question generation history will be deleted after 30 days</li>
                <li>Aggregated analytics data will be retained for service improvement</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                5. Information Sharing and Disclosure
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>With Your Consent: When you explicitly authorize sharing</li>
                <li>Legal Requirements: When required by law or to protect our rights</li>
                <li>Service Providers: With trusted third parties who assist in operating our service</li>
                <li>Business Transfers: In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                6. Data Security
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We implement appropriate security measures to protect your information:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Encryption: Data is transmitted using HTTPS</li>
                <li>Access Controls: Limited access to personal information</li>
                <li>Regular Audits: Security assessments and updates</li>
                <li>Authentication: Secure login with Google OAuth</li>
              </ul>
            </div>

            {/* Section 7 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                7. Your Rights and Choices
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Access: Request access to your personal data</li>
                <li>Correction: Request correction of inaccurate data</li>
                <li>Deletion: Request deletion of your data</li>
                <li>Objection: Object to processing of your data</li>
                <li>Portability: Request transfer of your data to another service</li>
              </ul>
            </div>

            {/* Section 8-10 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                8. Children's Privacy
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                Our services are not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13.
              </p>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                9. Changes to This Privacy Policy
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
              </p>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                10. Contact Us
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify mt-2">
                <span className="inline-block w-8"></span>
                Email: hardhikm.08@gmail.com
              </p>
            </div>

            {/* Back to Home button */}
            <div className="mt-12 text-center">
              <Button
                onClick={() => router.push('/')}
                className="bg-gradient-to-r from-orange-400 to-blue-500 hover:from-orange-500 hover:to-blue-600 text-white"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
