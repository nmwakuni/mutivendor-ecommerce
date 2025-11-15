import { Request, Response } from 'express';
import livestreamService from '../services/livestream.service';
import { asyncHandler } from '../utils/asyncHandler';
import * as validation from '../validations/livestream.validation';

class LiveStreamController {
  // Vendor endpoints
  createStream = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.vendor!.id;
    const data = validation.createStreamSchema.parse(req.body);

    const stream = await livestreamService.createStream(vendorId, {
      ...data,
      scheduledAt: new Date(data.scheduledAt),
    });

    res.status(201).json({
      success: true,
      message: 'Live stream created successfully',
      data: stream,
    });
  });

  updateStream = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.vendor!.id;
    const { streamId } = req.params;
    const data = validation.updateStreamSchema.parse(req.body);

    const stream = await livestreamService.updateStream(streamId, vendorId, {
      ...data,
      ...(data.scheduledAt && { scheduledAt: new Date(data.scheduledAt) }),
    });

    res.json({
      success: true,
      message: 'Stream updated successfully',
      data: stream,
    });
  });

  startStream = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.vendor!.id;
    const { streamId } = req.params;

    const stream = await livestreamService.startStream(streamId, vendorId);

    res.json({
      success: true,
      message: 'Stream started successfully',
      data: stream,
    });
  });

  endStream = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.vendor!.id;
    const { streamId } = req.params;

    const stream = await livestreamService.endStream(streamId, vendorId);

    res.json({
      success: true,
      message: 'Stream ended successfully',
      data: stream,
    });
  });

  getVendorStreams = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.vendor!.id;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await livestreamService.getVendorStreams(vendorId, limit, offset);

    res.json({
      success: true,
      data: result,
    });
  });

  addProducts = asyncHandler(async (req: Request, res: Response) => {
    const { streamId } = req.params;
    const data = validation.addProductsToStreamSchema.parse(req.body);

    const products = await livestreamService.addProductsToStream(
      streamId,
      data.productIds,
      data.specialPrices
    );

    res.json({
      success: true,
      message: 'Products added to stream',
      data: products,
    });
  });

  // Public/User endpoints
  getLiveStreams = asyncHandler(async (req: Request, res: Response) => {
    const status = req.query.status as any;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await livestreamService.getLiveStreams(status, limit, offset);

    res.json({
      success: true,
      data: result,
    });
  });

  getStream = asyncHandler(async (req: Request, res: Response) => {
    const { streamId } = req.params;
    const stream = await livestreamService.getStreamById(streamId);

    res.json({
      success: true,
      data: stream,
    });
  });

  joinStream = asyncHandler(async (req: Request, res: Response) => {
    const { streamId } = req.params;
    const userId = req.user?.id;
    const { sessionId } = validation.joinStreamSchema.parse(req.body);

    const view = await livestreamService.joinStream(streamId, userId, sessionId);

    res.json({
      success: true,
      message: 'Joined stream successfully',
      data: view,
    });
  });

  leaveStream = asyncHandler(async (req: Request, res: Response) => {
    const { viewId } = req.params;
    await livestreamService.leaveStream(viewId);

    res.json({
      success: true,
      message: 'Left stream successfully',
    });
  });

  postComment = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { streamId } = req.params;
    const { message } = validation.postCommentSchema.parse(req.body);

    const comment = await livestreamService.postComment(streamId, userId, message);

    res.status(201).json({
      success: true,
      data: comment,
    });
  });

  getComments = asyncHandler(async (req: Request, res: Response) => {
    const { streamId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const comments = await livestreamService.getStreamComments(streamId, limit, offset);

    res.json({
      success: true,
      data: comments,
    });
  });

  getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const vendorId = req.vendor!.id;
    const { streamId } = req.params;

    const analytics = await livestreamService.getStreamAnalytics(streamId, vendorId);

    res.json({
      success: true,
      data: analytics,
    });
  });
}

export default new LiveStreamController();
