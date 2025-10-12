import { CheckCircle2, Clock, Mail, BarChart3, Zap, Shield, ArrowRight, CheckSquare } from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <header className="bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <nav className="container mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-8 h-8" />
            <span className="text-xl font-bold">Workoto</span>
          </div>
          <button onClick={onGetStarted} className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
            Sign In
          </button>
        </nav>

        <div className="container mx-auto px-4 py-20 text-center max-w-5xl">
          <div className="inline-block bg-blue-500/30 px-4 py-2 rounded-full text-sm font-medium mb-6">
            Built for Freelancers & Remote Workers
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Prove Your Productivity.<br />
            Give Your Clients Peace of Mind.
          </h1>

          <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
            The task manager that automatically keeps your clients updated—so they know exactly what you're working on and when it's done.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <button onClick={onGetStarted} className="bg-white text-blue-600 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-lg">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </button>
            <button className="border-2 border-white text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-white/10 transition-colors">
              Watch Demo
            </button>
          </div>

          <p className="text-blue-200 text-sm">No credit card required • 14-day free trial • Cancel anytime</p>
        </div>
      </header>

      {/* Problem Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Tired of "What Are You Working On?" Messages?
            </h2>
            <p className="text-xl text-gray-600">
              You're doing great work, but your clients can't see it.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">😰</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Constant Check-ins
              </h3>
              <p className="text-gray-600">
                Clients messaging you every few hours asking for updates, breaking your focus.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤔</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Trust Issues
              </h3>
              <p className="text-gray-600">
                Clients questioning if you're actually working or how you're spending their money.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">😓</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Lost Opportunities
              </h3>
              <p className="text-gray-600">
                Missing out on long-term contracts because clients don't feel confident in your process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Automatic Transparency That Builds Trust
            </h2>
            <p className="text-xl text-gray-600">
              Workoto works in the background, keeping your clients informed without any extra effort from you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <div className="bg-gradient-to-br from-blue-50 to-gray-50 rounded-2xl p-8 shadow-lg">
                <div className="bg-white rounded-lg p-6 mb-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-500">New Task Created</span>
                  </div>
                  <p className="font-semibold text-gray-900">Client Dashboard Redesign</p>
                  <p className="text-sm text-gray-600 mt-2">Started working on modernizing the client dashboard with new UI components...</p>
                </div>
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-500">Task Completed</span>
                  </div>
                  <p className="font-semibold text-gray-900">Homepage Bug Fix</p>
                  <p className="text-sm text-gray-600 mt-2">Fixed the mobile navigation issue and tested across all devices...</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Instant Task Notifications</h3>
                  <p className="text-gray-600">
                    Your client receives an email the moment you create a task—they see what you're working on in real-time.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Completion Updates</h3>
                  <p className="text-gray-600">
                    When you finish a task, they get notified instantly. No more "Did you finish that?" messages.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">AI-Powered Summaries</h3>
                  <p className="text-gray-600">
                    Every notification includes a smart summary of your work, making you look professional and organized.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-16 bg-white border-y border-gray-200">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-blue-600 mb-2 uppercase tracking-wide">Integrations</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Works With Your Favorite Tools
            </h2>
            <p className="text-xl text-gray-600">
              Seamlessly connect with the tools you already use
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {/* Asana */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-300 hover:shadow-lg transition-all group">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-orange-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="7" cy="7" r="3"/>
                    <circle cx="17" cy="7" r="3"/>
                    <circle cx="12" cy="17" r="3"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Asana</h3>
                <p className="text-gray-600 text-sm">
                  Auto-sync tasks to your Asana projects. Keep everything in one place.
                </p>
              </div>
            </div>

            {/* Resend */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-300 hover:shadow-lg transition-all group">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Mail className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Resend</h3>
                <p className="text-gray-600 text-sm">
                  Modern email API for reliable delivery. Send beautiful notifications instantly.
                </p>
              </div>
            </div>

            {/* SendGrid */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-blue-300 hover:shadow-lg transition-all group">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">SendGrid</h3>
                <p className="text-gray-600 text-sm">
                  Enterprise email delivery at scale. Trusted by thousands of companies.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-500 text-sm">
              ⚡ Connect in under 5 minutes • 🔒 Secure & encrypted • 🔄 Real-time syncing
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Stay Organized
            </h2>
            <p className="text-xl text-gray-600">
              A powerful yet simple task manager designed for how freelancers actually work.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Clock className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Time Tracking</h3>
              <p className="text-gray-600">Clock in and out with automatic session tracking. Show clients exactly when you're working.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Mail className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Email Integrations</h3>
              <p className="text-gray-600">Works with SendGrid and Resend. Set it up once and forget about it.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Zap className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Quick Task Creation</h3>
              <p className="text-gray-600">Add tasks in seconds. No complicated forms or unnecessary fields.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <BarChart3 className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Daily Reports</h3>
              <p className="text-gray-600">Automatic end-of-day summaries sent to your clients with everything you accomplished.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <CheckSquare className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Task History</h3>
              <p className="text-gray-600">Complete archive of all your work. Perfect for invoicing and performance reviews.</p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <Shield className="w-10 h-10 text-blue-600 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">Secure & Private</h3>
              <p className="text-gray-600">Your data is encrypted and secure. Only you and your designated clients have access.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Loved by Freelancers Who Get It
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "My clients love getting updates without having to ask. I've landed 3 long-term contracts since using Workoto."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  JS
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Jessica S.</p>
                  <p className="text-sm text-gray-600">Web Developer</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Finally, a way to show I'm actually working without constant screenshots or check-ins. It's a game changer."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  MC
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Michael C.</p>
                  <p className="text-sm text-gray-600">Designer</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xl">★</span>
                ))}
              </div>
              <p className="text-gray-700 mb-4">
                "Takes 5 seconds to create a task and my clients are always in the loop. Best investment I've made this year."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  AR
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Alex R.</p>
                  <p className="text-sm text-gray-600">Marketing Consultant</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-blue-600 text-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Why Freelancers Choose Workoto
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold mb-2">Build Client Trust Automatically</h3>
                <p className="text-blue-100">
                  When clients see real-time updates, they trust you more. Trust leads to longer contracts and better rates.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold mb-2">Stop Interruptions</h3>
                <p className="text-blue-100">
                  No more "quick check-in" calls or messages. Your clients get updates automatically, so you can focus on deep work.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold mb-2">Look More Professional</h3>
                <p className="text-blue-100">
                  AI summaries make every task look polished. You'll come across as organized and detail-oriented.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-xl font-bold mb-2">Win More Projects</h3>
                <p className="text-blue-100">
                  Show potential clients your system for transparency. It's a huge competitive advantage.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Objection Handling */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Won't my clients find constant emails annoying?
              </h3>
              <p className="text-gray-600">
                Actually, the opposite. Clients love transparency. You can also customize notification preferences—they can choose daily digests instead of real-time updates.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Is this complicated to set up?
              </h3>
              <p className="text-gray-600">
                No. Connect your email service (we support SendGrid and Resend), add your client's email, and you're done. Takes less than 5 minutes.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                What if I work with multiple clients?
              </h3>
              <p className="text-gray-600">
                Perfect for that. Each task can be tagged to a specific client, so everyone only sees their own updates.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Do I need to change how I work?
              </h3>
              <p className="text-gray-600">
                Not at all. Just add tasks as you normally would. Workoto handles the rest automatically in the background.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 text-white">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Ready to Build Unshakeable Client Trust?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of freelancers who've stopped defending their productivity and started proving it.
          </p>

          <button onClick={onGetStarted} className="bg-white text-blue-600 px-10 py-5 rounded-lg font-bold text-xl hover:bg-blue-50 transition-colors inline-flex items-center gap-2 shadow-xl mx-auto mb-6">
            Start Your Free Trial <ArrowRight className="w-6 h-6" />
          </button>

          <p className="text-blue-200 mb-8">14-day free trial • No credit card required • Cancel anytime</p>

          <div className="flex flex-wrap justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Setup in 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>No long-term commitment</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              <span>Cancel with 1 click</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 text-white mb-4">
                <CheckSquare className="w-6 h-6" />
                <span className="font-bold">Workoto</span>
              </div>
              <p className="text-sm">
                The task manager that proves your productivity to clients.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Features</a></li>
                <li><a href="#" className="hover:text-white">Pricing</a></li>
                <li><a href="#" className="hover:text-white">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About</a></li>
                <li><a href="#" className="hover:text-white">Privacy</a></li>
                <li><a href="#" className="hover:text-white">Terms</a></li>
              </ul>
              <div className="mt-6 space-y-2 text-sm">
                <p className="text-white font-semibold mb-2">Contact</p>
                <p>280 Merrylands Road<br />Sydney, NSW 2160<br />Australia</p>
                <p><a href="tel:+61455221300" className="hover:text-white">+61 455 221 300</a></p>
                <p><a href="mailto:hello@workoto.app" className="hover:text-white">hello@workoto.app</a></p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2025 Workoto. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
