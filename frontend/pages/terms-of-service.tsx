"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-50 to-blue-50 p-4 space-y-6">
      {/* Header - Paper Style */}
      <Card className="max-w-4xl mx-auto shadow-xl border-0">
        <CardHeader className="py-10 text-center bg-white">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-gray-800 mb-6 leading-tight">
            Terms of Service
          </CardTitle>
          <div className="h-px bg-gray-300 w-24 mx-auto mb-6"></div>
          <p className="text-base md:text-lg text-gray-600 font-serif italic max-w-3xl mx-auto leading-relaxed">
            Last Updated: September 10, 2025
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
                1. Acceptance of Terms
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                By accessing or using the IntrepidQ AI service ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Service.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                2. Description of Service
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                IntrepidQ AI is an educational platform that generates UPSC Mains examination questions using artificial intelligence. The Service allows users to:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Generate subject-specific questions based on UPSC syllabus</li>
                <li>Create full mock papers for practice</li>
                <li>Generate answers to questions</li>
                <li>Plan daily study topics with the topic planner</li>
                <li>Provide website feedback</li>
              </ul>
            </div>
            
            {/* Section 3 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                3. User Accounts
              </h2>
              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3">
                3.1 Registration
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                To access certain features, you must register for an account. You agree to:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Provide accurate and complete information</li>
                <li>Maintain and update your information as needed</li>
                <li>Keep your password secure</li>
                <li>Notify us immediately of any unauthorized access</li>
              </ul>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                3.2 Account Security
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You are responsible for maintaining the security of your account and for all activities that occur under your account.
              </p>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                3.3 Account Termination
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We reserve the right to suspend or terminate your account at any time for any reason.
              </p>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                4. Use of Service
              </h2>
              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3">
                4.1 Eligibility
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You must be at least 13 years old to use the Service. By using the Service, you represent that you meet this requirement.
              </p>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                4.2 License
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                Subject to these Terms, we grant you a limited, non-exclusive, non-transferable license to use the Service for your personal, non-commercial use.
              </p>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                4.3 Restrictions
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You agree not to:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Use the Service for any illegal purpose</li>
                <li>Reverse engineer or attempt to extract the source code</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use bots or automated processes to access the Service</li>
                <li>Share your account with others</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                5. User Content
              </h2>
              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3">
                5.1 Responsibility
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You are solely responsible for any content you submit, post, or display on the Service.
              </p>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                5.2 License to Us
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display your content in connection with the Service.
              </p>
            </div>

            {/* Section 6 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                6. Intellectual Property
              </h2>
              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3">
                6.1 Our Rights
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                The Service and all content, features, and functionality are owned by us or our licensors and are protected by intellectual property laws.
              </p>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                6.2 Your Rights
              </h3>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You retain all rights to your content, but you grant us the license described above.
              </p>
            </div>

            {/* Sections 7-13 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                7. Disclaimers
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify uppercase font-semibold">
                <span className="inline-block w-8"></span>
                The service is provided "as is" and "as available" without warranties of any kind. We disclaim all warranties, express or implied, including merchantability and fitness for a particular purpose.
              </p>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                8. Limitation of Liability
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify uppercase font-semibold">
                <span className="inline-block w-8"></span>
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
              </p>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                9. Indemnification
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of the Service or violation of these Terms.
              </p>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                10. Modifications to Service
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We reserve the right to modify, suspend, or discontinue the Service at any time without notice.
              </p>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                11. Governing Law
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                These Terms shall be governed by the laws of India, without regard to conflict of law principles.
              </p>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                12. Changes to Terms
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We may update these Terms from time to time. We will notify you of any changes by posting the new Terms on this page.
              </p>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                13. Contact Information
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                If you have any questions about these Terms, please contact us at: support@intrepidq.xyz
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
