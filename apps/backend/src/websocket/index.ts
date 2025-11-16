import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { prisma } from '../lib/prisma';

let io: Server;

export const initializeWebSocket = (server: HTTPServer) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // ============================================
    // LIVE STREAM EVENTS
    // ============================================

    socket.on('join-livestream', async (data: { streamId: string }) => {
      const { streamId } = data;
      await socket.join(`livestream:${streamId}`);

      // Broadcast viewer count update
      const viewerCount = (await io.in(`livestream:${streamId}`).allSockets()).size;
      io.to(`livestream:${streamId}`).emit('viewer-count', { count: viewerCount });
    });

    socket.on('leave-livestream', async (data: { streamId: string }) => {
      const { streamId } = data;
      await socket.leave(`livestream:${streamId}`);

      const viewerCount = (await io.in(`livestream:${streamId}`).allSockets()).size;
      io.to(`livestream:${streamId}`).emit('viewer-count', { count: viewerCount });
    });

    socket.on('livestream-comment', (data: { streamId: string; comment: any }) => {
      const { streamId, comment } = data;
      io.to(`livestream:${streamId}`).emit('new-comment', comment);
    });

    socket.on('livestream-pin-comment', (data: { streamId: string; commentId: string }) => {
      const { streamId, commentId } = data;
      io.to(`livestream:${streamId}`).emit('comment-pinned', { commentId });
    });

    // ============================================
    // PRODUCT INVENTORY EVENTS
    // ============================================

    socket.on('watch-product', (data: { productId: string }) => {
      const { productId } = data;
      socket.join(`product:${productId}`);
    });

    socket.on('unwatch-product', (data: { productId: string }) => {
      const { productId } = data;
      socket.leave(`product:${productId}`);
    });

    // ============================================
    // CHATBOT EVENTS
    // ============================================

    socket.on('join-chat', (data: { conversationId: string }) => {
      const { conversationId } = data;
      socket.join(`chat:${conversationId}`);
    });

    socket.on('chat-typing', (data: { conversationId: string; isTyping: boolean }) => {
      const { conversationId, isTyping } = data;
      socket.to(`chat:${conversationId}`).emit('user-typing', { isTyping });
    });

    // ============================================
    // NOTIFICATION EVENTS
    // ============================================

    socket.on('join-notifications', (data: { userId: string }) => {
      const { userId } = data;
      socket.join(`notifications:${userId}`);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error('WebSocket not initialized. Call initializeWebSocket first.');
  }
  return io;
};

// ============================================
// UTILITY FUNCTIONS FOR EMITTING EVENTS
// ============================================

export const emitProductStockUpdate = (productId: string, stock: number) => {
  if (!io) return;
  io.to(`product:${productId}`).emit('stock-updated', { productId, stock });
};

export const emitNotification = (userId: string, notification: any) => {
  if (!io) return;
  io.to(`notifications:${userId}`).emit('new-notification', notification);
};

export const emitLivestreamUpdate = (streamId: string, event: string, data: any) => {
  if (!io) return;
  io.to(`livestream:${streamId}`).emit(event, data);
};

export const broadcastToAll = (event: string, data: any) => {
  if (!io) return;
  io.emit(event, data);
};
