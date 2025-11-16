import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import chatbotService from '../services/chatbot.service';
import { chatMessageSchema } from '../validations/chatbot.validation';

class ChatbotController {
  /**
   * Send message to chatbot
   * POST /api/chatbot/message
   */
  sendMessage = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { message, sessionId } = chatMessageSchema.parse(req.body);

    const response = await chatbotService.handleMessage(userId, message, sessionId);

    res.json({
      success: true,
      data: response,
    });
  });

  /**
   * Get chat history
   * GET /api/chatbot/history
   */
  getHistory = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = req.query;

    const history = await chatbotService.getChatHistory(
      userId,
      sessionId as string | undefined
    );

    res.json({
      success: true,
      data: history,
    });
  });

  /**
   * Get all chat sessions for user
   * GET /api/chatbot/sessions
   */
  getSessions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const sessions = await chatbotService.getUserSessions(userId);

    res.json({
      success: true,
      data: sessions,
    });
  });

  /**
   * Clear chat session
   * DELETE /api/chatbot/session/:sessionId
   */
  clearSession = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = req.params;

    await chatbotService.clearSession(userId, sessionId);

    res.json({
      success: true,
      message: 'Chat session cleared',
    });
  });

  /**
   * Get suggested questions
   * GET /api/chatbot/suggestions
   */
  getSuggestions = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const suggestions = await chatbotService.getSuggestedQuestions(userId);

    res.json({
      success: true,
      data: suggestions,
    });
  });

  /**
   * Rate chatbot response
   * POST /api/chatbot/rate/:messageId
   */
  rateResponse = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { messageId } = req.params;
    const { rating, feedback } = req.body;

    await chatbotService.rateResponse(userId, messageId, rating, feedback);

    res.json({
      success: true,
      message: 'Thank you for your feedback',
    });
  });

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  /**
   * Get chatbot analytics
   * GET /api/chatbot/admin/analytics
   */
  getAnalytics = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const analytics = await chatbotService.getAnalytics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: analytics,
    });
  });

  /**
   * Get all chat conversations (admin monitoring)
   * GET /api/chatbot/admin/conversations
   */
  getAllConversations = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, userId, sessionId } = req.query;

    const conversations = await chatbotService.getAllConversations({
      page: Number(page),
      limit: Number(limit),
      userId: userId as string | undefined,
      sessionId: sessionId as string | undefined,
    });

    res.json({
      success: true,
      data: conversations,
    });
  });

  /**
   * Get unanswered or low-rated queries
   * GET /api/chatbot/admin/problem-queries
   */
  getProblemQueries = asyncHandler(async (req: Request, res: Response) => {
    const queries = await chatbotService.getProblemQueries();

    res.json({
      success: true,
      data: queries,
    });
  });
}

export default new ChatbotController();
