// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format datetime for display in Vietnam timezone
 * Output: "16/10/2025 08:37"
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    // Check valid date
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    // Format for Vietnam timezone
    const formatter = new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    });
    
    // Format and clean up
    const formatted = formatter.format(date);
    // Replace ", " with " " to remove comma
    return formatted.replace(', ', ' ');
    
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return 'Invalid date';
  }
}

/**
 * Format date only (no time)
 * Output: "16/10/2025"
 */
export function formatDate(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
    }).format(date);
    
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format time only (no date)  
 * Output: "08:37"
 */
export function formatTime(dateString: string | Date | null | undefined): string {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid time';
    }
    
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    }).format(date);
    
  } catch (error) {
    console.error('Error formatting time:', error);
    return 'Invalid time';
  }
}

/**
 * Get current Vietnam time for MySQL
 * Output: "2025-10-16 08:37:00"
 */
export function getCurrentVietnamTime(): string {
  const now = new Date();
  
  // Create formatter for Vietnam timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Ho_Chi_Minh'
  });
  
  const parts = formatter.formatToParts(now);
  const values: any = {};
  
  parts.forEach(part => {
    values[part.type] = part.value;
  });
  
  // Format for MySQL: YYYY-MM-DD HH:mm:ss
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
}

/**
 * Convert to MySQL datetime with Vietnam timezone
 * Output: "2025-10-16 08:37:00"
 */
export function toMySQLDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return getCurrentVietnamTime();
  
  try {
    const date = new Date(dateInput);
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date input:', dateInput);
      return getCurrentVietnamTime();
    }
    
    // Create formatter for Vietnam timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    });
    
    const parts = formatter.formatToParts(date);
    const values: any = {};
    
    parts.forEach(part => {
      values[part.type] = part.value;
    });
    
    // Format for MySQL
    return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
    
  } catch (error) {
    console.error('Error converting to MySQL datetime:', error);
    return getCurrentVietnamTime();
  }
}