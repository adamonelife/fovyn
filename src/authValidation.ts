export const passwordRequirements = [
  { label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { label: 'One number', test: (value: string) => /\d/.test(value) },
  { label: 'One symbol', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

export const passwordIsValid = (value: string) =>
  passwordRequirements.every(requirement => requirement.test(value));

export function friendlyAuthError(message: string) {
  const value = message.toLowerCase();
  if (value.includes('invalid login credentials')) return 'The email or password is incorrect.';
  if (value.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (value.includes('password')) return 'Choose a password that meets every requirement below.';
  if (value.includes('rate limit')) return 'Please wait a moment before trying again.';
  return 'We could not complete that request. Please try again.';
}
