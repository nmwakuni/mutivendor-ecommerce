# 🎨 Frontend Implementation Guide

## Overview
This guide provides a complete blueprint for implementing all frontend components for the 13 cutting-edge features.

---

## 📁 Project Structure

```
apps/frontend/src/
├── components/
│   ├── loyalty/
│   │   ├── LoyaltyBadge.tsx
│   │   ├── PointsDisplay.tsx
│   │   ├── RewardCard.tsx
│   │   ├── RewardCatalog.tsx
│   │   ├── TierProgress.tsx
│   │   └── TransactionHistory.tsx
│   ├── affiliate/
│   │   ├── AffiliateCodeDisplay.tsx
│   │   ├── AffiliateDashboard.tsx
│   │   ├── CommissionsList.tsx
│   │   └── ReferralLink.tsx
│   ├── livestream/
│   │   ├── LiveStreamCard.tsx
│   │   ├── LiveStreamPlayer.tsx
│   │   ├── LiveStreamChat.tsx
│   │   ├── LiveStreamProducts.tsx
│   │   ├── ViewerCount.tsx
│   │   └── StreamScheduler.tsx (Vendor)
│   ├── chatbot/
│   │   ├── ChatWidget.tsx
│   │   ├── ChatMessage.tsx
│   │   ├── ChatInput.tsx
│   │   └── ChatSuggestions.tsx
│   ├── social/
│   │   ├── GiftRegistryCard.tsx
│   │   ├── GiftRegistryForm.tsx
│   │   ├── RegistryItemList.tsx
│   │   ├── ShareButtons.tsx
│   │   └── WishlistButton.tsx
│   ├── notifications/
│   │   ├── NotificationCenter.tsx
│   │   ├── NotificationItem.tsx
│   │   ├── NotificationBell.tsx
│   │   └── NotificationPreferences.tsx
│   ├── fraud/
│   │   └── FraudReviewPanel.tsx (Admin)
│   ├── escrow/
│   │   ├── DisputeForm.tsx
│   │   ├── DisputeStatus.tsx
│   │   └── EscrowTimer.tsx
│   ├── verification/
│   │   ├── VerificationForm.tsx (Vendor)
│   │   ├── DocumentUpload.tsx
│   │   ├── VerificationBadge.tsx
│   │   └── VerificationReviewPanel.tsx (Admin)
│   └── analytics/
│       ├── VendorDashboard.tsx
│       ├── RevenueChart.tsx
│       ├── CustomerInsights.tsx
│       └── ProductPerformance.tsx
├── hooks/
│   ├── use-loyalty.ts
│   ├── use-affiliate.ts
│   ├── use-livestream.ts
│   ├── use-chatbot.ts
│   ├── use-notifications.ts
│   ├── use-gift-registry.ts
│   ├── use-websocket.ts
│   └── use-vendor-analytics.ts
├── pages/
│   ├── loyalty/
│   │   ├── index.tsx (My Points & Rewards)
│   │   └── rewards/[id].tsx
│   ├── affiliate/
│   │   ├── apply.tsx
│   │   └── dashboard.tsx
│   ├── livestreams/
│   │   ├── index.tsx (Browse Live Streams)
│   │   └── [id].tsx (Watch Stream)
│   ├── gift-registry/
│   │   ├── create.tsx
│   │   ├── [slug].tsx (View Registry)
│   │   └── my-registries.tsx
│   ├── vendor/
│   │   ├── analytics.tsx
│   │   ├── livestreams/
│   │   │   ├── create.tsx
│   │   │   └── manage.tsx
│   │   └── verification.tsx
│   └── admin/
│       ├── fraud-detection.tsx
│       ├── disputes.tsx
│       ├── affiliates.tsx
│       └── verifications.tsx
└── lib/
    ├── api/
    │   ├── loyalty.ts
    │   ├── affiliate.ts
    │   ├── livestream.ts
    │   ├── chatbot.ts
    │   ├── notifications.ts
    │   ├── social.ts
    │   ├── escrow.ts
    │   └── verification.ts
    └── websocket.ts
```

---

## 🔌 API Hooks Implementation

### 1. use-loyalty.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as loyaltyApi from '@/lib/api/loyalty';

