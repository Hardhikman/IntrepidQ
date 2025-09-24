import React from 'react';
import Link from 'next/link';
import { AIntrepidQLogo } from '@/components/aintrepidq-logo';

const Footer = () => {
  return (
    <footer className="max-w-5xl mx-auto bg-white rounded-2xl shadow-lg border-2 border-indigo-200 mt-8 mb-4">
      <div className="px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <div className="flex justify-center md:justify-start mb-3">
              <AIntrepidQLogo size="medium" />
            </div>
            <p className="text-base text-indigo-800 font-semibold">
              born for the aspirants who are fearless to change
            </p>
            <p className="text-sm text-gray-500 mt-2">
              © {new Date().getFullYear()} IntrepidQ AI. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-5 md:gap-6">
            <Link 
              href="/about" 
              className="text-base text-gray-600 hover:text-orange-600 transition-colors"
            >
              About
            </Link>
            <Link 
              href="/docs" 
              className="text-base text-gray-600 hover:text-orange-600 transition-colors"
            >
              Documentation
            </Link>
            <Link 
              href="/privacy-policy" 
              className="text-base text-gray-600 hover:text-orange-600 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms-of-service" 
              className="text-base text-gray-600 hover:text-orange-600 transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              href="/blog" 
              className="text-base text-gray-600 hover:text-orange-600 transition-colors"
            >
              Blog
            </Link>
            <a 
              href="https://www.youtube.com/@intrepidqai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-base text-gray-600 hover:text-orange-600 transition-colors"
            >
              YouTube
            </a>
            <a 
              href="https://medium.com/@intrepidqAI" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-base text-gray-600 hover:text-orange-600 transition-colors"
            >
              Medium
            </a>
            <a 
              href="https://github.com/Hardhikman/IntrepidQ" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-base text-gray-600 hover:text-orange-600 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;