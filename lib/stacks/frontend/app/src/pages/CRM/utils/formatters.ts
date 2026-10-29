/**
 * CRM Formatting Utilities
 * 
 * This file contains utility functions for formatting currency, dates, and numbers
 * for display in the AnyCompany CRM platform.
 */

import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format a number as USD currency
 * 
 * @param amount - The amount to format
 * @returns Formatted currency string (e.g., "$1,234.56")
 * 
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(1000000) // "$1,000,000.00"
 * formatCurrency(0) // "$0.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date according to the specified format string
 * 
 * @param date - The date to format (Date object or ISO string)
 * @param formatString - The format string (date-fns format)
 * @returns Formatted date string
 * 
 * @example
 * formatDate(new Date('2025-03-15'), 'MM/dd/yyyy') // "03/15/2025"
 * formatDate(new Date('2025-03-15'), 'MMM d, yyyy') // "Mar 15, 2025"
 * formatDate('2025-03-15', 'yyyy-MM-dd') // "2025-03-15"
 */
export function formatDate(date: Date | string, formatString: string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatString);
}

/**
 * Format a date as a relative time string (e.g., "2 days ago")
 * 
 * @param date - The date to format (Date object or ISO string)
 * @returns Relative time string
 * 
 * @example
 * formatRelativeDate(new Date()) // "less than a minute ago"
 * formatRelativeDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)) // "2 days ago"
 * formatRelativeDate(new Date(Date.now() - 30 * 60 * 1000)) // "30 minutes ago"
 */
export function formatRelativeDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format a number with thousands separators
 * 
 * @param value - The number to format
 * @returns Formatted number string
 * 
 * @example
 * formatNumber(1234) // "1,234"
 * formatNumber(1000000) // "1,000,000"
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

/**
 * Format a percentage value
 * 
 * @param value - The percentage value (0-100)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string
 * 
 * @example
 * formatPercentage(75.5) // "75.5%"
 * formatPercentage(100) // "100.0%"
 * formatPercentage(33.333, 2) // "33.33%"
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a large currency value with K/M/B suffixes
 * 
 * @param amount - The amount to format
 * @returns Formatted compact currency string
 * 
 * @example
 * formatCompactCurrency(1500) // "$1.5K"
 * formatCompactCurrency(1500000) // "$1.5M"
 * formatCompactCurrency(1500000000) // "$1.5B"
 */
export function formatCompactCurrency(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}