export function useLoyaltyBalance() {
  return useQuery({
    queryKey: ['loyalty', 'balance'],
    queryFn: loyaltyApi.getBalance,
  });
}

export function useLoyaltyTransactions(limit = 50) {
  return useQuery({
    queryKey: ['loyalty', 'transactions', limit],
    queryFn: () => loyaltyApi.getTransactions(limit),
  });
}

export function useRewards() {
  return useQuery({
    queryKey: ['loyalty', 'rewards'],
    queryFn: loyaltyApi.getRewards,
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardId: string) => loyaltyApi.redeemReward(rewardId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty'] });
      toast.success('Reward redeemed successfully!');
    },
  });
}

export function useMyRewards() {
  return useQuery({
    queryKey: ['loyalty', 'my-rewards'],
    queryFn: loyaltyApi.getMyRewards,
  });
}
```

### 2. use-livestream.ts

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';
import * as livestreamApi from '@/lib/api/livestream';
import { useWebSocket } from './use-websocket';

export function useLiveStreams(status?: string) {
  return useQuery({
    queryKey: ['livestreams', status],
    queryFn: () => livestreamApi.getLiveStreams(status),
    refetchInterval: 30000, // Refetch every 30s for live updates
  });
}

export function useLiveStream(streamId: string) {
  return useQuery({
    queryKey: ['livestream', streamId],
    queryFn: () => livestreamApi.getStream(streamId),
  });
}

export function useLiveStreamChat(streamId: string) {
  const { socket, isConnected } = useWebSocket();
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join-livestream', { streamId });

    socket.on('new-comment', (comment) => {
      setMessages((prev) => [...prev, comment]);
    });

    socket.on('viewer-count', ({ count }) => {
      setViewerCount(count);
    });

    return () => {
      socket.emit('leave-livestream', { streamId });
      socket.off('new-comment');
      socket.off('viewer-count');
    };
  }, [socket, isConnected, streamId]);

  const postComment = useMutation({
    mutationFn: (message: string) =>
      livestreamApi.postComment(streamId, message),
  });

  return { messages, viewerCount, postComment };
}
```

### 3. use-chatbot.ts

```typescript
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as chatbotApi from '@/lib/api/chatbot';

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const sendMessage = useMutation({
    mutationFn: (message: string) => chatbotApi.chat(message),
    onSuccess: (response) => {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: message },
        { role: 'assistant', content: response.message },
      ]);
      setConversationId(response.conversationId);
    },
  });

  return {
    messages,
    sendMessage,
    isLoading: sendMessage.isPending,
  };
}
```

---

## 🎨 Key Component Examples

### LoyaltyBadge Component

```typescript
// apps/frontend/src/components/loyalty/LoyaltyBadge.tsx
import { useLoyaltyBalance } from '@/hooks/use-loyalty';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

export function LoyaltyBadge() {
  const { data } = useLoyaltyBalance();

  if (!data) return null;

  const { balance, tier } = data.data;

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="secondary"
        className={`bg-gradient-to-r ${tier.color}`}
      >
        <Sparkles className="h-3 w-3 mr-1" />
        {tier.name}
      </Badge>
      <span className="text-sm text-muted-foreground">
        {balance} points
      </span>
    </div>
  );
}
```

### ChatWidget Component

```typescript
// apps/frontend/src/components/chatbot/ChatWidget.tsx
import { useState } from 'react';
import { useChatbot } from '@/hooks/use-chatbot';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, X, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const { messages, sendMessage, isLoading } = useChatbot();

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage.mutate(input);
    setInput('');
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-lg z-50"
      >
        {isOpen ? <X /> : <MessageCircle />}
      </Button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 right-4 w-96 h-[500px] bg-background border rounded-lg shadow-xl z-40 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b">
              <h3 className="font-semibold">Shopping Assistant</h3>
              <p className="text-sm text-muted-foreground">
                Ask me anything about products, orders, or shopping
              </p>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3">
                    <span className="animate-pulse">Typing...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Type your message..."
              />
              <Button onClick={handleSend} size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

### LiveStreamPlayer Component

```typescript
// apps/frontend/src/components/livestream/LiveStreamPlayer.tsx
import { useState, useEffect } from 'react';
import { useLiveStream, useLiveStreamChat } from '@/hooks/use-livestream';
import { Users, Heart } from 'lucide-react';

