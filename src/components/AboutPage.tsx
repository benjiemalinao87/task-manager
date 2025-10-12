import { CheckSquare, ArrowRight, Heart, Target, Zap, Shield } from 'lucide-react';

interface AboutPageProps {
  onGetStarted: () => void;
  onClose: () => void;
}

export function AboutPage({ onGetStarted, onClose }: AboutPageProps) {
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
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="inline-block bg-blue-500/30 px-6 py-2 rounded-full text-sm font-medium mb-6">
            Hi, I'm Benjie 👋
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            I Built Workoto Because I Was Tired of Proving Myself Every Single Day
          </h1>
          <p className="text-xl text-blue-100">
            Sound familiar? Keep reading.
          </p>
        </div>
      </section>

      {/* The Problem - Relatable Story */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">You're probably like me...</h2>
            
            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              You wake up every morning, ready to crush your tasks. You work hard. You deliver quality work. You meet deadlines.
            </p>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              But there's this nagging question that won't leave your mind:
            </p>

            <div className="bg-red-50 border-l-4 border-red-500 p-8 my-8 rounded-r-lg">
              <p className="text-2xl font-bold text-red-900 italic mb-4">
                "Is my boss/client even noticing what I'm doing?"
              </p>
              <p className="text-lg text-red-800">
                "Do they think I'm just... sitting around?"
              </p>
            </div>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              Then come the Slack messages:
            </p>

            <div className="bg-gray-100 p-6 rounded-lg my-6 space-y-4">
              <p className="text-gray-800 font-medium">💬 "Hey, what are you working on?"</p>
              <p className="text-gray-800 font-medium">💬 "Just checking in... any updates?"</p>
              <p className="text-gray-800 font-medium">💬 "Can you send me a status report?"</p>
            </div>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              You're in the middle of deep work. Your flow is <em>perfect</em>. And <strong>ping</strong>—there it is again.
            </p>

            <div className="bg-orange-50 border-l-4 border-orange-500 p-6 my-8 rounded-r-lg">
              <p className="text-lg text-orange-900">
                <strong>The worst part?</strong> You know they're not trying to micromanage. They're just... worried. They can't see what you're doing, so they assume you're not doing anything.
              </p>
            </div>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              And honestly? <strong>It's exhausting.</strong>
            </p>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              You spend more time <em>reporting</em> what you did than actually <em>doing</em> the work.
            </p>

            <div className="text-center my-12">
              <p className="text-3xl font-bold text-gray-900 mb-4">I've been there. And I had enough.</p>
            </div>
          </div>
        </div>
      </section>

      {/* The Turning Point */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">The Breaking Point</h2>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              It was a Tuesday morning (isn't it always?). I'd just finished a complex feature that took me all weekend to debug. I was proud. I was exhausted. I was ready to move on.
            </p>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              Then my phone buzzed:
            </p>

            <div className="bg-gray-100 p-6 rounded-lg my-6">
              <p className="text-gray-800 font-medium">💬 "Hey Benjie, just wondering what you've been up to this week. Can you send me a quick update?"</p>
            </div>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              I stared at that message for a solid minute.
            </p>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              I'd been busting my ass all week. I'd shipped features. Fixed bugs. Went above and beyond. And they had <strong>no idea</strong>.
            </p>

            <div className="bg-blue-50 border-l-4 border-blue-600 p-8 my-8 rounded-r-lg">
              <p className="text-xl font-bold text-blue-900 mb-4">
                That's when it hit me:
              </p>
              <p className="text-lg text-blue-800">
                "What if they knew <em>automatically</em>? What if I never had to write another status update again?"
              </p>
            </div>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              So I built Workoto.
            </p>
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">How Workoto Changes Everything</h2>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              Here's how my days look now:
            </p>

            <div className="space-y-6 my-8">
              <div className="bg-green-50 p-6 rounded-lg">
                <p className="text-lg font-bold text-green-900 mb-2">9:00 AM</p>
                <p className="text-gray-700">I create a task: "Refactor user authentication system"</p>
                <p className="text-green-700 mt-2">→ My client gets an email instantly. They know I'm working on it.</p>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <p className="text-lg font-bold text-green-900 mb-2">2:30 PM</p>
                <p className="text-gray-700">I mark it complete with notes on what I did</p>
                <p className="text-green-700 mt-2">→ They get a beautiful email with AI summary. No questions asked.</p>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <p className="text-lg font-bold text-green-900 mb-2">5:00 PM</p>
                <p className="text-gray-700">I clock out</p>
                <p className="text-green-700 mt-2">→ They get a daily summary of everything I accomplished.</p>
              </div>
            </div>

            <div className="bg-blue-600 text-white p-8 rounded-xl my-12">
              <p className="text-2xl font-bold mb-4 text-center">
                Zero status meetings. Zero "quick check-ins." Zero interruptions.
              </p>
              <p className="text-xl text-center opacity-90">
                Just pure, uninterrupted work.
              </p>
            </div>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              And you know what happened?
            </p>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              My clients <strong>trusted me more</strong>. They stopped checking in. They gave me bigger projects. They referred me to their friends.
            </p>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              Because transparency builds trust. And Workoto makes transparency automatic.
            </p>
          </div>
        </div>
      </section>

      {/* Why I Need You */}
      <section className="py-20 bg-gradient-to-br from-purple-600 to-purple-800 text-white">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-4xl font-bold mb-8 text-center">But Here's the Thing...</h2>
          
          <div className="prose prose-lg max-w-none text-white">
            <p className="text-xl mb-6 leading-relaxed">
              I'm just one freelancer. I built Workoto for <em>my</em> workflow, <em>my</em> clients, <em>my</em> pain points.
            </p>

            <p className="text-xl mb-6 leading-relaxed">
              But you're not me. You have different clients. Different workflows. Different needs.
            </p>

            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl my-8 border border-white/20">
              <p className="text-2xl font-bold mb-4 text-center">
                That's why I need early adopters like you.
              </p>
              <p className="text-lg text-center opacity-90">
                To tell me what's working. What's not. What's missing.
              </p>
            </div>

            <p className="text-xl mb-6 leading-relaxed">
              I'm offering <strong>100% free lifetime access</strong> to the first 500 people who sign up.
            </p>

            <p className="text-xl mb-6 leading-relaxed">
              Not because I'm feeling generous (okay, maybe a little). But because I genuinely believe that if we build this together, we'll create something that changes how freelancers and remote workers operate.
            </p>

            <p className="text-xl mb-6 leading-relaxed">
              Something that gives you your time back. Your peace of mind back. Your confidence back.
            </p>

            <div className="text-center my-12">
              <button
                onClick={onGetStarted}
                className="bg-white text-purple-600 px-12 py-5 rounded-lg font-bold text-2xl hover:bg-purple-50 transition-colors shadow-2xl inline-flex items-center gap-3"
              >
                Join Me as an Early Adopter - FREE <ArrowRight className="w-7 h-7" />
              </button>
              <p className="mt-6 text-purple-200 text-sm">
                No credit card • 2-minute signup • Free forever
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">What We're Building Together</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-blue-50 p-8 rounded-xl">
              <Heart className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Respect for Your Time</h3>
              <p className="text-gray-700">
                Every feature in Workoto saves you time. If it doesn't, we won't build it. Your time is sacred, and status reports shouldn't steal it.
              </p>
            </div>

            <div className="bg-green-50 p-8 rounded-xl">
              <Target className="w-12 h-12 text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Transparency by Default</h3>
              <p className="text-gray-700">
                Clients should never wonder what you're doing. Automatic updates build trust, reduce anxiety, and give you the freedom to focus on great work.
              </p>
            </div>

            <div className="bg-purple-50 p-8 rounded-xl">
              <Zap className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Simple Over Complex</h3>
              <p className="text-gray-700">
                We're not building another bloated project management tool. Workoto does one thing incredibly well: prove your productivity effortlessly.
              </p>
            </div>

            <div className="bg-orange-50 p-8 rounded-xl">
              <Shield className="w-12 h-12 text-orange-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Built by a Freelancer, for Freelancers</h3>
              <p className="text-gray-700">
                I live this life every day. I know the struggles, the wins, the anxiety. Workoto is built with empathy and understanding.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final Personal Appeal */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="prose prose-lg max-w-none">
            <h2 className="text-4xl font-bold text-gray-900 mb-8 text-center">My Ask Is Simple</h2>
            
            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              Give Workoto a try. Use it for a week. See if it changes how your clients see you.
            </p>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              If you love it, tell me what's working. If you hate something, tell me that too. I'll listen. I'll fix it. I'll make it better.
            </p>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed">
              Because at the end of the day, we're all just trying to do great work without the constant anxiety of wondering if anyone notices.
            </p>

            <div className="bg-blue-600 text-white p-12 rounded-xl my-12 text-center">
              <p className="text-3xl font-bold mb-6">
                Let's build something that gives us our confidence back.
              </p>
              <button
                onClick={onGetStarted}
                className="bg-white text-blue-600 px-12 py-5 rounded-lg font-bold text-2xl hover:bg-blue-50 transition-colors shadow-2xl inline-flex items-center gap-3"
              >
                I'm In - Sign Me Up Free <ArrowRight className="w-7 h-7" />
              </button>
              <p className="mt-6 text-blue-200">
                Join 237 other early adopters who've already claimed their free spot
              </p>
            </div>

            <p className="text-xl text-gray-700 mb-6 leading-relaxed text-center">
              Thanks for reading this far. That means something to me.
            </p>

            <div className="text-center mt-12">
              <p className="text-2xl font-bold text-gray-900">— Benjie Malinao</p>
              <p className="text-lg text-gray-600 mt-2">Founder, Workoto</p>
              <p className="text-sm text-gray-500 mt-2">Sydney, Australia 🇦🇺</p>
              <p className="text-sm text-gray-500 mt-1">
                <a href="mailto:hello@workoto.app" className="text-blue-600 hover:underline">hello@workoto.app</a>
              </p>
            </div>
          </div>
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

