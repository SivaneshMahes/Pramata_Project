import bcrypt from 'bcryptjs';
import { ErrorCode } from '@vrp/shared-types';
import type { UserDto, UserRole } from '@vrp/shared-types';
import type { LoginInput, RegisterInput, UpdateProfileInput } from '@vrp/validation';
import { env } from '../config/env.js';
import { toUserDto } from '../mappers/index.js';
import { userRepository } from '../repositories/user.repository.js';
import { AppError } from '../utils/AppError.js';
import { isDuplicateKeyError } from '../utils/mongoErrors.js';
import { googleVerifier } from './google.service.js';
import { tokenService } from './token.service.js';

export interface AuthSession {
  user: UserDto;
  token: string;
}

// Compared against when the email is unknown so response time doesn't reveal
// whether an account exists.
const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', 10);

function issueSession(user: Parameters<typeof toUserDto>[0]): AuthSession {
  return {
    user: toUserDto(user),
    token: tokenService.sign({ sub: user._id.toString(), role: user.role }),
  };
}

export const authService = {
  async register(input: RegisterInput): Promise<AuthSession> {
    if (await userRepository.existsByEmail(input.email)) {
      throw AppError.conflict(ErrorCode.EMAIL_TAKEN, 'An account with this email already exists.');
    }
    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
    try {
      const user = await userRepository.create({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        authProvider: 'local',
      });
      return issueSession(user);
    } catch (error) {
      // Two simultaneous sign-ups with the same email: the unique index decides.
      if (isDuplicateKeyError(error)) {
        throw AppError.conflict(
          ErrorCode.EMAIL_TAKEN,
          'An account with this email already exists.',
        );
      }
      throw error;
    }
  },

  async login(input: LoginInput): Promise<AuthSession> {
    const user = await userRepository.findByEmailWithPassword(input.email);
    const matches = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !user.passwordHash || !matches) {
      throw new AppError(401, ErrorCode.INVALID_CREDENTIALS, 'Incorrect email or password.');
    }
    const { passwordHash: _omit, ...safeUser } = user;
    return issueSession(safeUser);
  },

  async getCurrentUser(userId: string): Promise<UserDto> {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.unauthenticated();
    return toUserDto(user);
  },

  async updateProfile(userId: string, input: UpdateProfileInput): Promise<UserDto> {
    const user = await userRepository.updateProfile(userId, input);
    if (!user) throw AppError.notFound('User');
    return toUserDto(user);
  },

  /**
   * Google sign-in. Returning Google users sign straight in; an existing
   * account with the same *verified* email is linked; anyone else gets a new
   * account with no role, which every role-gated endpoint refuses until
   * onboarding is completed — OAuth never bypasses authorization.
   */
  async googleSignIn(credential: string): Promise<AuthSession & { isNewUser: boolean }> {
    const identity = await googleVerifier.verify(credential);

    const linked = await userRepository.findByGoogleId(identity.googleId);
    if (linked) return { ...issueSession(linked), isNewUser: false };

    if (!identity.emailVerified) {
      throw AppError.unauthenticated('Your Google email address isn’t verified.');
    }
    const existing = await userRepository.findByEmailWithPassword(identity.email);
    if (existing) {
      const user = await userRepository.linkGoogleAccount(existing._id, identity.googleId);
      if (!user) throw AppError.unauthenticated();
      return { ...issueSession(user), isNewUser: false };
    }

    try {
      const user = await userRepository.create({
        name: identity.name,
        email: identity.email,
        role: null,
        authProvider: 'google',
        googleId: identity.googleId,
      });
      return { ...issueSession(user), isNewUser: true };
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw AppError.conflict(ErrorCode.EMAIL_TAKEN, 'Please try signing in again.');
      throw error;
    }
  },

  /** Google sign-ups choose their role exactly once; a new token carries it. */
  async completeOnboarding(userId: string, role: UserRole): Promise<AuthSession> {
    const user = await userRepository.setRoleIfUnset(userId, role);
    if (!user) {
      throw AppError.conflict(ErrorCode.FORBIDDEN, 'Your account already has a role.');
    }
    return issueSession(user);
  },

  issueSession,
};