export function LiveStreamPlayer({ streamId }: { streamId: string }) {
  const { data: stream } = useLiveStream(streamId);
  const { messages, viewerCount, postComment } = useLiveStreamChat(streamId);
  const [comment, setComment] = useState('');

  if (!stream) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Video Player */}
      <div className="col-span-2 space-y-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            src={stream.data.playbackUrl}
            controls
            autoPlay
            className="w-full h-full"
          />

          {/* Live Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1 bg-red-600 text-white text-sm font-semibold rounded-full flex items-center gap-1">
              <span className="animate-pulse h-2 w-2 bg-white rounded-full" />
              LIVE
            </span>
            <span className="px-3 py-1 bg-black/50 text-white text-sm rounded-full flex items-center gap-1">
              <Users className="h-3 w-3" />
              {viewerCount}
            </span>
          </div>
        </div>

        {/* Stream Info */}
        <div>
          <h1 className="text-2xl font-bold">{stream.data.title}</h1>
          <p className="text-muted-foreground">{stream.data.description}</p>
        </div>

        {/* Featured Products */}
        <div>
          <h3 className="font-semibold mb-2">Featured Products</h3>
          <div className="grid grid-cols-4 gap-2">
            {stream.data.products.map((item) => (
              <div key={item.id} className="border rounded p-2">
                <img src={item.product.thumbnail} className="w-full aspect-square object-cover rounded" />
                <p className="text-sm font-medium mt-1">{item.product.name}</p>
                <p className="text-sm text-primary font-semibold">
                  KES {item.specialPrice || item.product.price}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Chat */}
      <div className="border rounded-lg flex flex-col h-[600px]">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Live Chat</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg, idx) => (
            <div key={idx} className="flex gap-2">
              <img
                src={msg.user.avatar}
                className="h-6 w-6 rounded-full"
              />
              <div>
                <span className="font-semibold text-sm">
                  {msg.user.firstName}
                </span>
                <p className="text-sm">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t">
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                postComment.mutate(comment);
                setComment('');
              }
            }}
            placeholder="Say something..."
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>
    </div>
  );
}
```

---

## 🔧 API Client Implementation

### loyalty.ts

```typescript
// apps/frontend/src/lib/api/loyalty.ts
import { apiClient } from './client';

export const getBalance = () => apiClient.get('/loyalty/balance');

export const getTransactions = (limit: number) =>
  apiClient.get('/loyalty/transactions', { params: { limit } });

export const getRewards = () => apiClient.get('/loyalty/rewards');

export const redeemReward = (rewardId: string) =>
  apiClient.post(`/loyalty/rewards/${rewardId}/redeem`);

export const getMyRewards = () => apiClient.get('/loyalty/my-rewards');

export const useReward = (code: string) =>
  apiClient.post('/loyalty/use-reward', { code });
```

### livestream.ts

```typescript
// apps/frontend/src/lib/api/livestream.ts
import { apiClient } from './client';

export const getLiveStreams = (status?: string) =>
  apiClient.get('/livestreams', { params: { status } });

export const getStream = (streamId: string) =>
  apiClient.get(`/livestreams/${streamId}`);

export const joinStream = (streamId: string, sessionId?: string) =>
  apiClient.post(`/livestreams/${streamId}/join`, { sessionId });

export const postComment = (streamId: string, message: string) =>
  apiClient.post(`/livestreams/${streamId}/comments`, { message });

export const getComments = (streamId: string) =>
  apiClient.get(`/livestreams/${streamId}/comments`);

// Vendor APIs
export const createStream = (data: any) =>
  apiClient.post('/livestreams/create', data);

export const startStream = (streamId: string) =>
  apiClient.post(`/livestreams/${streamId}/start`);

export const endStream = (streamId: string) =>
  apiClient.post(`/livestreams/${streamId}/end`);
