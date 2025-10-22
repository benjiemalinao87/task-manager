import { useState } from 'react';
import { Users, Mail, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { apiClient } from '../../lib/api-client';

interface InviteColleaguesProps {
  onComplete: () => void;
}

export function InviteColleagues({ onComplete }: InviteColleaguesProps) {
  const [emails, setEmails] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateEmails = (emailString: string): { valid: boolean; error?: string; emails?: string[]; count?: number } => {
    if (!emailString.trim()) {
      return { valid: true, emails: [], count: 0 }; // Empty is ok - user can skip
    }

    const emailList = emailString.split(',').map(e => e.trim()).filter(e => e.length > 0);

    if (emailList.length > 5) {
      return { valid: false, error: 'Maximum 5 email addresses allowed' };
    }

    const invalidEmails = emailList.filter(e => !validateEmail(e));

    if (invalidEmails.length > 0) {
      return {
        valid: false,
        error: `Invalid email format: ${invalidEmails[0]}`
      };
    }

    return { valid: true, emails: emailList, count: emailList.length };
  };

  const handleSubmit = async () => {
    setEmailError('');
    setSuccessMessage('');

    // Validate emails
    const validation = validateEmails(emails);
    if (!validation.valid) {
      setEmailError(validation.error || 'Invalid email addresses');
      return;
    }

    // If no emails, just skip
    if (!validation.emails || validation.emails.length === 0) {
      handleSkip();
      return;
    }

    setIsSubmitting(true);

    try {
      // Send invitations
      await apiClient.sendOnboardingInvitations({ emails: validation.emails });

      setSuccessMessage(`Invitations sent to ${validation.count} colleague${validation.count > 1 ? 's' : ''}!`);

      // Wait a moment to show success message
      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (error: any) {
      console.error('Error sending invitations:', error);
      setEmailError(error.message || 'Failed to send invitations. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    // Mark onboarding as complete and continue
    apiClient.completeOnboarding().then(() => {
      onComplete();
    }).catch(() => {
      // Even if it fails, continue to app
      onComplete();
    });
  };

  const emailCount = emails.trim() ? emails.split(',').map(e => e.trim()).filter(e => e.length > 0).length : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full mb-4">
            <Users className="w-12 h-12 text-purple-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
            Invite Your Team <Sparkles className="w-6 h-6 text-yellow-500" />
          </h1>
          <p className="text-gray-600 text-lg">
            Workoto is better together! Invite colleagues to collaborate and boost productivity.
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            <p className="text-green-700 font-medium">{successMessage}</p>
          </div>
        )}

        {/* Email Input */}
        <div className="mb-6">
          <label htmlFor="colleague-emails" className="block text-sm font-semibold text-gray-700 mb-2">
            <Mail className="inline w-4 h-4 mr-1" />
            Colleague Email Addresses
          </label>
          <textarea
            id="colleague-emails"
            value={emails}
            onChange={(e) => {
              setEmails(e.target.value);
              setEmailError('');
            }}
            placeholder="colleague1@company.com, colleague2@company.com, manager@company.com"
            rows={3}
            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 transition-all resize-none ${
              emailError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:border-purple-500 focus:ring-purple-200'
            }`}
          />
          {emailError && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <span className="font-medium">⚠️</span> {emailError}
            </p>
          )}
          {!emailError && emailCount > 0 && (
            <p className="mt-2 text-sm text-green-600 flex items-center gap-1">
              <span className="font-medium">✓</span> {emailCount} colleague{emailCount === 1 ? '' : 's'} will receive an invitation
            </p>
          )}
          <p className="mt-2 text-sm text-gray-500">
            Separate multiple emails with commas. Maximum 5 invitations.
          </p>
        </div>

        {/* Benefits Section */}
        <div className="mb-8 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            What your colleagues will receive:
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">✓</span>
              <span>A professional invitation email with your name</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">✓</span>
              <span>Automatic access to your shared workspace</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-600 font-bold">✓</span>
              <span>One-click signup to start collaborating immediately</span>
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSkip}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 text-gray-600 bg-gray-100 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Skip for Now
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending Invitations...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Send Invitations
              </>
            )}
          </button>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          💡 Tip: You can always invite more team members later from Settings
        </p>
      </div>
    </div>
  );
}
