import React from 'react';
import Link from 'next/link';
import { AIntrepidQLogo } from '@/components/aintrepidq-logo';
import { Youtube, Github, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="w-full bg-white border border-gray-200 rounded-xl shadow-sm mt-6 mb-2">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left flex flex-col items-center md:items-start">
            <div className="mb-2">
              <AIntrepidQLogo size="small" />
            </div>
            <p className="text-sm text-indigo-800 font-medium text-center md:text-left">
              born for the aspirants who are fearless to change
            </p>
            <p className="text-xs text-gray-600 mt-1">
              © {new Date().getFullYear()} IntrepidQ AI. All rights reserved.
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Contact: <a href="mailto:hardhikmgowda@intrepidq.xyz" className="text-indigo-600 hover:text-indigo-800" title="Email"><Mail className="w-3 h-3 inline" /></a>
            </p>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            <Link 
              href="/about" 
              className="text-xs sm:text-sm text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center"
            >
              About
            </Link>
            <Link 
              href="/docs" 
              className="text-xs sm:text-sm text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center"
            >
              Docs
            </Link>
            <Link 
              href="/privacy-policy" 
              className="text-xs sm:text-sm text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center"
            >
              Privacy
            </Link>
            <Link 
              href="/terms-of-service" 
              className="text-xs sm:text-sm text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center"
            >
              Terms
            </Link>
            <Link 
              href="/blog" 
              className="text-xs sm:text-sm text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center"
            >
              Blogs
            </Link>
            <a 
              href="https://www.youtube.com/@intrepidqai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-gray-700 hover:text-orange-600 transition-colors flex items-center justify-center gap-1"
              title="YouTube"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a 
              href="https://medium.com/@intrepidqAI" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-gray-700 hover:text-orange-600 transition-colors whitespace-nowrap text-center"
            >
              Medium
            </a>
            <a 
              href="https://github.com/Hardhikman/IntrepidQ" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-gray-700 hover:text-orange-600 transition-colors flex items-center justify-center gap-1"
              title="GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;