import { CheckCircle2, X, Zap, CheckSquare, ArrowRight } from 'lucide-react';

interface PricingPageProps {
  onGetStarted: () => void;
  onClose: () => void;
}

export function PricingPage({ onGetStarted, onClose }: PricingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-gradient-to-br from-blue-600 to-blue-800 text-white sticky top-0 z-40 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <button onClick={onClose} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <CheckSquare className="w-8 h-8" />
            <span className="text-xl font-bold">Workoto</span>
          </button>
          <button onClick={onGetStarted} className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
            Get Started Free
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20">
        <div className="container mx-auto px-4 text-center max-w-4xl">
          <div className="inline-block bg-green-500 px-6 py-2 rounded-full text-sm font-bold mb-6 animate-pulse">
            🎉 EARLY ADOPTER PROGRAM - 100% FREE
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Be an early adopter and get <strong>lifetime free access</strong> to all premium features.
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            
            {/* Early Adopter - FREE */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-8 border-4 border-green-500 relative transform hover:scale-105 transition-transform shadow-2xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg">
                🔥 LIMITED TIME - EARLY ADOPTER
              </div>
              
              <div className="text-center mb-8 mt-4">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Early Adopter</h3>
                <div className="flex items-baseline justify-center gap-2 mb-4">
                  <span className="text-6xl font-bold text-green-600">FREE</span>
                  <span className="text-gray-600">forever</span>
                </div>
                <p className="text-gray-700 font-medium">
                  Join now and lock in free access for life!
                </p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Unlimited tasks</strong> and projects</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>AI-powered summaries</strong> for every task</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Automatic email notifications</strong> to clients</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Time tracking</strong> with clock in/out</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Asana integration</strong> - sync tasks automatically</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Custom email integrations</strong> (Resend, SendGrid)</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Daily & weekly reports</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Complete task history</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                  <span className="text-gray-700"><strong>Priority support</strong> - Help us shape the product!</span>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
                  <span className="text-gray-900 font-bold">ALL future premium features included!</span>
                </div>
              </div>

              <button
                onClick={onGetStarted}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
              >
                Claim Your Free Spot <ArrowRight className="w-5 h-5" />
              </button>

              <p className="text-center text-sm text-gray-600 mt-4">
                ⏰ Limited to first 500 sign-ups • No credit card required
              </p>
            </div>

            {/* Future Pro Plan */}
            <div className="bg-white rounded-2xl p-8 border-2 border-gray-200 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gray-500 text-white px-6 py-2 rounded-full text-sm font-bold">
                FUTURE PRICING
              </div>

              <div className="text-center mb-8 mt-4">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">Pro</h3>
                <div className="flex items-baseline justify-center gap-2 mb-4">
                  <span className="text-6xl font-bold text-gray-900">$29</span>
                  <span className="text-gray-600">/month</span>
                </div>
                <p className="text-gray-600">
                  For new users after early adopter program ends
                </p>
              </div>

              <div className="space-y-4 mb-8 opacity-70">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-600">All features included</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-600">Everything Early Adopters get</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-600">Same great experience</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-gray-400 flex-shrink-0 mt-1" />
                  <span className="text-gray-600">Standard support</span>
                </div>
              </div>

              <button
                disabled
                className="w-full bg-gray-300 text-gray-500 font-bold py-4 px-8 rounded-lg text-lg cursor-not-allowed"
              >
                Not Available Yet
              </button>

              <p className="text-center text-sm text-gray-500 mt-4">
                💡 Early Adopters pay $0 forever
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Why Early Adopter */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Why We're Offering Free Early Adopter Access
          </h2>

          <div className="space-y-8">
            <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-r-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-2">1. We Need Your Feedback</h3>
              <p className="text-gray-700">
                As an early adopter, you'll help shape Workoto into the perfect tool for freelancers and remote workers. Your insights are invaluable.
              </p>
            </div>

            <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-r-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-2">2. You're Taking a Chance on Us</h3>
              <p className="text-gray-700">
                We're new, and you're trusting us with your workflow. That deserves to be rewarded with free lifetime access.
              </p>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-r-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-2">3. We Want Loyal Users, Not Just Customers</h3>
              <p className="text-gray-700">
                By giving you free access forever, we're investing in a long-term relationship. You'll be part of the Workoto family.
              </p>
            </div>

            <div className="bg-orange-50 border-l-4 border-orange-600 p-6 rounded-r-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-2">4. Build a Community of Champions</h3>
              <p className="text-gray-700">
                Early adopters become our biggest advocates. If you love Workoto, you'll tell others—and that's worth more than any subscription fee.
              </p>
            </div>
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={onGetStarted}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-12 rounded-lg text-xl transition-colors shadow-lg hover:shadow-xl inline-flex items-center gap-3"
            >
              Join as Early Adopter - FREE Forever <ArrowRight className="w-6 h-6" />
            </button>
            <p className="mt-4 text-gray-600">
              No credit card • 2-minute signup • Cancel anytime (but why would you? It's free!)
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h2 className="text-4xl font-bold text-center text-gray-900 mb-12">
            Early Adopter FAQ
          </h2>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Will I really get free access forever?
              </h3>
              <p className="text-gray-600">
                Yes! 100%. Once you sign up as an early adopter, you'll never pay a dime. Even when we launch paid plans, you're grandfathered in for life.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Are there any hidden fees or catches?
              </h3>
              <p className="text-gray-600">
                Nope. Zero. Zilch. We don't even ask for your credit card. The only "catch" is we'd love your feedback to make Workoto better.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                What if I sign up later?
              </h3>
              <p className="text-gray-600">
                You'll miss the early adopter program and have to pay $29/month when we launch paid plans. Don't wait—this opportunity won't last!
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Can I use this for multiple clients?
              </h3>
              <p className="text-gray-600">
                Absolutely! Create unlimited tasks, add as many client emails as you need, and manage everything in one place—all free forever.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                How long will the early adopter program last?
              </h3>
              <p className="text-gray-600">
                We're limiting it to the first 500 sign-ups or until we feel we have enough feedback to launch. Once it closes, it's gone forever.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-green-600 to-green-800 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-5xl font-bold mb-6">
            Don't Pay $348/Year. Get It Free.
          </h2>
          <p className="text-2xl text-green-100 mb-8">
            That's what you'll save every year as an early adopter. Forever.
          </p>
          <button
            onClick={onGetStarted}
            className="bg-white text-green-600 px-12 py-5 rounded-lg font-bold text-2xl hover:bg-green-50 transition-colors shadow-2xl inline-flex items-center gap-3"
          >
            Claim Your Free Lifetime Access <ArrowRight className="w-7 h-7" />
          </button>
          <p className="mt-6 text-green-200 text-sm">
            ⏰ Limited to first 500 early adopters • No credit card required • Join in 2 minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center">
          <button onClick={onClose} className="inline-flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
            <CheckSquare className="w-5 h-5" />
            <span className="font-bold">Workoto</span>
          </button>
          <p className="mt-4 text-sm">&copy; 2025 Workoto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

