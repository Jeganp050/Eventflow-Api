import { Request, Response, NextFunction } from 'express';
import { authService, AuthService } from '../services/auth.service';
import { sendSuccess, sendCreated, sendNoContent } from '../utils/response.utils';

export class AuthController {
  constructor(private service: AuthService = authService) {}

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.register(req.body);
      return sendCreated(res, result);
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.login(req.body);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      const result = await this.service.refreshTokens(refreshToken);
      return sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const refreshToken = req.body?.refreshToken;
      const userId = req.user?.sub;
      await this.service.logout(refreshToken, userId);
      return sendNoContent(res);
    } catch (error) {
      next(error);
    }
  };

  getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const user = await this.service.getCurrentUser(userId);
      return sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();
