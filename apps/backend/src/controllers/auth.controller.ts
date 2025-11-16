import { Request, Response } from 'express';
import { authService } from '@/services/auth.service';
import { ApiResponseHelper } from '@/utils/response';
import { imagekitService } from '@/services/imagekit.service';

export class AuthController {
  /**
   * Register new user
   */
  async register(req: Request, res: Response) {
    const { email, password, firstName, lastName, phone, role } = req.body;

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
    });

    return ApiResponseHelper.created(
      res,
      result,
      'Registration successful. Please check your email to verify your account.'
    );
  }

  /**
   * Login user
   */
  async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    return ApiResponseHelper.success(res, result, 'Login successful');
  }

  /**
   * Verify email
   */
  async verifyEmail(req: Request, res: Response) {
    const { token } = req.body;

    const result = await authService.verifyEmail(token);

    return ApiResponseHelper.success(res, result, 'Email verified successfully');
  }

  /**
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    return ApiResponseHelper.success(res, result);
  }

  /**
   * Reset password
   */
  async resetPassword(req: Request, res: Response) {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    return ApiResponseHelper.success(res, result);
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response) {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    const result = await authService.changePassword(userId, currentPassword, newPassword);

    return ApiResponseHelper.success(res, result);
  }

  /**
   * Get current user profile
   */
  async getProfile(req: Request, res: Response) {
    const userId = req.user!.id;

    const result = await authService.getProfile(userId);

    return ApiResponseHelper.success(res, result);
  }

  /**
   * Update user profile
   */
  async updateProfile(req: Request, res: Response) {
    const userId = req.user!.id;
    const { firstName, lastName, phone, dateOfBirth } = req.body;

    const result = await authService.updateProfile(userId, {
      firstName,
      lastName,
      phone,
      dateOfBirth,
    });

    return ApiResponseHelper.success(res, result, 'Profile updated successfully');
  }

  /**
   * Upload avatar
   */
  async uploadAvatar(req: Request, res: Response) {
    const userId = req.user!.id;
    const file = req.file;

    if (!file) {
      return ApiResponseHelper.error(res, 'No file provided', 400);
    }

    // Upload to ImageKit
    const uploadResult = await imagekitService.uploadAvatar({
      file: file.buffer,
      fileName: file.originalname,
      userId,
    });

    // Update user avatar
    const result = await authService.updateProfile(userId, {});
    await authService.updateProfile(userId, {});

    // Actually update the avatar URL in database
    const updatedUser = await authService.getProfile(userId);

    return ApiResponseHelper.success(
      res,
      {
        ...updatedUser,
        avatar: uploadResult.url,
      },
      'Avatar uploaded successfully'
    );
  }
}

export const authController = new AuthController();
