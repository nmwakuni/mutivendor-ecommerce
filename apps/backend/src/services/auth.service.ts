import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '@/config/database';
import { config } from '@/config/env';
import { inngest } from '@/inngest/client';
import { UnauthorizedError, ConflictError, NotFoundError, BadRequestError } from '@/middleware/error-handler';
import { logger } from '@/config/logger';

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'CUSTOMER' | 'VENDOR';
}

export class AuthService {
  /**
   * Generate JWT token
   */
  private generateToken(userId: string, email: string, role: string): string {
    return jwt.sign({ userId, email, role }, config.auth.jwt.secret, {
      expiresIn: config.auth.jwt.expiresIn,
    });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, config.auth.jwt.secret, {
      expiresIn: config.auth.jwt.refreshExpiresIn,
    });
  }

  /**
   * Hash password
   */
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  /**
   * Compare password
   */
  private async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate random token
   */
  private generateRandomToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Register new user
   */
  async register(data: RegisterData) {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Check phone uniqueness if provided
    if (data.phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone: data.phone },
      });

      if (existingPhone) {
        throw new ConflictError('Phone number already registered');
      }
    }

    // Hash password
    const hashedPassword = await this.hashPassword(data.password);

    // Generate verification token
    const verificationToken = this.generateRandomToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
        verificationToken,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    // Send verification email
    await inngest.send({
      name: 'email/send.verification',
      data: {
        to: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        verificationToken,
      },
    });

    // Send welcome email
    await inngest.send({
      name: 'email/send.welcome',
      data: {
        to: user.email,
        userName: `${user.firstName} ${user.lastName}`,
      },
    });

    // Generate tokens
    const token = this.generateToken(user.id, user.email, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    logger.info('User registered', { userId: user.id, email: user.email, role: user.role });

    return { user, token, refreshToken };
  }

  /**
   * Login user
   */
  async login(email: string, password: string) {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Compare password
    if (!user.password) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await this.comparePassword(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const token = this.generateToken(user.id, user.email, user.role);
    const refreshToken = this.generateRefreshToken(user.id);

    logger.info('User logged in', { userId: user.id, email: user.email });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        avatar: user.avatar,
        vendor: user.vendor,
      },
      token,
      refreshToken,
    };
  }

  /**
   * Verify email
   */
  async verifyEmail(token: string) {
    const user = await prisma.user.findFirst({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new BadRequestError('Invalid verification token');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
      },
    });

    logger.info('Email verified', { userId: user.id });

    return { message: 'Email verified successfully' };
  }

  /**
   * Request password reset
   */
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return { message: 'If email exists, reset link has been sent' };
    }

    // Generate reset token
    const resetToken = this.generateRandomToken();
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Send reset email
    await inngest.send({
      name: 'email/send.password-reset',
      data: {
        to: user.email,
        userName: `${user.firstName} ${user.lastName}`,
        resetToken,
      },
    });

    logger.info('Password reset requested', { userId: user.id });

    return { message: 'If email exists, reset link has been sent' };
  }

  /**
   * Reset password
   */
  async resetPassword(token: string, newPassword: string) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gte: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestError('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    logger.info('Password reset completed', { userId: user.id });

    return { message: 'Password reset successfully' };
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await this.comparePassword(currentPassword, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    logger.info('Password changed', { userId });

    return { message: 'Password changed successfully' };
  }

  /**
   * Get user profile
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        dateOfBirth: true,
        emailVerified: true,
        phoneVerified: true,
        createdAt: true,
        vendor: {
          select: {
            id: true,
            businessName: true,
            status: true,
            logo: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      dateOfBirth?: string;
    }
  ) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone && { phone: data.phone }),
        ...(data.dateOfBirth && { dateOfBirth: new Date(data.dateOfBirth) }),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        avatar: true,
        dateOfBirth: true,
      },
    });

    logger.info('Profile updated', { userId });

    return user;
  }
}

export const authService = new AuthService();
