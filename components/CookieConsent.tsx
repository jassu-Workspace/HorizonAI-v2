import React, { useState, useEffect } from 'react';

const CookieConsent: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieConsent = localStorage.getItem('horizon_ai_cookie_consent');
    if (!cookieConsent) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('horizon_ai_cookie_consent', 'accepted');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-6 shadow-lg z-40 border-t-4 border-blue-500">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold mb-2">🍪 We Use Cookies to Keep You Logged In</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              When you sign in to Horizon AI, we save a small piece of information on your device called a "cookie."
              This helps us remember who you are when you come back to the site, so you don't have to sign in every time.
              <br/>
              <br/>
              <strong>What we save:</strong> Your login information, your progress, and your learning data.
              <br/>
              <strong>Your privacy:</strong> Your information is encrypted and protected. Only your account can access your data.
              <br/>
              <strong>You control it:</strong> You can clear cookies anytime from your browser settings.
            </p>
          </div>
          <button
            onClick={handleAccept}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg whitespace-nowrap transition-colors"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
