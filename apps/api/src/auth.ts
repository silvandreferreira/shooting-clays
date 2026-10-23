import {
  SignJWT,
  createLocalJWKSet,
  createRemoteJWKSet,
  exportJWK,
  generateKeyPair,
  jwtVerify,
  type JWTPayload,
} from 'jose';

/** The signed-in user, from a verified Neon Auth JWT. */
export interface AuthUser {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image: string | null;
}

/** Resolves to the user for a valid token; rejects for an invalid or expired one. */
export type VerifyToken = (token: string) => Promise<AuthUser>;

function toAuthUser(payload: JWTPayload): AuthUser {
  const { sub, email, emailVerified, name, image } = payload as JWTPayload &
    Record<string, unknown>;
  if (!sub || typeof email !== 'string') throw new Error('Token without subject or email');
  return {
    id: sub,
    email,
    emailVerified: emailVerified === true,
    name: typeof name === 'string' && name.trim() ? name.trim() : email.split('@')[0]!,
    image: typeof image === 'string' ? image : null,
  };
}

/**
 * Verifies Neon Auth (managed Better Auth) JWTs against the branch's public JWKS.
 * Tokens are EdDSA-signed, expire after 15 minutes and are issued by the auth URL's origin.
 */
export function createNeonAuthVerifier(neonAuthUrl: string): VerifyToken {
  const issuer = new URL(neonAuthUrl).origin;
  const jwks = createRemoteJWKSet(new URL(`${neonAuthUrl}/.well-known/jwks.json`));
  return async (token) => {
    const { payload } = await jwtVerify(token, jwks, { issuer, algorithms: ['EdDSA'] });
    return toAuthUser(payload);
  };
}

const TEST_ISSUER = 'https://auth.e2e.test';

/** Local signer and verifier for tests and E2E mode, so they never depend on Google or Neon. */
export async function createTestAuth() {
  const { privateKey, publicKey } = await generateKeyPair('EdDSA', { crv: 'Ed25519' });
  const jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), alg: 'EdDSA' }] });
  const verifyToken: VerifyToken = async (token) => {
    const { payload } = await jwtVerify(token, jwks, { issuer: TEST_ISSUER });
    return toAuthUser(payload);
  };
  const signToken = (
    user: Pick<AuthUser, 'id' | 'email' | 'name'> & { emailVerified?: boolean },
    expiresIn = '15m',
  ) =>
    new SignJWT({ email: user.email, name: user.name, emailVerified: user.emailVerified ?? true })
      .setProtectedHeader({ alg: 'EdDSA' })
      .setSubject(user.id)
      .setIssuer(TEST_ISSUER)
      .setIssuedAt()
      .setExpirationTime(expiresIn)
      .sign(privateKey);
  return { verifyToken, signToken };
}

export type TestAuth = Awaited<ReturnType<typeof createTestAuth>>;

/** ADMIN_EMAILS → normalised list. These users are always active admins. */
export function parseAdminEmails(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
