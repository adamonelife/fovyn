export const passwordPolicy = {
  minimumLength: 8,
  generatedLength: 16,
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  numbers: '0123456789',
  symbols: "!@#$%^&*()_+-=[]{};'\\:\"|<>?,./`~",
} as const;

export const passwordRequirements = [
  { key: 'minimum', test: (value: string) => value.length >= passwordPolicy.minimumLength },
  { key: 'uppercase', test: (value: string) => [...value].some(character => passwordPolicy.uppercase.includes(character)) },
  { key: 'lowercase', test: (value: string) => [...value].some(character => passwordPolicy.lowercase.includes(character)) },
  { key: 'number', test: (value: string) => [...value].some(character => passwordPolicy.numbers.includes(character)) },
  { key: 'symbol', test: (value: string) => [...value].some(character => passwordPolicy.symbols.includes(character)) },
];

export const passwordIsValid = (value: string) =>
  passwordRequirements.every(requirement => requirement.test(value));

const secureIndex = (maximum: number) => {
  if (maximum < 1 || maximum > 256) throw new Error('Invalid secure-random range.');
  const limit = 256 - (256 % maximum);
  const bytes = new Uint8Array(1);
  do crypto.getRandomValues(bytes); while (bytes[0] >= limit);
  return bytes[0] % maximum;
};

const secureCharacter = (characters: string) => characters[secureIndex(characters.length)];

export function generatePassword() {
  const required = [passwordPolicy.lowercase,passwordPolicy.uppercase,passwordPolicy.numbers,passwordPolicy.symbols];
  const allowed = required.join('');
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const characters = required.map(secureCharacter);
    while (characters.length < Math.max(passwordPolicy.minimumLength,passwordPolicy.generatedLength)) characters.push(secureCharacter(allowed));
    for (let index = characters.length - 1; index > 0; index -= 1) {
      const swap = secureIndex(index + 1);
      [characters[index],characters[swap]] = [characters[swap],characters[index]];
    }
    const password = characters.join('');
    if (passwordIsValid(password)) return password;
  }
  throw new Error('Unable to generate a secure password.');
}

export function friendlyAuthError(message: string) {
  const value = message.toLowerCase();
  if (value.includes('invalid login credentials')) return 'The email or password is incorrect.';
  if (value.includes('email not confirmed')) return 'Please confirm your email before signing in.';
  if (value.includes('password')) return 'Choose a password that meets every requirement below.';
  if (value.includes('rate limit')) return 'Please wait a moment before trying again.';
  return 'We could not complete that request. Please try again.';
}

export function friendlyAuthErrorKey(message:string){
  const value=message.toLowerCase();
  if(value.includes('invalid login credentials'))return'auth.errors.invalidCredentials';
  if(value.includes('email not confirmed'))return'auth.errors.emailNotConfirmed';
  if(value.includes('password'))return'auth.signUp.invalidPassword';
  if(value.includes('rate limit'))return'auth.errors.rateLimit';
  return'auth.errors.generic';
}
