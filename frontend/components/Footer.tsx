import React from 'react';
import Link from 'next/link';
import { AIntrepidQLogo } from '@/components/aintrepidq-logo';
import { Youtube, Github, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl shadow-lg mt-8 mb-4">
      <div className="max-w-5xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left flex flex-col items-center md:items-start">
            <div className="mb-3">
              <AIntrepidQLogo size="medium" />
            </div>
            <p className="text-base text-indigo-800 font-semibold text-center md:text-left">
              born for the aspirants who are fearless to change
            </p>
            <p className="text-sm text-gray-600 mt-2">
              © {new Date().getFullYear()} IntrepidQ AI. All rights reserved.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Contact Email : <a href="mailto:hardhikmgowda@intrepidq.xyz" className="text-indigo-600 hover:text-indigo-800" title="Email"><Mail className="w-4 h-4 inline" /></a>
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <Link 
              href="/about" 
              className="text-base text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center md:text-left"
            >
              About
            </Link>
            <Link 
              href="/docs" 
              className="text-base text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center md:text-left"
            >
              Documentation
            </Link>
            <Link 
              href="/privacy-policy" 
              className="text-base text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center md:text-left"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/terms-of-service" 
              className="text-base text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center md:text-left"
            >
              Terms of Service
            </Link>
            <Link 
              href="/blog" 
              className="text-base text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center md:text-left"
            >
              Blogs
            </Link>
            <a 
              href="https://www.youtube.com/@intrepidqai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-base text-gray-700 hover:text-orange-600 transition-colors flex items-center justify-center md:justify-start gap-1"
              title="YouTube"
            >
              <Youtube className="w-5 h-5" />
            </a>
            <a 
              href="https://medium.com/@intrepidqAI" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-base text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center md:text-left"
            >
              Medium
            </a>
            <a 
              href="https://github.com/Hardhikman/IntrepidQ" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-base text-gray-700 hover:text-orange-600 transition-colors flex items-center justify-center md:justify-start gap-1"
              title="GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

