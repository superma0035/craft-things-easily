import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

/**
 * Centralized error handling hook
 * Provides consistent error handling across the application
 */
export const useErrorHandler = () => {
  const { toast } = useToast();

  const handleError = useCallback(
    (error: Error | unknown, options: ErrorHandlerOptions = {}) => {
      const {
        showToast = true,
        logError = true,
        fallbackMessage = 'An unexpected error occurred'
      } = options;

      // Log error for debugging
      if (logError) {
        console.error('Error caught by useErrorHandler:', error);
      }

      // Extract error message
      let message = fallbackMessage;
      if (error instanceof Error) {
        message = error.message;
      } else if (typeof error === 'string') {
        message = error;
      }

      // Show toast notification
      if (showToast) {
        toast({
          title: 'Error',
          description: message,
          variant: 'destructive',
        });
      }

      return message;
    },
    [toast]
  );

  return { handleError };
};

export default useErrorHandler;