import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Lightbulb, Loader2, X } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useToast } from '../context/ToastContext';
import { useWorkspace } from '../context/WorkspaceContext';

interface FeatureRequestModalProps {
  userEmail?: string;
  onClose: () => void;
}

type Importance = 'nice_to_have' | 'important' | 'critical';

const TITLE_MIN = 3;
const TITLE_MAX = 120;
const DETAILS_MAX = 4000;

const IMPORTANCE_OPTIONS: Array<{ value: Importance; label: string }> = [
  { value: 'nice_to_have', label: 'Nice to have' },
  { value: 'important', label: 'Important' },
  { value: 'critical', label: 'Critical' },
];

export function FeatureRequestModal({ userEmail, onClose }: FeatureRequestModalProps) {
  const { showSuccess } = useToast();
  const { currentWorkspace } = useWorkspace();
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [importance, setImportance] = useState<Importance>('nice_to_have');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const trimmedTitle = title.trim();
  const canSend = trimmedTitle.length >= TITLE_MIN && !isSending;
  const hasDraft = trimmedTitle.length > 0 || details.trim().length > 0;

  // Return focus to whatever opened the dialog, and stop the page scrolling behind it
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    titleRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener?.focus?.();
    };
  }, []);

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;

    setIsSending(true);
    setError('');
    try {
      await apiClient.submitFeatureRequest({
        title: trimmedTitle,
        details: details.trim(),
        importance,
        workspaceId: currentWorkspace?.id,
        pageUrl: window.location.href,
      });
      showSuccess('Request Sent', 'Thanks. We read every request.');
      onClose();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'Your request could not be sent. Please try again.');
      setIsSending(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      if (!isSending) onClose();
      return;
    }

    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
      return;
    }

    // Keep Tab inside the dialog
    if (event.key === 'Tab' && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-150 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        // A stray click outside should not throw away something the user has typed
        if (event.target === event.currentTarget && !hasDraft && !isSending) onClose();
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-request-title"
        aria-describedby="feature-request-description"
        className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-900/10 animate-in slide-in-from-bottom-4 duration-200 sm:max-w-lg sm:rounded-2xl sm:zoom-in-95 sm:slide-in-from-bottom-0"
      >
        <div className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <Lightbulb className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="feature-request-title" className="text-lg font-semibold tracking-tight text-slate-900">
              Request a Feature
            </h2>
            <p id="feature-request-description" className="mt-0.5 text-sm text-slate-500">
              Tell us what would make Workoto work better for you. It goes straight to the people who build it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSending}
            aria-label="Close"
            className="-mr-1.5 -mt-1.5 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
            <div>
              <label htmlFor="feature-request-summary" className="block text-sm font-medium text-slate-800">
                What should Workoto do?
              </label>
              <input
                ref={titleRef}
                id="feature-request-summary"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={TITLE_MAX}
                placeholder="Export time reports as a PDF"
                autoComplete="off"
                className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor="feature-request-details" className="block text-sm font-medium text-slate-800">
                  What would it help you get done?
                </label>
                <span className="text-xs text-slate-400">Optional</span>
              </div>
              <textarea
                id="feature-request-details"
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={DETAILS_MAX}
                rows={5}
                placeholder="My client asks for a signed-off summary each month, and I rebuild it by hand from the report screen."
                className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              {details.length > DETAILS_MAX - 400 && (
                <p className="mt-1 text-right text-xs tabular-nums text-slate-500">
                  {DETAILS_MAX - details.length} characters left
                </p>
              )}
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-slate-800">How much does it matter?</legend>
              <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                {IMPORTANCE_OPTIONS.map((option) => {
                  const selected = importance === option.value;
                  return (
                    <label
                      key={option.value}
                      className={`cursor-pointer rounded-lg px-2 py-2 text-center text-sm font-medium transition-colors focus-within:ring-2 focus-within:ring-blue-500 ${
                        selected
                          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <input
                        type="radio"
                        name="feature-request-importance"
                        value={option.value}
                        checked={selected}
                        onChange={() => setImportance(option.value)}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="min-w-0 truncate text-xs text-slate-500">
              {userEmail ? `We may reply to ${userEmail}` : 'We may reply by email'}
            </p>
            <div className="flex flex-shrink-0 items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSending}
                className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200/70 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!canSend}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isSending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
