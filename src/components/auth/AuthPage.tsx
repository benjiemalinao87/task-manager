import { useState } from 'react';
import { Login } from './Login';
import { Signup } from './Signup';

export function AuthPage() {
  const [showLogin, setShowLogin] = useState(true);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleSignupSuccess = () => {
    setShowSuccessMessage(true);
    setShowLogin(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  return (
    <>
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