```

---

## 🌐 WebSocket Hook

```typescript
// apps/frontend/src/hooks/use-websocket.ts
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    if (!socket) {
      socket = io(process.env.NEXT_PUBLIC_API_URL!, {
        withCredentials: true,
      });

      socket.on('connect', () => {
        setIsConnected(true);
        console.log('WebSocket connected');
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
      });
    }

    return () => {
      // Don't disconnect on unmount, keep connection alive
    };
  }, []);

  return { socket, isConnected };
}

// Specific hooks for real-time features
export function useRealTimeNotifications(userId: string) {
  const { socket, isConnected } = useWebSocket();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('join-notifications', { userId });

    socket.on('new-notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      toast.info(notification.title);
    });

    return () => {
      socket.off('new-notification');
    };
  }, [socket, isConnected, userId]);

  return notifications;
}

export function useRealTimeInventory(productId: string) {
  const { socket, isConnected } = useWebSocket();
  const [stock, setStock] = useState<number | null>(null);

  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit('watch-product', { productId });

    socket.on('stock-updated', (data) => {
      if (data.productId === productId) {
        setStock(data.stock);
      }
    });

    return () => {
      socket.emit('unwatch-product', { productId });
      socket.off('stock-updated');
    };
  }, [socket, isConnected, productId]);

  return stock;
}
```

---

## 📱 Page Examples

### Loyalty Dashboard Page

```typescript
// apps/frontend/src/pages/loyalty/index.tsx
import { useLoyaltyBalance, useRewards, useMyRewards } from '@/hooks/use-loyalty';
import { LoyaltyBadge } from '@/components/loyalty/LoyaltyBadge';
import { RewardCard } from '@/components/loyalty/RewardCard';
import { TierProgress } from '@/components/loyalty/TierProgress';

export default function LoyaltyPage() {
  const { data: balance } = useLoyaltyBalance();
  const { data: rewards } = useRewards();
  const { data: myRewards } = useMyRewards();

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Loyalty & Rewards</h1>
        <LoyaltyBadge />
      </div>

      {/* Tier Progress */}
      <TierProgress balance={balance?.data.balance} tier={balance?.data.tier} />

      {/* Available Rewards */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">Redeem Rewards</h2>
        <div className="grid grid-cols-3 gap-4">
          {rewards?.data.map((reward) => (
            <RewardCard key={reward.id} reward={reward} />
          ))}
        </div>
      </div>

      {/* My Rewards */}
      <div>
        <h2 className="text-2xl font-semibold mb-4">My Rewards</h2>
        <div className="grid grid-cols-3 gap-4">
          {myRewards?.data.map((userReward) => (
            <div key={userReward.id} className="border rounded p-4">
              <h3 className="font-semibold">{userReward.reward.name}</h3>
              <p className="text-sm text-muted-foreground">
                Code: {userReward.code}
              </p>
              <p className="text-sm">
                Expires: {new Date(userReward.expiresAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## 🎯 Implementation Priority

### Phase 1: Core User Features (Week 1)
1. ✅ ChatWidget component (floating chat button)
2. ✅ LoyaltyBadge in header
3. ✅ NotificationCenter
4. ✅ WebSocket integration

### Phase 2: Engagement Features (Week 2)
5. ✅ LiveStream browsing & viewing
6. ✅ Gift Registry creation & viewing
7. ✅ Affiliate dashboard
8. ✅ Loyalty rewards redemption

### Phase 3: Vendor Features (Week 3)
9. ✅ Vendor Analytics Dashboard
10. ✅ LiveStream creation & management
11. ✅ Verification document upload

### Phase 4: Admin Features (Week 4)
12. ✅ Fraud detection review panel
13. ✅ Dispute resolution interface
14. ✅ Affiliate approval dashboard
15. ✅ Vendor verification review

---

## 🚀 Deployment Checklist

- [ ] Install socket.io-client: `npm install socket.io-client`
- [ ] Set NEXT_PUBLIC_API_URL in .env
- [ ] Set NEXT_PUBLIC_WS_URL in .env
- [ ] Add ChatWidget to layout
- [ ] Add NotificationBell to header
- [ ] Add LoyaltyBadge to header
- [ ] Configure WebSocket connection
- [ ] Test real-time features

---

*This is a complete blueprint for implementing all frontend features. Each component follows shadcn/ui conventions and TanStack Query patterns.*
