import { AuthService } from '../../src/services/auth.service';
import { Role } from '../../src/types';
import { AppError } from '../../src/errors/app.error';

describe('AuthService (Unit Tests)', () => {
  let authService: AuthService;
  let mockUserRepo: any;
  let mockTokenRepo: any;

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      existsByEmail: jest.fn(),
    };
    mockTokenRepo = {
      create: jest.fn(),
      findByToken: jest.fn(),
      revokeToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
    };
    authService = new AuthService(mockUserRepo, mockTokenRepo);
  });

  describe('register', () => {
    it('should successfully register a new attendee and return tokens', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Test Attendee',
        email: 'attendee@example.com',
        passwordHash: 'hashed_password',
        role: Role.ATTENDEE,
        createdAt: new Date(),
      });
      mockTokenRepo.create.mockResolvedValue({});

      const result = await authService.register({
        name: 'Test Attendee',
        email: 'attendee@example.com',
        password: 'Password123!',
        role: Role.ATTENDEE,
      });

      expect(result.user.email).toBe('attendee@example.com');
      expect(result.user.role).toBe(Role.ATTENDEE);
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
    });

    it('should reject registration if email already exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({ id: 'existing-user' });

      await expect(
        authService.register({
          name: 'Duplicate User',
          email: 'attendee@example.com',
          password: 'Password123!',
          role: Role.ATTENDEE,
        })
      ).rejects.toThrow(AppError);
    });
  });

  describe('login', () => {
    it('should reject login for non-existent email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'unknown@example.com',
          password: 'Password123!',
        })
      ).rejects.toThrow(AppError);
    });
  });
});
