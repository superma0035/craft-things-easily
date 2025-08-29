/**
 * Application constants and configuration
 */

// Order statuses
export const ORDER_STATUSES = {
  PENDING: 'pending',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  CANCELLED: 'cancelled',
} as const;

export type OrderStatus = typeof ORDER_STATUSES[keyof typeof ORDER_STATUSES];

// Order status labels and colors
export const ORDER_STATUS_CONFIG = {
  [ORDER_STATUSES.PENDING]: {
    label: 'Pending',
    variant: 'warning' as const,
    description: 'Order received, waiting to be prepared'
  },
  [ORDER_STATUSES.PREPARING]: {
    label: 'Preparing',
    variant: 'info' as const,
    description: 'Kitchen is preparing your order'
  },
  [ORDER_STATUSES.READY]: {
    label: 'Ready',
    variant: 'success' as const,
    description: 'Order is ready for pickup/serving'
  },
  [ORDER_STATUSES.SERVED]: {
    label: 'Served',
    variant: 'success' as const,
    description: 'Order has been delivered to customer'
  },
  [ORDER_STATUSES.CANCELLED]: {
    label: 'Cancelled',
    variant: 'error' as const,
    description: 'Order was cancelled'
  },
};

// Session configuration
export const SESSION_CONFIG = {
  DURATION_HOURS: 2,
  REFRESH_INTERVAL_MS: 60000, // 1 minute
  WARNING_THRESHOLD_MINUTES: 15,
  RATE_LIMIT_REQUESTS: 10,
  RATE_LIMIT_WINDOW_MS: 300000, // 5 minutes
};

// Table configuration
export const TABLE_CONFIG = {
  MIN_CAPACITY: 1,
  MAX_CAPACITY: 20,
  DEFAULT_CAPACITY: 4,
  QR_CODE_SIZE: 256,
};

// Menu configuration
export const MENU_CONFIG = {
  MAX_ITEMS_PER_CATEGORY: 100,
  MAX_CATEGORIES: 50,
  IMAGE_MAX_SIZE_MB: 5,
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};

// Validation constants
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 30,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  PHONE_MAX_LENGTH: 20,
  EMAIL_MAX_LENGTH: 255,
};

// API configuration
export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
};

// Storage buckets
export const STORAGE_BUCKETS = {
  RESTAURANT_ASSETS: 'restaurant-assets',
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'Requested resource not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please refresh the page.',
  RATE_LIMITED: 'Too many requests. Please try again later.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  ITEM_CREATED: 'Item created successfully!',
  ITEM_UPDATED: 'Item updated successfully!',
  ITEM_DELETED: 'Item deleted successfully!',
  ORDER_PLACED: 'Order placed successfully!',
  ORDER_UPDATED: 'Order status updated!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
};

// Feature flags (for production rollouts)
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_SUBSCRIPTIONS: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_MULTI_LANGUAGE: false,
  ENABLE_DARK_MODE: true,
  ENABLE_CUSTOMER_FEEDBACK: true,
};

// Environment checks
export const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default {
  ORDER_STATUSES,
  ORDER_STATUS_CONFIG,
  SESSION_CONFIG,
  TABLE_CONFIG,
  MENU_CONFIG,
  VALIDATION,
  API_CONFIG,
  STORAGE_BUCKETS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  FEATURE_FLAGS,
  IS_DEVELOPMENT,
  IS_PRODUCTION,
};