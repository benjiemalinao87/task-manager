import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Login } from './Login';
import { Signup } from './Signup';

interface AuthPageProps {
  onBackToLanding?: () => void;
}

export function AuthPage({ onBackToLanding }: AuthPageProps) {
  const [showLogin, setShowLogin] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleSignupSuccess = () => {
    setShowSuccessMessage(true);
    setShowLogin(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  return (
    <>
      {onBackToLanding && (
        <button
          onClick={onBackToLanding}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      )}

      {showSuccessMessage && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg animate-fade-in">
          <p className="text-green-600 font-medium">
            ✅ Account created successfully! Please sign in.
          </p>
        </div>
      )}
      
      {showLogin ? (
        <Login onSwitchToSignup={() => setShowLogin(false)} />
      ) : (
        <Signup
          onSwitchToLogin={() => setShowLogin(true)}
          onSignupSuccess={handleSignupSuccess}
        />
      )}
    </>
  );
}

