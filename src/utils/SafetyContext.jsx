import { createContext, useContext } from 'react';
import { useSafetyEngine } from './useSafetyEngine';

const SafetyContext = createContext();

export function SafetyProvider({ children }) {
  const safetyState = useSafetyEngine();

  return (
    <SafetyContext.Provider value={safetyState}>
      {children}
    </SafetyContext.Provider>
  );
}

export function useSafetyContext() {
  return useContext(SafetyContext);
}
