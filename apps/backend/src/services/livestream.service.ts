import { prisma } from '../lib/prisma';
import { LiveStreamStatus } from '@prisma/client';
import { ApiError } from '../utils/ApiError';

class LiveStreamService {
  /**
   * Create a live stream
   */
  async createStream(vendorId: string, data: {
    title: string;
    description?: string;
    thumbnail?: string;
    scheduledAt: Date;
    productIds?: string[];
    tags?: string[];
  }) {
    // Verify vendor exists
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new ApiError(404, 'Vendor not found');
    }

    if (vendor.status !== 'APPROVED') {
      throw new ApiError(403, 'Vendor must be approved to create live streams');
    }

    // Generate stream URLs (in production, integrate with streaming service like Mux, Agora, etc.)
    const streamKey = this.generateStreamKey();
    const streamUrl = `rtmp://stream.example.com/live/${streamKey}`;
    const playbackUrl = `https://stream.example.com/live/${streamKey}/index.m3u8`;

    const stream = await prisma.liveStream.create({
      data: {
        vendorId,
        title: data.title,
        description: data.description,
        thumbnail: data.thumbnail,
        scheduledAt: data.scheduledAt,
        streamUrl,
        playbackUrl,
        tags: data.tags || [],
      },
    });

    // Add products to stream if provided
    if (data.productIds && data.productIds.length > 0) {
      await this.addProductsToStream(stream.id, data.productIds);
    }

