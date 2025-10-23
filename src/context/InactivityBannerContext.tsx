import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface InactivityBannerState {
  show: boolean;
  sessionPaused: boolean;
  tasksPaused: boolean;
  reason: string;
}

interface InactivityBannerContextType {
  bannerState: InactivityBannerState;
  showBanner: (sessionPaused: boolean, tasksPaused: boolean, reason?: string) => void;
  hideBanner: () => void;
  dismissBanner: () => void;
}

const InactivityBannerContext = createContext<InactivityBannerContextType | undefined>(undefined);

export function InactivityBannerProvider({ children }: { children: ReactNode }) {
  const [bannerState, setBannerState] = useState<InactivityBannerState>({
    show: false,
    sessionPaused: false,
    tasksPaused: false,
    reason: '',
  });

  const showBanner = useCallback((sessionPaused: boolean, tasksPaused: boolean, reason = 'inactivity') => {
    console.log('📢 Showing inactivity banner:', { sessionPaused, tasksPaused, reason });
    setBannerState({
      show: true,
      sessionPaused,
      tasksPaused,
      reason,
    });
  }, []);

  const hideBanner = useCallback(() => {
    console.log('📢 Hiding inactivity banner');
    setBannerState(prev => ({
      ...prev,
      show: false,
    }));
  }, []);

  const dismissBanner = useCallback(() => {
    console.log('📢 Dismissing inactivity banner');
    setBannerState({
      show: false,
      sessionPaused: false,
      tasksPaused: false,
      reason: '',
    });
  }, []);

  return (
    <InactivityBannerContext.Provider value={{
      bannerState,
      showBanner,
      hideBanner,
      dismissBanner,
    }}>
      {children}
    </InactivityBannerContext.Provider>
  );
}

export function useInactivityBanner() {
  const context = useContext(InactivityBannerContext);
  if (context === undefined) {
    throw new Error('useInactivityBanner must be used within an InactivityBannerProvider');
  }
  return context;
}
