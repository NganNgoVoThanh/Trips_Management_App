// lib/email-router.ts
// Email routing logic to determine which sender address to use

/**
 * Email categories based on purpose
 */
export type EmailCategory =
  | 'verification'      // Manager confirmations, email verifications
  | 'notification'      // General system notifications
  | 'approval'          // Trip approvals, manager approvals
  | 'alert'             // Urgent alerts, expiry warnings
  | 'rejection'         // Rejection notifications
  | 'system';           // System-level notifications

/**
 * Email sender type
 */
export type EmailSender = 'no-reply' | 'approvals';

/**
 * Determine which email sender to use based on email category
 *
 * Routing logic:
 * - no-reply.trips@intersnack.com.vn → For general notifications, verifications, alerts
 * - trip-approvals@intersnack.com.vn → For approval-related official emails
 */
export function getEmailSender(category: EmailCategory): EmailSender {
  switch (category) {
    case 'approval':
      // Official approval emails require trip-approvals@ sender
      return 'approvals';

    case 'verification':
    case 'notification':
    case 'alert':
    case 'rejection':
    case 'system':
    default:
      // All other emails use no-reply@ sender
      return 'no-reply';
  }
}

/**
 * Get full email address for a sender type
 */
export function getEmailAddress(sender: EmailSender): string {
  const addresses = {
    'no-reply': process.env.EMAIL_NO_REPLY || 'no-reply.trips@intersnack.com.vn',
    'approvals': process.env.EMAIL_APPROVALS || 'trip-approvals@intersnack.com.vn'
  };

  return addresses[sender];
}

/**
 * Get sender name for email display
 */
export function getSenderName(sender: EmailSender): string {
  const names = {
    'no-reply': 'Trips Management System',
    'approvals': 'Trip Approvals - Intersnack'
  };

  return names[sender];
}

/**
 * Helper to categorize emails by subject/purpose
 */
export function categorizeEmailBySubject(subject: string): EmailCategory {
  const lowerSubject = subject.toLowerCase();

  // Check for approval keywords
  if (
    lowerSubject.includes('approval') ||
    lowerSubject.includes('approved') ||
    lowerSubject.includes('approve')
  ) {
    return 'approval';
  }

  // Check for verification keywords
  if (
    lowerSubject.includes('confirmation') ||
    lowerSubject.includes('verify') ||
    lowerSubject.includes('verification')
  ) {
    return 'verification';
  }

  // Check for rejection keywords
  if (
    lowerSubject.includes('reject') ||
    lowerSubject.includes('declined') ||
    lowerSubject.includes('denied')
  ) {
    return 'rejection';
  }

  // Check for alert keywords
  if (
    lowerSubject.includes('urgent') ||
    lowerSubject.includes('expired') ||
    lowerSubject.includes('expiring') ||
    lowerSubject.includes('warning')
  ) {
    return 'alert';
  }

  // Default to notification
  return 'notification';
}

/**
 * Complete email routing decision
 * Determines sender based on category
 */
export function routeEmail(params: {
  category?: EmailCategory;
  subject?: string;
}): {
  sender: EmailSender;
  fromAddress: string;
  fromName: string;
} {
  // Determine category
  const category = params.category ||
                   (params.subject ? categorizeEmailBySubject(params.subject) : 'notification');

  // Get sender type
  const sender = getEmailSender(category);

  return {
    sender,
    fromAddress: getEmailAddress(sender),
    fromName: getSenderName(sender)
  };
}