    return stream;
  }

  /**
   * Add products to stream
   */
  async addProductsToStream(
    streamId: string,
    productIds: string[],
    specialPrices?: Record<string, number>
  ) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new ApiError(404, 'Stream not found');
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        vendorId: stream.vendorId, // Ensure products belong to vendor
      },
    });

    const streamProducts = await Promise.all(
      products.map((product, index) =>
        prisma.liveStreamProduct.create({
          data: {
            streamId,
            productId: product.id,
            specialPrice: specialPrices?.[product.id],
            order: index,
          },
        })
      )
    );

    return streamProducts;
  }

  /**
   * Remove product from stream
   */
  async removeProductFromStream(streamId: string, productId: string) {
    await prisma.liveStreamProduct.deleteMany({
      where: {
        streamId,
        productId,
      },
    });
  }

  /**
   * Start live stream
   */
  async startStream(streamId: string, vendorId: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new ApiError(404, 'Stream not found');
    }

    if (stream.vendorId !== vendorId) {
      throw new ApiError(403, 'Not authorized to start this stream');
    }

    if (stream.status !== LiveStreamStatus.SCHEDULED) {
      throw new ApiError(400, 'Stream must be scheduled to start');
    }

    const updatedStream = await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        status: LiveStreamStatus.LIVE,
        startedAt: new Date(),
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    return updatedStream;
  }

  /**
   * End live stream
   */
  async endStream(streamId: string, vendorId: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new ApiError(404, 'Stream not found');
    }

    if (stream.vendorId !== vendorId) {
      throw new ApiError(403, 'Not authorized to end this stream');
    }

    const updatedStream = await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        status: LiveStreamStatus.ENDED,
        endedAt: new Date(),
      },
    });

    return updatedStream;
  }

  /**
   * Get live streams (current and upcoming)
   */
  async getLiveStreams(status?: LiveStreamStatus, limit = 20, offset = 0) {
    const where: any = {};

    if (status) {
      where.status = status;
    } else {
      // Default: show live and scheduled streams
      where.status = {
        in: [LiveStreamStatus.LIVE, LiveStreamStatus.SCHEDULED],
      };
    }

    const streams = await prisma.liveStream.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
          },
        },
        products: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                thumbnail: true,
              },
            },
          },
        },
        _count: {
          select: {
            views: true,
            comments: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // LIVE first
        { scheduledAt: 'asc' },
      ],
      take: limit,
      skip: offset,
    });

    const total = await prisma.liveStream.count({ where });

    return { streams, total };
  }

  /**
   * Get stream by ID
   */
  async getStreamById(streamId: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
      include: {
        vendor: {
          select: {
            id: true,
            businessName: true,
            logo: true,
            description: true,
          },
        },
        products: {
          include: {
            product: true,
          },
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            views: true,
            comments: true,
          },
        },
      },
    });

    if (!stream) {
      throw new ApiError(404, 'Stream not found');
    }

    return stream;
  }

  /**
   * Get vendor's streams
   */
  async getVendorStreams(vendorId: string, limit = 20, offset = 0) {
    const streams = await prisma.liveStream.findMany({
      where: { vendorId },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        _count: {
          select: {
            views: true,
            comments: true,
          },
        },
      },
      orderBy: { scheduledAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.liveStream.count({
      where: { vendorId },
    });

    return { streams, total };
  }

  /**
   * Join stream (create view record)
   */
  async joinStream(streamId: string, userId?: string, sessionId?: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new ApiError(404, 'Stream not found');
    }

    if (stream.status !== LiveStreamStatus.LIVE) {
      throw new ApiError(400, 'Stream is not live');
    }

    // Check if already viewing
    const existingView = await prisma.liveStreamView.findFirst({
      where: {
        streamId,
        ...(userId ? { userId } : { sessionId }),
        leftAt: null,
      },
    });

    if (existingView) {
      return existingView; // Already viewing
    }

    // Create new view
    const view = await prisma.liveStreamView.create({
      data: {
        streamId,
        userId,
        sessionId: sessionId || this.generateSessionId(),
      },
    });

    // Update view count and peak viewers
    const currentViewers = await prisma.liveStreamView.count({
      where: {
        streamId,
        leftAt: null,
      },
    });

    await prisma.liveStream.update({
      where: { id: streamId },
      data: {
        viewCount: { increment: 1 },
        peakViewers: Math.max(stream.peakViewers, currentViewers),
      },
    });

    return view;
  }

  /**
   * Leave stream
   */
  async leaveStream(viewId: string) {
    const view = await prisma.liveStreamView.findUnique({
      where: { id: viewId },
    });

    if (!view || view.leftAt) {
      return;
    }

    const duration = Math.floor(
      (Date.now() - view.joinedAt.getTime()) / 1000
    );

    await prisma.liveStreamView.update({
      where: { id: viewId },
      data: {
        leftAt: new Date(),
        duration,
      },
    });
  }

  /**
   * Post comment on stream
   */
  async postComment(streamId: string, userId: string, message: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new ApiError(404, 'Stream not found');
    }

    if (stream.status !== LiveStreamStatus.LIVE) {
      throw new ApiError(400, 'Cannot comment on inactive stream');
    }

    const comment = await prisma.liveStreamComment.create({
      data: {
        streamId,
        userId,
        message,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    return comment;
  }

  /**
   * Get stream comments
   */
  async getStreamComments(streamId: string, limit = 50, offset = 0) {
    const comments = await prisma.liveStreamComment.findMany({
      where: {
        streamId,
        isDeleted: false,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return comments.reverse(); // Oldest first for chat display
  }

  /**
   * Pin comment
   */
  async pinComment(commentId: string, vendorId: string) {
    const comment = await prisma.liveStreamComment.findUnique({
      where: { id: commentId },
      include: { stream: true },
    });

    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    if (comment.stream.vendorId !== vendorId) {
      throw new ApiError(403, 'Not authorized');
    }

    // Unpin other comments
    await prisma.liveStreamComment.updateMany({
      where: {
        streamId: comment.streamId,
        isPinned: true,
      },
      data: { isPinned: false },
    });

    // Pin this comment
    await prisma.liveStreamComment.update({
      where: { id: commentId },
      data: { isPinned: true },
    });
  }

  /**
   * Delete comment
   */
  async deleteComment(commentId: string, userId: string, isAdmin = false) {
    const comment = await prisma.liveStreamComment.findUnique({
      where: { id: commentId },
      include: { stream: true },
    });

    if (!comment) {
      throw new ApiError(404, 'Comment not found');
    }

    // Check authorization
    const isOwner = comment.userId === userId;
    const isVendor = comment.stream.vendorId === userId;

    if (!isOwner && !isVendor && !isAdmin) {
      throw new ApiError(403, 'Not authorized to delete this comment');
    }

    await prisma.liveStreamComment.update({
      where: { id: commentId },
      data: { isDeleted: true },
    });
  }

  /**
   * Update stream
   */
  async updateStream(
    streamId: string,
    vendorId: string,
    data: Partial<{
      title: string;
      description: string;
      thumbnail: string;
      scheduledAt: Date;
      tags: string[];
    }>
  ) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new ApiError(404, 'Stream not found');
    }

    if (stream.vendorId !== vendorId) {
      throw new ApiError(403, 'Not authorized');
    }

    if (stream.status === LiveStreamStatus.LIVE) {
      throw new ApiError(400, 'Cannot update live stream');
    }

    const updated = await prisma.liveStream.update({
      where: { id: streamId },
      data,
    });

    return updated;
  }

  /**
   * Cancel stream
   */
  async cancelStream(streamId: string, vendorId: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new ApiError(404, 'Stream not found');
    }

    if (stream.vendorId !== vendorId) {
      throw new ApiError(403, 'Not authorized');
    }

    if (stream.status !== LiveStreamStatus.SCHEDULED) {
      throw new ApiError(400, 'Only scheduled streams can be cancelled');
    }

    await prisma.liveStream.update({
      where: { id: streamId },
      data: { status: LiveStreamStatus.CANCELLED },
    });
  }

  /**
   * Get stream analytics
   */
  async getStreamAnalytics(streamId: string, vendorId: string) {
    const stream = await prisma.liveStream.findUnique({
      where: { id: streamId },
    });

    if (!stream) {
      throw new ApiError(404, 'Stream not found');
    }

    if (stream.vendorId !== vendorId) {
      throw new ApiError(403, 'Not authorized');
    }

    const views = await prisma.liveStreamView.findMany({
      where: { streamId },
    });

    const totalViews = views.length;
    const uniqueViewers = new Set(
      views.map((v) => v.userId || v.sessionId)
    ).size;

    const avgDuration = views.length > 0
      ? views
          .filter((v) => v.duration)
          .reduce((sum, v) => sum + (v.duration || 0), 0) / views.length
      : 0;

    const comments = await prisma.liveStreamComment.count({
      where: { streamId },
    });

    return {
      totalViews,
      uniqueViewers,
      peakViewers: stream.peakViewers,
      avgDuration: Math.floor(avgDuration),
      totalComments: comments,
      engagementRate:
        totalViews > 0 ? (comments / totalViews) * 100 : 0,
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private generateStreamKey(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

export default new LiveStreamService();
