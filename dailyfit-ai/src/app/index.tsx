import { Redirect } from 'expo-router';

import { useEntryTarget } from '@/providers/EntryContext';

/** Entry route: sends the user to welcome, onboarding or today depending on their state. */
export default function Index() {
  return <Redirect href={useEntryTarget()} />;
}
