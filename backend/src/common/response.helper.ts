/**
 * Standard API Response interface for consistent response format
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string | string[];
  data?: T;
}

/**
 * Response Helper class for maintaining consistent API response format
 */
export class ResponseHelper {
  /**
   * Create a success response
   */
  static success<T>(message: string, data?: T): ApiResponse<T> {
    return {
      success: true,
      message,
      ...(data !== undefined && { data }),
    };
  }

  /**
   * Create an error response
   */
  static error(message: string | string[]): ApiResponse {
    return {
      success: false,
      message,
    };
  }
}
