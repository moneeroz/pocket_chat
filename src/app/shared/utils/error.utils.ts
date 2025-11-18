/**
 * Extract error message from various error types
 * @param error Error object (can be any type)
 * @param defaultMessage Default message if extraction fails
 * @returns Formatted error message
 */
export function extractErrorMessage(
  error: any,
  defaultMessage: string = 'An error occurred'
): string {
  if (!error) return defaultMessage;

  // Handle PocketBase errors
  if (error.data && error.data.message) {
    return error.data.message;
  }

  // Handle standard Error objects
  if (error.message) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

/**
 * Log error to console with context
 * @param context Context where error occurred
 * @param error Error object
 */
export function logError(context: string, error: any): void {
  console.error(`[${context}]`, error);
}

/**
 * Handle and log error, returning formatted message
 * @param context Context where error occurred
 * @param error Error object
 * @param defaultMessage Default error message
 * @returns Formatted error message
 */
export function handleError(context: string, error: any, defaultMessage: string): string {
  const message = extractErrorMessage(error, defaultMessage);
  logError(context, error);
  return message;
}
