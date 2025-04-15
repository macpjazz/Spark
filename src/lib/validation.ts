import { z } from 'zod';

export const passwordRules = {
  minLength: { rule: (value: string) => value.length >= 8, message: 'At least 8 characters' },
  uppercase: { rule: (value: string) => /[A-Z]/.test(value), message: 'One uppercase letter' },
  lowercase: { rule: (value: string) => /[a-z]/.test(value), message: 'One lowercase letter' },
  number: { rule: (value: string) => /[0-9]/.test(value), message: 'One number' },
  special: { rule: (value: string) => /[!@#$%^&*]/.test(value), message: 'One special character (!@#$%^&*)' }
};

export const validation = {
  username(value: string): string | null {
    if (!value) return 'Username is required';
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 30) return 'Username must be less than 30 characters';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Username can only contain letters, numbers, and underscores';
    return null;
  },

  email(value: string): string | null {
    if (!value) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
    return null;
  },

  password(value: string): string | null {
    const failedRules = Object.values(passwordRules)
      .filter(rule => !rule.rule(value))
      .map(rule => rule.message);
    
    return failedRules.length > 0 ? failedRules.join(', ') : null;
  },

  name(value: string): string | null {
    if (!value) return 'Name is required';
    if (value.length < 2) return 'Name must be at least 2 characters';
    if (value.length > 50) return 'Name must be less than 50 characters';
    if (!/^[a-zA-Z\s-]+$/.test(value)) return 'Name can only contain letters, spaces, and hyphens';
    return null;
  }
};
