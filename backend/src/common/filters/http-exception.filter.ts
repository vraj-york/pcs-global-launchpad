import {
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Response } from 'express';
import { ResponseHelper } from '../response.helper';

interface ValidationError {
  property?: string;
  constraints?: Record<string, string>;
  children?: ValidationError[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  /**
   * Formats validation errors from class-validator into readable messages
   */
  private formatValidationErrors(errors: ValidationError[]): string[] {
    const formatError = (error: ValidationError, parentPath = ''): string[] => {
      const messages: string[] = [];
      const currentPath = parentPath
        ? `${parentPath}.${error.property || ''}`
        : error.property || '';

      // Add constraints messages with property path
      if (error.constraints && Object.keys(error.constraints).length > 0) {
        const constraintMessages = Object.values(error.constraints);
        const propertyName = error.property || '';
        const isNested = currentPath && currentPath.includes('.');

        constraintMessages.forEach((msg) => {
          let cleanMessage = String(msg);

          if (propertyName && isNested) {
            const regex = new RegExp(
              `^${propertyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:.]?\\s*`,
              'i',
            );
            cleanMessage = cleanMessage.replace(regex, '').trim();
            messages.push(`${currentPath}: ${cleanMessage}`);
          } else {
            messages.push(cleanMessage);
          }
        });
      }

      // Handle nested validation errors (for nested objects)
      if (
        error.children &&
        Array.isArray(error.children) &&
        error.children.length > 0
      ) {
        error.children.forEach((child) => {
          const childMessages = formatError(child, currentPath);
          messages.push(...childMessages);
        });
      }

      // If no constraints and no children, but property exists, it might be a missing required field
      if (
        messages.length === 0 &&
        error.property &&
        !error.constraints &&
        (!error.children || error.children.length === 0)
      ) {
        if (currentPath && currentPath.includes('.')) {
          messages.push(`${currentPath}: is required`);
        } else {
          messages.push('is required');
        }
      }

      return messages;
    };

    const allMessages = errors.flatMap((error) => formatError(error));
    return allMessages.length > 0 ? allMessages : ['Validation failed'];
  }

  @SentryExceptionCaptured()
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // Handle validation errors from ValidationPipe
      // ValidationPipe throws BadRequestException with message as array of validation error objects
      if (
        exception instanceof BadRequestException &&
        status === HttpStatus.BAD_REQUEST
      ) {
        let validationErrors: ValidationError[] | null = null;

        if (exceptionResponse && typeof exceptionResponse === 'object') {
          const responseObj = exceptionResponse as {
            message?: unknown;
            error?: string;
          };

          // Check if message is an array of validation error objects
          if (Array.isArray(responseObj.message)) {
            if (
              responseObj.message.length > 0 &&
              typeof responseObj.message[0] === 'object' &&
              responseObj.message[0] !== null
            ) {
              const firstItem = responseObj.message[0] as Record<
                string,
                unknown
              >;
              if (
                firstItem.constraints !== undefined ||
                firstItem.property !== undefined
              ) {
                validationErrors = responseObj.message as ValidationError[];
              }
            }
          }
        }

        // Also check if the exception message itself contains validation errors
        // This handles cases where ValidationPipe formats errors differently
        if (!validationErrors && exception.message) {
          try {
            const parsed = JSON.parse(exception.message) as unknown;
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (typeof parsed[0] === 'object' && parsed[0] !== null) {
                const firstItem = parsed[0] as Record<string, unknown>;
                if (
                  firstItem.constraints !== undefined ||
                  firstItem.property !== undefined
                ) {
                  validationErrors = parsed as ValidationError[];
                }
              }
            }
          } catch {
            // Not JSON, continue
          }
        }

        if (validationErrors) {
          message = this.formatValidationErrors(validationErrors);
          status = HttpStatus.UNPROCESSABLE_ENTITY;
        } else {
          if (exceptionResponse && typeof exceptionResponse === 'object') {
            const responseObj = exceptionResponse as {
              message?: unknown;
              error?: string;
            };
            message =
              typeof responseObj.message === 'string'
                ? responseObj.message
                : responseObj.error || exception.message || 'Bad request';
          } else {
            message =
              typeof exceptionResponse === 'string'
                ? exceptionResponse
                : exception.message || 'Bad request';
          }
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as {
          message?: string | string[];
          error?: string;
        };

        // Extract message from response object, handling both string and array types
        if (responseObj.message !== undefined) {
          message = responseObj.message;
        } else if (responseObj.error) {
          message = responseObj.error;
        } else {
          message = exception.message || 'An error occurred';
        }
      } else {
        message = exception.message || 'An error occurred';
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled error: ${exception.message}`,
        exception.stack,
      );
      message = exception.message;
    }

    response.status(status).json(ResponseHelper.error(message));
  }
}
