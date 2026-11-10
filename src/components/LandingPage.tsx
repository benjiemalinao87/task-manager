import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowRight, Check, CheckSquare, ChevronDown, Play, X } from 'lucide-react';
import { PricingPage } from './PricingPage';
import { AboutPage } from './AboutPage';

interface LandingPageProps {
  onGetStarted: () => void;
}

const SANS = "'Familjen Grotesk', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const DEMO_VIDEO = 'https://pub-fa3ef00e8d754636901866f47a0dd88f.r2.dev/Workoto%20-%20Made%20with%20Clipchamp.mp4';

const focusRing =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600';

function formatClock(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

/** Seconds since the page opened, ticking once a second like the in-app timers. */
function useSecondsOnPage() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);
  return seconds;
}

interface ShotProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  eager?: boolean;
  dark?: boolean;
  className?: string;
}

/** A real app screenshot in a plain window frame. */
function Shot({ src, alt, width, height, eager, dark, className = '' }: ShotProps) {
  return (
    <figure
      className={`overflow-hidden rounded-xl border shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)] ${
        dark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white'
      } ${className}`}
    >
      <div
        aria-hidden="true"
        className={`flex items-center gap-1.5 border-b px-4 py-2.5 ${
          dark ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-slate-50'
        }`}
      >
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-full ${dark ? 'bg-slate-600' : 'bg-slate-300'}`} />
        ))}
      </div>
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block h-auto w-full"
      />
    </figure>
  );
}

/** The message a client would have sent. Each feature answers one of these. */
function ClientMessage({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <p
      className={`inline-block rounded-2xl rounded-bl-sm px-4 py-2.5 text-base font-medium ${
        dark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'
      }`}
    >
      <span className="sr-only">Client message: </span>
      {children}
    </p>
  );
}

function Bullets({ items, dark }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <Check
            aria-hidden="true"
            className={`mt-1 h-5 w-5 flex-shrink-0 ${dark ? 'text-yellow-400' : 'text-blue-600'}`}
          />
          <span className={dark ? 'text-slate-200' : 'text-slate-700'}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

const clientEmails = [
  {
    time: '9:02 AM',
    subject: 'Clocked In',
    preview: 'Maya just started a work session.',
  },
  {
    time: '9:06 AM',
    subject: 'New Task: Redesign pricing page for Harbor Coffee',
    preview:
      'Reworking the pricing page into three clear tiers with an annual billing toggle, covering desktop and mobile. Estimated time: 3 hours.',
  },
  {
    time: '5:31 PM',
    subject: 'Daily Work Report - Nov 10, 2026',
    preview: 'Session 7h 12m. Homepage hero copy and layout: estimated 2 hours, actual 1h 48m.',
  },
];

const faqs = [
  {
    q: 'Will my client get too many emails?',
    a: 'You decide. Switch off the email for each new task in Settings and your client still gets the daily report when you clock out.',
  },
  {
    q: 'How long does setup take?',
    a: 'Create an account, enter the email address that should receive your updates, and add your first task. Emails start sending straight away. If you would rather send from your own SendGrid or Resend account, connect it in Settings.',
  },
  {
    q: 'What if I walk away with a timer running?',
    a: 'While you are clocked in, Workoto watches for activity. After 10 minutes with none it asks if you are still working, and if you do not answer within a minute it pauses your session and your task timers.',
  },
  {
    q: 'Does it work for a team?',
    a: 'Yes. Invite people to your workspace as admins or members and assign tasks to them. Members see only their own tasks. Owners and admins see everyone’s tasks, hours and completion rate.',
  },
  {
    q: 'I already keep tasks in Asana. Do I have to start over?',
    a: 'No. Connect Asana and import the tasks you want to track.',
  },
];

const testimonials = [
  {
    quote:
      "My clients love getting updates without having to ask. I've landed 3 long-term contracts since using Workoto.",
    name: 'Jessica S.',
    role: 'Web Developer',
  },
  {
    quote:
      "Finally, a way to show I'm actually working without constant screenshots or check-ins. It's a game changer.",
    name: 'Michael C.',
    role: 'Designer',
  },
  {
    quote:
      'Takes 5 seconds to create a task and my clients are always in the loop. Best investment I’ve made this year.',
    name: 'Alex R.',
    role: 'Marketing Consultant',
  },
];

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [showPricing, setShowPricing] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const secondsOnPage = useSecondsOnPage();

  useEffect(() => {
    if (!showVideoModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowVideoModal(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showVideoModal]);

  if (showPricing) {
    return <PricingPage onGetStarted={onGetStarted} onClose={() => setShowPricing(false)} />;
  }

  if (showAbout) {
    return <AboutPage onGetStarted={onGetStarted} onClose={() => setShowAbout(false)} />;
  }

  const primaryButton = `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-blue-600 px-6 py-3.5 text-lg font-semibold text-white transition-colors hover:bg-blue-700 ${focusRing}`;

  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased" style={{ fontFamily: SANS }}>
      {/* Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav
          aria-label="Main"
          className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <CheckSquare aria-hidden="true" className="h-5 w-5" />
            </span>
            <span className="text-xl font-bold tracking-tight">Workoto</span>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href="#how-it-works"
              className={`hidden rounded-md px-3 py-2 font-medium text-slate-600 hover:text-slate-900 md:inline-block ${focusRing}`}
            >
              How it works
            </a>
            <a
              href="#teams"
              className={`hidden rounded-md px-3 py-2 font-medium text-slate-600 hover:text-slate-900 md:inline-block ${focusRing}`}
            >
              For teams
            </a>
            <button
              onClick={() => setShowPricing(true)}
              className={`hidden rounded-md px-3 py-2 font-medium text-slate-600 hover:text-slate-900 sm:inline-block ${focusRing}`}
            >
              Pricing
            </button>
            <button
              onClick={onGetStarted}
              className={`whitespace-nowrap rounded-md px-3 py-2 font-medium text-slate-600 hover:text-slate-900 ${focusRing}`}
            >
              Sign in
            </button>
            <button
              onClick={onGetStarted}
              className={`whitespace-nowrap rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-blue-700 ${focusRing}`}
            >
              <span className="sm:hidden">Sign up free</span>
              <span className="hidden sm:inline">Create free account</span>
            </button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="overflow-hidden bg-[#f3f6fe]">
          <div className="mx-auto max-w-6xl px-5 pt-12 md:pt-16">
            <div className="grid items-end gap-10 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-14">
              <div>
                <h1 className="text-[2.6rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-6xl lg:text-[4.25rem]">
                  Do the work.
                  <br />
                  Workoto keeps your client posted.
                </h1>
                <p className="mt-6 max-w-xl text-xl leading-relaxed text-slate-600">
                  Add a task and your client gets an email saying what you have started. Clock out and they
                  get the day&rsquo;s report with the hours. You stop writing status updates.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <button onClick={onGetStarted} className={primaryButton}>
                    Create free account <ArrowRight aria-hidden="true" className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setShowVideoModal(true)}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-6 py-3.5 text-lg font-semibold text-slate-800 transition-colors hover:border-slate-400 ${focusRing}`}
                  >
                    <Play aria-hidden="true" className="h-5 w-5" /> Watch the demo
                  </button>
                </div>
                <p className="mt-4 text-slate-500">Free during early access. No credit card needed.</p>
              </div>

              {/* A working clock, the same kind the app puts on every task */}
              <div className="rounded-2xl bg-slate-900 p-6 text-white sm:p-7">
                <p className="flex items-center gap-2 font-medium text-slate-300">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  You have been on this page for
                </p>
                <p
                  className="mt-3 text-5xl font-bold tabular-nums tracking-tight text-yellow-400 sm:text-6xl"
                  style={{ fontFamily: MONO }}
                  role="timer"
                  aria-label="Time on this page"
                >
                  {formatClock(secondsOnPage)}
                </p>
                <p className="mt-4 leading-relaxed text-slate-300">
                  Workoto puts a clock like this on every task, so the hours you report are the hours you
                  worked.
                </p>
              </div>
            </div>

            <div className="relative mt-10 max-h-[30rem] overflow-hidden rounded-t-xl md:mt-12 md:max-h-[44rem]">
              <Shot
                src="/landing/app-tasks.webp"
                alt="Workoto task list: a task with a running timer at 1 hour 42 minutes, an AI summary, and four more tasks each with their own timer and assignee."
                width={2000}
                height={1637}
                eager
                className="rounded-b-none border-b-0"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#f3f6fe] to-transparent"
              />
            </div>
          </div>
        </section>

        {/* How it works: three client questions, each answered by the product */}
        <section id="how-it-works" className="scroll-mt-20 py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.02em] md:text-5xl">
              Three messages your clients can stop sending
            </h2>
            <p className="mt-5 max-w-2xl text-xl leading-relaxed text-slate-600">
              Check-ins break your focus, and they usually mean the client cannot see the work. Workoto
              shows it to them as it happens.
            </p>

            {/* What are you working on? */}
            <div className="mt-16 grid items-center gap-10 md:mt-20 lg:grid-cols-2 lg:gap-16">
              <div>
                <ClientMessage>&ldquo;Hey, what are you working on today?&rdquo;</ClientMessage>
                <h3 className="mt-5 text-3xl font-bold tracking-[-0.01em]">They hear it from Workoto first</h3>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
                  When you add a task, your client gets an email with what you are doing and how long you
                  expect it to take. An AI summary tidies up your notes, so a task called &ldquo;fix nav
                  bug&rdquo; still reads clearly.
                </p>
                <Bullets
                  items={[
                    'An email for each new task, with an AI-written summary',
                    'A note when you clock in for the day',
                    'A daily report when you clock out: every task, estimated and actual time',
                  ]}
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]">
                <p className="border-b border-slate-200 px-5 py-3 font-semibold text-slate-500">
                  Your client&rsquo;s inbox
                </p>
                <ul>
                  {clientEmails.map((email) => (
                    <li key={email.subject} className="border-b border-slate-100 px-5 py-4 last:border-b-0">
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="font-semibold text-slate-900">{email.subject}</p>
                        <p className="flex-shrink-0 text-sm tabular-nums text-slate-500">{email.time}</p>
                      </div>
                      <p className="mt-1 text-slate-600">{email.preview}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* How long did that take? */}
            <div className="mt-20 grid items-center gap-10 md:mt-28 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
              <div className="order-2 space-y-5 lg:order-1">
                <Shot
                  src="/landing/app-task-list.webp"
                  alt="Four tasks in progress, each showing its own running timer, assignee and priority."
                  width={1380}
                  height={836}
                />
                <Shot
                  src="/landing/app-history.webp"
                  alt="A completed task showing estimated time of 2 hours, actual time of 1 hour 48 minutes, start and finish times, and a completion note."
                  width={1380}
                  height={692}
                />
              </div>

              <div className="order-1 lg:order-2">
                <ClientMessage>&ldquo;How long did that actually take?&rdquo;</ClientMessage>
                <h3 className="mt-5 text-3xl font-bold tracking-[-0.01em]">Every task has its own clock</h3>
                <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
                  Start a task and its timer runs. Pause it when you take a break. When you finish, the task
                  keeps its estimate, the actual time and your completion note, ready for the invoice
                  conversation.
                </p>
                <Bullets
                  items={[
                    'Clock in and out for the day, with pause and resume',
                    'A separate timer on each task',
                    'Idle check after 10 minutes, so time away from the desk is not counted',
                  ]}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Teams */}
        <section id="teams" className="scroll-mt-20 bg-slate-900 py-20 text-white md:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <div className="grid items-end gap-8 lg:grid-cols-2 lg:gap-16">
              <div>
                <ClientMessage dark>&ldquo;Who is on what this week?&rdquo;</ClientMessage>
                <h2 className="mt-5 text-4xl font-bold leading-[1.08] tracking-[-0.02em] md:text-5xl">
                  One screen for the whole team&rsquo;s week
                </h2>
              </div>
              <p className="max-w-xl text-lg leading-relaxed text-slate-300">
                Invite your team, assign tasks, and see tasks completed and hours logged for each person.
                Members see only their own work. Owners and admins see everything.
              </p>
            </div>

            <Shot
              dark
              src="/landing/app-dashboard.webp"
              alt="Workoto team dashboard for a four-person studio: 42 tasks, 83 percent completion rate, 134.3 hours logged, with a completion bar for each team member and a breakdown of tasks by priority."
              width={1800}
              height={1145}
              className="mt-12"
            />

            <div className="mt-12 grid items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
              <div>
                <h3 className="text-3xl font-bold tracking-[-0.01em]">Hours per person, ready to export</h3>
                <p className="mt-4 text-lg leading-relaxed text-slate-300">
                  Time reports total the hours for any date range and split them by team member.
                </p>
                <Bullets
                  dark
                  items={[
                    'Filter by person and by date',
                    'Sessions and assigned tasks for each member',
                    'Export to CSV for payroll or invoicing',
                  ]}
                />
              </div>
              <Shot
                dark
                src="/landing/app-reports.webp"
                alt="Time report showing 134 hours 20 minutes in total across four members, with hours and share of the total for each person."
                width={1600}
                height={847}
              />
            </div>
          </div>
        </section>

        {/* More of the app */}
        <section className="py-20 md:py-28">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="max-w-3xl text-4xl font-bold leading-[1.08] tracking-[-0.02em] md:text-5xl">
              The rest of the working day is in here too
            </h2>

            <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
              <div>
                <Shot
                  src="/landing/app-chat.webp"
                  alt="Workoto team chat with four people online, discussing a checkout fix that is ready to ship."
                  width={828}
                  height={1260}
                  className="mx-auto max-w-sm lg:max-w-none"
                />
                <h3 className="mt-7 text-2xl font-bold">Team chat next to the tasks</h3>
                <p className="mt-3 text-lg leading-relaxed text-slate-600">
                  Each workspace has a chat that shows who is online, so a quick question does not need
                  another app.
                </p>
              </div>

              <div className="space-y-12">
                <div>
                  <Shot
                    src="/landing/app-calendar.webp"
                    alt="Workoto calendar for November 2026 showing total hours, completed and active task counts, and markers on the days with work."
                    width={1600}
                    height={765}
                  />
                  <h3 className="mt-7 text-2xl font-bold">Recurring tasks and a calendar</h3>
                  <p className="mt-3 max-w-2xl text-lg leading-relaxed text-slate-600">
                    Make the weekly report or the monthly invoice run a recurring task. Complete one and
                    the next is created for you. The calendar shows active and completed work by day.
                  </p>
                </div>

                <div className="border-t border-slate-200 pt-10">
                  <h3 className="text-2xl font-bold">Works with what you already use</h3>
                  <dl className="mt-5 grid gap-6 sm:grid-cols-3">
                    <div>
                      <dt className="text-lg font-semibold">Asana</dt>
                      <dd className="mt-1 text-slate-600">Import tasks from your Asana projects.</dd>
                    </div>
                    <div>
                      <dt className="text-lg font-semibold">SendGrid</dt>
                      <dd className="mt-1 text-slate-600">Send client emails from your own account.</dd>
                    </div>
                    <div>
                      <dt className="text-lg font-semibold">Resend</dt>
                      <dd className="mt-1 text-slate-600">Or connect Resend instead.</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* What users say */}
        <section className="bg-[#f3f6fe] py-20 md:py-24">
          <div className="mx-auto max-w-6xl px-5">
            <h2 className="text-4xl font-bold leading-[1.08] tracking-[-0.02em] md:text-5xl">
              What freelancers say
            </h2>
            <div className="mt-12 grid gap-10 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.name} className="border-l-4 border-blue-600 pl-6">
                  <blockquote className="text-xl leading-relaxed text-slate-800">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-5">
                    <span className="block font-semibold text-slate-900">{t.name}</span>
                    <span className="block text-slate-600">{t.role}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-20 md:py-24">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-4xl font-bold leading-[1.08] tracking-[-0.02em] md:text-5xl">
                Free while Workoto is in early access
              </h2>
              <p className="mt-4 max-w-2xl text-xl leading-relaxed text-slate-600">
                Early adopters get every feature at no cost. No card is needed to sign up.
              </p>
            </div>
            <div className="flex flex-shrink-0 flex-col gap-3 sm:flex-row">
              <button onClick={onGetStarted} className={primaryButton}>
                Create free account <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowPricing(true)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-slate-300 px-6 py-3.5 text-lg font-semibold text-slate-800 transition-colors hover:border-slate-400 ${focusRing}`}
              >
                See pricing
              </button>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="border-t border-slate-200 py-20 md:py-24">
          <div className="mx-auto max-w-3xl px-5">
            <h2 className="text-4xl font-bold leading-[1.08] tracking-[-0.02em] md:text-5xl">
              Questions before you sign up
            </h2>
            <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">
              {faqs.map((faq) => (
                <details key={faq.q} className="group">
                  <summary
                    className={`flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-xl font-semibold [&::-webkit-details-marker]:hidden ${focusRing}`}
                  >
                    {faq.q}
                    <ChevronDown
                      aria-hidden="true"
                      className="h-5 w-5 flex-shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
                    />
                  </summary>
                  <p className="pb-6 pr-10 text-lg leading-relaxed text-slate-600">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call to action */}
        <section className="bg-blue-600 py-20 text-white md:py-28">
          <div className="mx-auto max-w-4xl px-5">
            <h2 className="text-4xl font-bold leading-[1.05] tracking-[-0.02em] md:text-6xl">
              The next time a client wants an update, it is already in their inbox.
            </h2>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={onGetStarted}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-4 text-lg font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600"
              >
                Create free account <ArrowRight aria-hidden="true" className="h-5 w-5" />
              </button>
              <p className="text-blue-100">Free during early access. No credit card needed.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 py-14 text-slate-400">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-white">
              <CheckSquare aria-hidden="true" className="h-6 w-6" />
              <span className="text-lg font-bold">Workoto</span>
            </div>
            <p className="mt-3 max-w-xs">Task timing and client updates for freelancers and remote teams.</p>
            <p className="mt-6 text-sm">&copy; {new Date().getFullYear()} Workoto. All rights reserved.</p>
          </div>

          <div>
            <h2 className="font-semibold text-white">Product</h2>
            <ul className="mt-4 space-y-2">
              <li>
                <a href="#how-it-works" className="hover:text-white">
                  How it works
                </a>
              </li>
              <li>
                <a href="#teams" className="hover:text-white">
                  For teams
                </a>
              </li>
              <li>
                <button onClick={() => setShowPricing(true)} className="text-left hover:text-white">
                  Pricing
                </button>
              </li>
              <li>
                <button onClick={() => setShowAbout(true)} className="text-left hover:text-white">
                  About
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold text-white">Contact</h2>
            <address className="mt-4 space-y-2 not-italic">
              <p>
                280 Merrylands Road
                <br />
                Sydney, NSW 2160
                <br />
                Australia
              </p>
              <p>
                <a href="tel:+61455221300" className="hover:text-white">
                  +61 455 221 300
                </a>
              </p>
              <p>
                <a href="mailto:hello@workoto.app" className="hover:text-white">
                  hello@workoto.app
                </a>
              </p>
            </address>
          </div>
        </div>
      </footer>

      {/* Demo video */}
      {showVideoModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Workoto demo video"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowVideoModal(false)}
        >
          <div
            className="relative w-full max-w-5xl overflow-hidden rounded-lg bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowVideoModal(false)}
              aria-label="Close video"
              className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <X aria-hidden="true" className="h-6 w-6" />
            </button>
            <video className="w-full" controls autoPlay src={DEMO_VIDEO}>
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}
    </div>
  );
}
