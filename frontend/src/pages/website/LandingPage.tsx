import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Footer } from '../../components/shared/Footer';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <header className="sticky sm:absolute top-0 left-0 right-0 z-20 px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center bg-white/95 sm:bg-transparent backdrop-blur-xs w-full border-b sm:border-b-0 border-gray-100">
        <Link to="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity min-h-[44px] shrink-0">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">M</div>
          <span className="font-bold text-gray-900 text-lg sm:text-xl tracking-tight">MediKiosk</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <Link to="/demo" className="text-gray-600 font-medium hover:text-teal-600 text-xs sm:text-sm hidden md:inline">Demo</Link>
          <Link to="/login" className="text-gray-600 font-medium hover:text-teal-600 text-xs sm:text-sm">Login</Link>
          <Link to="/register">
            <Button variant="primary" size="sm" className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 min-h-[38px]">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-8 pb-16 sm:pt-32 sm:pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-teal-50 -z-10" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 85%, 0% 100%)' }}></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 tracking-tight mb-4 sm:mb-6 [overflow-wrap:anywhere] break-words">
            Your Health Story.<br />
            <span className="text-teal-600">Understood Before You Enter.</span>
          </h1>
          <p className="text-sm sm:text-lg md:text-2xl text-gray-600 mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed">
            AI-powered multilingual clinical history taking, intelligent medical document digitization, and emergency ambulance assistance in one connected healthcare platform.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 max-w-md sm:max-w-none mx-auto">
            <Link to="/register"><Button size="lg" variant="primary" className="w-full sm:w-auto">Start Patient Journey</Button></Link>
            <Link to="/login"><Button size="lg" variant="outline" className="w-full sm:w-auto">🚑 Book an Ambulance</Button></Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">A Complete Healthcare Ecosystem</h2>
            <p className="text-lg text-gray-600">Designed for high-volume Indian hospitals to reduce wait times and improve care.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard 
              icon="🗣️"
              title="Multilingual AI Interview"
              desc="Natural voice-based clinical history taking in English, Hindi, Marathi, Tamil, Telugu, and Bengali."
            />
            <FeatureCard 
              icon="📄"
              title="Document Digitization"
              desc="Upload past prescriptions and lab reports. Our AI extracts and organizes your medical history."
            />
            <FeatureCard 
              icon="🌿"
              title="Ayurvedic Assessment"
              desc="Integrated AYUSH history capturing Prakriti, lifestyle, and dietary habits for holistic care."
            />
            <FeatureCard 
              icon="🚨"
              title="Emergency Detection"
              desc="Real-time red flag detection during case taking to immediately notify hospital triage."
            />
            <FeatureCard 
              icon="🚑"
              title="Ambulance Network"
              desc="Uber-like live ambulance booking and tracking with pre-arrival hospital alerts."
            />
            <FeatureCard 
              icon="👨‍⚕️"
              title="Doctor Dashboard"
              desc="Physician-ready structured summaries to maximize consultation time for reasoning and care."
            />
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <Step number="1" title="Register & Consent" desc="Secure ABDM-ready consent framework." />
            <Step number="2" title="AI Conversation" desc="Answer adaptive clinical questions via voice or touch." />
            <Step number="3" title="Auto-Summary" desc="AI structures the history and extracts document data." />
            <Step number="4" title="Doctor Review" desc="Clinician verifies the history and proceeds with care." />
          </div>
        </div>
      </section>

      {/* Shared Responsive Footer */}
      <Footer />
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: string, title: string, desc: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{desc}</p>
    </div>
  );
}

function Step({ number, title, desc }: { number: string, title: string, desc: string }) {
  return (
    <div className="text-center relative">
      <div className="w-12 h-12 bg-teal-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4 z-10 relative shadow-md">
        {number}
      </div>
      <h4 className="text-lg font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-gray-600 text-sm">{desc}</p>
    </div>
  );
}
