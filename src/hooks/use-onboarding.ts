import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_KEY = 'imp_onboarding_state';

interface OnboardingState {
  welcomeCompleted: boolean;
  tourCompleted: boolean;
}

function getStorageKey(userId: string, role: string) {
  return `${ONBOARDING_KEY}_${userId}_${role}`;
}

export function useOnboarding(userId: string | undefined, role: string | null) {
  const [state, setState] = useState<OnboardingState>({
    welcomeCompleted: true,
    tourCompleted: true,
  });

  useEffect(() => {
    if (!userId || !role) return;
    const key = getStorageKey(userId, role);
    const stored = localStorage.getItem(key);
    if (stored) {
      setState(JSON.parse(stored));
    } else {
      setState({ welcomeCompleted: false, tourCompleted: false });
    }
  }, [userId, role]);

  const persist = useCallback(
    (next: OnboardingState) => {
      if (!userId || !role) return;
      localStorage.setItem(getStorageKey(userId, role), JSON.stringify(next));
      setState(next);
    },
    [userId, role],
  );

  const completeWelcome = useCallback(() => {
    persist({ ...state, welcomeCompleted: true });
  }, [state, persist]);

  const completeTour = useCallback(() => {
    persist({ ...state, tourCompleted: true });
  }, [state, persist]);

  const resetOnboarding = useCallback(() => {
    persist({ welcomeCompleted: false, tourCompleted: false });
  }, [persist]);

  return {
    showWelcome: !state.welcomeCompleted,
    showTour: state.welcomeCompleted && !state.tourCompleted,
    completeWelcome,
    completeTour,
    resetOnboarding,
  };
}
