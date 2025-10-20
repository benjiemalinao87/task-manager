import React, { useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface ChatNotificationProps {
  message: {
    userName: string;
    content: string;
  };
  onClose: () => void;
  onClick: () => void;
}

export function ChatNotification({ message, onClose, onClick }: ChatNotificationProps) {
  useEffect(() => {
    // Auto-close after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      onClick={onClick}
      className="fixed bottom-24 right-6 z-50 max-w-sm bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 cursor-pointer transform transition-all duration-300 hover:scale-105 animate-slide-in-right"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="bg-blue-600 rounded-full p-2">
              <MessageCircle className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              {message.userName}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
              {message.content}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-b-lg overflow-hidden">
        <div className="h-full bg-blue-600 animate-progress-bar"></div>
      </div>
    </div>
  );
}
