import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Users } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { useAuth } from '../context/AuthContext';
import { useChatWebSocket } from '../hooks/useChatWebSocket';
import { ChatNotification } from './ChatNotification';

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system';
}

interface OnlineUser {
  userId: string;
  userName: string;
  joinedAt: number;
}

export function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [showOnlineUsers, setShowOnlineUsers] = useState(false);
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const {
    messages,
    onlineUsers,
    isConnected,
    sendMessage,
    sendTypingIndicator,
  } = useChatWebSocket(currentWorkspace?.id || null);

  const [unreadCount, setUnreadCount] = useState(0);
  const prevMessagesLengthRef = React.useRef(messages.length);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<{userName: string; content: string} | null>(null);

  // Play notification sound for new messages
  const playNotificationSound = () => {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  };

  // Detect new messages and play sound
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;

    if (hasNewMessages && messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      const isFromOtherUser = latestMessage.userId !== user?.id;

      // Play sound and show notification for messages from other users
      if (isFromOtherUser) {
        playNotificationSound();

        // Show popup notification if chat is closed
        if (!isOpen) {
          setNotificationMessage({
            userName: latestMessage.userName,
            content: latestMessage.content
          });
          setShowNotification(true);
          setUnreadCount(prev => prev + 1);
        }
      }
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, isOpen, user?.id]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (message.trim() && isConnected) {
      sendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    sendTypingIndicator();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentWorkspace) {
    return null;
  }

  return (
    <>
      {/* Chat Bubble Button */}
      <div className="fixed bottom-6 right-6 z-50">
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="relative bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
          >
            <MessageCircle className="h-6 w-6" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {onlineUsers.length > 0 && (
              <span className="absolute -top-1 -left-1 bg-green-500 rounded-full h-3 w-3 border-2 border-white"></span>
            )}
          </button>
        )}
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white dark:bg-gray-800 rounded-lg shadow-2xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Team Chat
              </h3>
              {!isConnected && (
                <span className="text-xs text-red-500">(Disconnected)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOnlineUsers(!showOnlineUsers)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Users className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                {onlineUsers.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {onlineUsers.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          {/* Online Users Dropdown */}
          {showOnlineUsers && (
            <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Online Now ({onlineUsers.length})
              </h4>
              <div className="space-y-1">
                {onlineUsers.map(user => (
                  <div key={user.userId} className="flex items-center gap-2 text-sm">
                    <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                    <span className="text-gray-900 dark:text-white">{user.userName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <p className="text-center">
                  No messages yet.<br />
                  Start the conversation!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isCurrentUser = msg.userId === user?.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] ${
                        isCurrentUser
                          ? 'bg-blue-600 text-white rounded-br-none'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
                      } rounded-lg px-3 py-2`}
                    >
                      {!isCurrentUser && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {msg.userName}
                        </p>
                      )}
                      <p className="text-sm break-words">{msg.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isCurrentUser ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  handleTyping();
                }}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                disabled={!isConnected}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || !isConnected}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-lg px-4 py-2 transition-colors disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
            {!isConnected && (
              <p className="text-xs text-red-500 mt-2">
                Connecting to chat...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Popup Notification */}
      {showNotification && notificationMessage && (
        <ChatNotification
          message={notificationMessage}
          onClose={() => setShowNotification(false)}
          onClick={() => {
            setShowNotification(false);
            setIsOpen(true);
          }}
        />
      )}
    </>
  );
}
