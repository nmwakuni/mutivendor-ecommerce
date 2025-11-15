import ImageKit from 'imagekit';
import { config } from '@/config/env';
import { logger } from '@/config/logger';

export class ImageKitService {
  private imagekit: ImageKit;

  constructor() {
    this.imagekit = new ImageKit({
      publicKey: config.imagekit.publicKey,
      privateKey: config.imagekit.privateKey,
      urlEndpoint: config.imagekit.urlEndpoint,
    });
  }

  /**
   * Upload file to ImageKit
   */
  async upload(params: {
    file: Buffer | string;
    fileName: string;
    folder?: string;
    tags?: string[];
    useUniqueFileName?: boolean;
  }) {
    try {
      const result = await this.imagekit.upload({
        file: params.file,
        fileName: params.fileName,
        folder: params.folder || '/',
        tags: params.tags,
        useUniqueFileName: params.useUniqueFileName ?? true,
      });

      logger.info('File uploaded to ImageKit:', {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
      });

      return {
        fileId: result.fileId,
        name: result.name,
        url: result.url,
        thumbnailUrl: result.thumbnailUrl,
        filePath: result.filePath,
        size: result.size,
        fileType: result.fileType,
      };
    } catch (error) {
      logger.error('ImageKit upload error:', error);
      throw new Error('Failed to upload file');
    }
  }

  /**
   * Upload product image with transformations
   */
  async uploadProductImage(params: {
    file: Buffer | string;
    fileName: string;
    productId: string;
  }) {
    return this.upload({
      file: params.file,
      fileName: params.fileName,
      folder: `/products/${params.productId}`,
      tags: ['product', params.productId],
    });
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(params: { file: Buffer | string; fileName: string; userId: string }) {
    return this.upload({
      file: params.file,
      fileName: params.fileName,
      folder: `/avatars/${params.userId}`,
      tags: ['avatar', params.userId],
    });
  }

  /**
   * Upload vendor logo/banner
   */
  async uploadVendorAsset(params: {
    file: Buffer | string;
    fileName: string;
    vendorId: string;
    type: 'logo' | 'banner';
  }) {
    return this.upload({
      file: params.file,
      fileName: params.fileName,
      folder: `/vendors/${params.vendorId}/${params.type}`,
      tags: ['vendor', params.vendorId, params.type],
    });
  }

  /**
   * Delete file from ImageKit
   */
  async delete(fileId: string) {
    try {
      await this.imagekit.deleteFile(fileId);
      logger.info('File deleted from ImageKit:', { fileId });
      return true;
    } catch (error) {
      logger.error('ImageKit delete error:', error);
      throw new Error('Failed to delete file');
    }
  }

  /**
   * Get file details
   */
  async getFileDetails(fileId: string) {
    try {
      const result = await this.imagekit.getFileDetails(fileId);
      return result;
    } catch (error) {
      logger.error('ImageKit get file details error:', error);
      throw new Error('Failed to get file details');
    }
  }

  /**
   * Generate optimized URL with transformations
   */
  getUrl(params: {
    path: string;
    transformation?: Array<{
      height?: number;
      width?: number;
      quality?: number;
      format?: string;
      crop?: string;
      focus?: string;
    }>;
  }) {
    return this.imagekit.url({
      path: params.path,
      transformation: params.transformation,
    });
  }

  /**
   * Generate product thumbnail URL (optimized)
   */
  getProductThumbnail(filePath: string, size: number = 300) {
    return this.getUrl({
      path: filePath,
      transformation: [
        {
          height: size,
          width: size,
          crop: 'at_max',
          quality: 80,
          format: 'webp',
        },
      ],
    });
  }

  /**
   * Generate avatar URL (circular crop)
   */
  getAvatarUrl(filePath: string, size: number = 150) {
    return this.getUrl({
      path: filePath,
      transformation: [
        {
          height: size,
          width: size,
          crop: 'at_max',
          quality: 90,
          format: 'webp',
        },
      ],
    });
  }

  /**
   * Bulk delete files
   */
  async bulkDelete(fileIds: string[]) {
    try {
      const result = await this.imagekit.bulkDeleteFiles(fileIds);
      logger.info('Bulk delete from ImageKit:', {
        successfullyDeleted: result.successfullyDeletedFileIds.length,
      });
      return result;
    } catch (error) {
      logger.error('ImageKit bulk delete error:', error);
      throw new Error('Failed to bulk delete files');
    }
  }
}

export const imagekitService = new ImageKitService();
