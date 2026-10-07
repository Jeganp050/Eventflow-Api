import { userRepository, UserRepository } from '../repositories/user.repository';
import { tokenRepository, TokenRepository } from '../repositories/token.repository';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.utils';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../errors/errorCodes';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { Role } from '../types';

export class AuthService {
  constructor(
    private userRepo: UserRepository = userRepository,
    private tokenRepo: TokenRepository = tokenRepository
  ) {}

  async register(input: RegisterInput) {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw AppError.conflict('An account with this email address already exists', ErrorCode.AUTH_EMAIL_EXISTS);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepo.create({
      name: input.name,
      email: input.email.toLowerCase(),
      passwordHash,
      role: input.role as Role,
    });

    const accessToken = generateAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({ sub: user.id });

    // Store refresh token in DB (valid for 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.tokenRepo.create(user.id, refreshToken, expiresAt);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async login(input: LoginInput) {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user) {
      throw AppError.unauthorized('Invalid email or password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw AppError.unauthorized('Invalid email or password', ErrorCode.AUTH_INVALID_CREDENTIALS);
    }

    const accessToken = generateAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    const refreshToken = generateRefreshToken({ sub: user.id });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.tokenRepo.create(user.id, refreshToken, expiresAt);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  async refreshTokens(refreshToken: string) {
    // 1. Verify token signature
    const decoded = verifyRefreshToken(refreshToken);

    // 2. Look up token in database
    const tokenRecord = await this.tokenRepo.findByToken(refreshToken);
    if (!tokenRecord) {
      throw AppError.unauthorized('Refresh token is invalid or does not exist', ErrorCode.AUTH_REFRESH_TOKEN_INVALID);
    }

    // 3. Check if revoked
    if (tokenRecord.revoked) {
      // Security measure: Token reuse detected! Revoke all tokens for this user
      await this.tokenRepo.revokeAllUserTokens(tokenRecord.userId);
      throw AppError.unauthorized('Revoked refresh token reuse detected. Please log in again.', ErrorCode.AUTH_REFRESH_TOKEN_REVOKED);
    }

    // 4. Check expiration
    if (tokenRecord.expiresAt < new Date()) {
      throw AppError.unauthorized('Refresh token has expired. Please log in again.', ErrorCode.AUTH_TOKEN_EXPIRED);
    }

    // 5. Fetch user to ensure user still exists and role is fresh
    const user = await this.userRepo.findById(decoded.sub);
    if (!user) {
      throw AppError.unauthorized('User not found', ErrorCode.AUTH_UNAUTHORIZED);
    }

    // 6. Rotate tokens: revoke current token and generate new pair
    await this.tokenRepo.revokeToken(refreshToken);

    const newAccessToken = generateAccessToken({
      sub: user.id,
      role: user.role,
      email: user.email,
    });

    const newRefreshToken = generateRefreshToken({ sub: user.id });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    await this.tokenRepo.create(user.id, newRefreshToken, expiresAt);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      await this.tokenRepo.revokeToken(refreshToken);
    } else if (userId) {
      await this.tokenRepo.revokeAllUserTokens(userId);
    }
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw AppError.notFound('User not found', ErrorCode.RESOURCE_NOT_FOUND);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const authService = new AuthService();
