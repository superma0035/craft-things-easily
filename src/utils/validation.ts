import { z } from 'zod';

/**
 * Validation schemas for forms and data
 */

// Restaurant validation
export const restaurantSchema = z.object({
  name: z.string().min(1, 'Restaurant name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  address: z.string().max(200, 'Address too long').optional(),
  phone: z.string().max(20, 'Phone too long').optional(),
  logo_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

// Menu item validation
export const menuItemSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  price: z.number().min(0, 'Price must be positive').max(10000, 'Price too high'),
  category_id: z.string().uuid('Invalid category').optional(),
  image_url: z.string().url('Invalid URL').optional().or(z.literal('')),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().min(0).default(0),
});

// Table validation
export const tableSchema = z.object({
  table_number: z.string().min(1, 'Table number is required').max(10, 'Number too long'),
  capacity: z.number().int().min(1, 'Must seat at least 1').max(20, 'Capacity too high'),
  is_active: z.boolean().default(true),
});

// Order validation
export const orderSchema = z.object({
  table_number: z.string().min(1, 'Table number is required'),
  customer_name: z.string().max(100, 'Name too long').optional(),
  notes: z.string().max(500, 'Notes too long').optional(),
  items: z.array(z.object({
    menu_item_id: z.string().uuid('Invalid item'),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').max(99, 'Quantity too high'),
    special_instructions: z.string().max(200, 'Instructions too long').optional(),
  })).min(1, 'At least one item required'),
});

// User profile validation
export const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  phone: z.string().max(20, 'Phone too long').optional(),
  avatar_url: z.string().url('Invalid URL').optional().or(z.literal('')),
});

// Auth validation
export const signUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  full_name: z.string().min(1, 'Full name is required').max(100, 'Name too long'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
});

export const signInSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Utility functions
export const validateEmail = (email: string): boolean => {
  return z.string().email().safeParse(email).success;
};

export const validatePhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 10 && phone.length <= 20;
};

export const validateUrl = (url: string): boolean => {
  return z.string().url().safeParse(url).success;
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

export type RestaurantFormData = z.infer<typeof restaurantSchema>;
export type MenuItemFormData = z.infer<typeof menuItemSchema>;
export type TableFormData = z.infer<typeof tableSchema>;
export type OrderFormData = z.infer<typeof orderSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;