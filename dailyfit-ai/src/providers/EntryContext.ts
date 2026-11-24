import { createContext, useContext } from 'react';

export type EntryTarget = '/welcome' | '/consent' | '/today';

/** Where "/" should send the user, decided by the root navigator from auth + onboarding state. */
export const EntryContext = createContext<EntryTarget>('/welcome');
export const useEntryTarget = () => useContext(EntryContext);
