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
    let date: Date;
    
    // Handle MySQL datetime format (YYYY-MM-DD HH:MM:SS) without timezone
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
      // MySQL datetime is already in Vietnam timezone, parse it directly
      date = new Date(dateString.replace(' ', 'T') + '+07:00');
    } else {
      // Handle ISO string or other formats
      date = new Date(dateString);
    }
    
    // Check valid date
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
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
    console.error('Error formatting datetime:', error, dateString);
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
    let date: Date;
    
    // Handle MySQL datetime format
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(dateString)) {
      date = new Date(dateString.replace(' ', 'T') + '+07:00');
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      console.error('Invalid date:', dateString);
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'Asia/Ho_Chi_Minh'
    }).format(date);
    
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
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
    let date: Date;
    
    // Handle MySQL datetime format
    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateString)) {
      date = new Date(dateString.replace(' ', 'T') + '+07:00');
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) {
      console.error('Invalid time:', dateString);
      return 'Invalid time';
    }
    
    return new Intl.DateTimeFormat('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Ho_Chi_Minh'
    }).format(date);
    
  } catch (error) {
    console.error('Error formatting time:', error, dateString);
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

/**
 * Escape CSV field - handles commas, quotes, and newlines
 * Ensures proper Excel compatibility with Vietnamese characters
 */
export function escapeCsvField(field: any): string {
  if (field === null || field === undefined) return ''
  const str = String(field)
  // Escape fields containing comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Export data to CSV with proper UTF-8 encoding for Excel
 * Automatically adds BOM for Vietnamese character support
 */
export function exportToCsv(data: any[][], filename: string): void {
  // Convert to CSV with proper escaping
  const csv = data.map(row => row.map(escapeCsvField).join(',')).join('\n')

  // Add UTF-8 BOM for proper Excel encoding
  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}