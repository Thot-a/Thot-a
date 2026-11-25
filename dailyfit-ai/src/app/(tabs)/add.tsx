import { Redirect } from 'expo-router';

/** Placeholder for the centre "+" tab; its button opens /log/add instead of this screen. */
export default function AddTab() {
  return <Redirect href="/log/add" />;
}
