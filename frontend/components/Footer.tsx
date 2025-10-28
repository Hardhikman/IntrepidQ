import React from 'react';
import Link from 'next/link';
import { AIntrepidQLogo } from '@/components/aintrepidq-logo';
import { Youtube, Twitter, Mail } from 'lucide-react';
import { useTheme } from 'next-themes';

const Footer = () => {
  const { theme } = useTheme();

  return (
    <footer className="w-full bg-background relative text-foreground shadow-sm mb-2">
      {/* Circuit Board - Dark Pattern */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(34, 197, 94, 0.15) 19px, rgba(34, 197, 94, 0.15) 20px, transparent 20px, transparent 39px, rgba(34, 197, 94, 0.15) 39px, rgba(34, 197, 94, 0.15) 40px),
            repeating-linear-gradient(90deg, transparent, transparent 19px, rgba(34, 197, 94, 0.15) 19px, rgba(34, 197, 94, 0.15) 20px, transparent 20px, transparent 39px, rgba(34, 197, 94, 0.15) 39px, rgba(34, 197, 94, 0.15) 40px),
            radial-gradient(circle at 20px 20px, rgba(16, 185, 129, 0.18) 2px, transparent 2px),
            radial-gradient(circle at 40px 40px, rgba(16, 185, 129, 0.18) 2px, transparent 2px)
          `,
          backgroundSize: '40px 40px, 40px 40px, 40px 40px, 40px 40px',
        }}
      />
      
      {/* Footer content with relative positioning to appear above the background */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 rounded-xl border border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left flex flex-col items-center md:items-start">
            <div className="mb-2 hover:opacity-80 transition-opacity duration-200 cursor-pointer flex justify-center md:justify-start">
              <Link href="/">
                <AIntrepidQLogo size="small" />
              </Link>
            </div>
            <p className="text-sm text-green-500 font-medium text-center md:text-left">
              born for the aspirants who are fearless to change
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-center md:text-left">
              © {new Date().getFullYear()} IntrepidQ AI. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground mt-1 text-center md:text-left">
              Contact: <a href="mailto:hardhikmgowda@intrepidq.xyz" className="text-green-500 hover:text-green-600" title="Email"><Mail className="w-3 h-3 inline" /></a>
            </p>
          </div>
          
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2">
            
            <Link 
              href="/docs" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-green-500 transition-colors whitespace-nowrap text-center"
            >
              Docs
            </Link>
            <Link 
              href="/privacy-policy" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-green-500 transition-colors whitespace-nowrap text-center"
            >
              Privacy
            </Link>
            <Link 
              href="/terms-of-service" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-green-500 transition-colors whitespace-nowrap text-center"
            >
              Terms
            </Link>
            <Link 
              href="/blogs" 
              className="text-xs sm:text-sm text-muted-foreground hover:text-green-500 transition-colors whitespace-nowrap text-center"
            >
              Blogs
            </Link>
            <a 
              href="https://www.youtube.com/@intrepidqai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-muted-foreground hover:text-green-500 transition-colors flex items-center justify-center gap-1"
              title="YouTube"
            >
              <Youtube className="w-4 h-4" />
            </a>
            <a 
              href="https://x.com/IntrepidQai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs sm:text-sm text-muted-foreground hover:text-green-500 transition-colors flex items-center justify-center gap-1"
              title="X (Twitter)"
            >
              <Twitter className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;