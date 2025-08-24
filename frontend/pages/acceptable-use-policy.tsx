"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AcceptableUsePolicyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-50 to-blue-50 p-4 space-y-6">
      {/* Header - Paper Style */}
      <Card className="max-w-4xl mx-auto shadow-xl border-0">
        <CardHeader className="py-10 text-center bg-white">
          <CardTitle className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold text-gray-800 mb-6 leading-tight">
            Acceptable Use Policy
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
                This Acceptable Use Policy outlines the standards of behavior expected from all users of the IntrepidQ service. By using our service, you agree to comply with this policy.
              </p>
            </div>

            {/* Section 2 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                2. Permitted Use
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You may use IntrepidQ for:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Personal UPSC examination preparation</li>
                <li>Educational purposes</li>
                <li>Generating practice questions and answers</li>
                <li>Providing constructive feedback to improve our service</li>
              </ul>
            </div>

            {/* Section 3 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                3. Prohibited Activities
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You must not use IntrepidQ2 for any of the following activities:
              </p>
              
              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                3.1 Illegal Activities
              </h3>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Any activity that violates applicable laws or regulations</li>
                <li>Generating content that promotes illegal activities</li>
              </ul>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                3.2 Harmful Content
              </h3>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Generating content that is defamatory, obscene, or offensive</li>
                <li>Creating content that promotes discrimination or harassment</li>
                <li>Generating content that threatens or incites violence</li>
              </ul>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                3.3 Misuse of Service
              </h3>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Attempting to bypass rate limits or restrictions</li>
                <li>Using the service for commercial purposes without authorization</li>
                <li>Systematically extracting content for competing services</li>
                <li>Using automated tools to abuse the service</li>
              </ul>

              <h3 className="text-base md:text-lg font-serif font-semibold text-gray-800 mb-3 mt-4">
                3.4 Academic Integrity
              </h3>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Using generated questions or answers to cheat on actual examinations</li>
                <li>Presenting generated content as your own original work without attribution</li>
                <li>Sharing account credentials to circumvent usage limits</li>
              </ul>
            </div>

            {/* Section 4 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                4. Content Standards
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                All content generated through our service should:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Be used for legitimate educational purposes</li>
                <li>Respect intellectual property rights</li>
                <li>Not be used to mislead or deceive others</li>
                <li>Be appropriately cited when used in academic work</li>
              </ul>
            </div>

            {/* Section 5 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                5. User Responsibilities
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                You are responsible for:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Ensuring your use of the service complies with this policy</li>
                <li>Reporting any violations you become aware of</li>
                <li>Using the service in a manner that does not disrupt other users</li>
                <li>Maintaining the security of your account credentials</li>
              </ul>
            </div>

            {/* Section 6-8 */}
            <div>
              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 border-b pb-2">
                6. Enforcement
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We reserve the right to:
              </p>
              <ul className="list-disc pl-12 space-y-1 text-sm md:text-base text-gray-700">
                <li>Suspend or terminate accounts that violate this policy</li>
                <li>Remove content that violates this policy</li>
                <li>Report serious violations to appropriate authorities</li>
                <li>Take legal action when necessary</li>
              </ul>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                7. Reporting Violations
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                If you become aware of any violations of this policy, please contact us at: support@intrepidq.com
              </p>

              <h2 className="text-lg md:text-xl font-serif font-bold text-gray-800 mb-3 mt-6 border-b pb-2">
                8. Changes to This Policy
              </h2>
              <p className="text-sm md:text-base text-gray-700 leading-relaxed font-serif text-justify">
                <span className="inline-block w-8"></span>
                We may update this Acceptable Use Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
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
