# Winston Logging Setup

This project uses Winston for structured logging in NestJS.

## Installation

Install the required packages:

```bash
npm install winston nest-winston
```

## Configuration

Winston is configured in `src/config/winston.config.ts` with the following features:

- **Console Transport**: Colored output for development, JSON for production
- **File Transports**:
  - `logs/error.log` - Only error level logs
  - `logs/combined.log` - All log levels
  - `logs/exceptions.log` - Uncaught exceptions
  - `logs/rejections.log` - Unhandled promise rejections
- **Log Rotation**: Files are rotated at 5MB, keeping 5 files max
- **Environment-aware**: Different formats for development vs production

## Environment Variables

- `LOG_LEVEL`: Set the minimum log level (default: `info`)
  - Options: `error`, `warn`, `info`, `verbose`, `debug`, `silly`
- `NODE_ENV`: Controls log format (default: `development`)
  - `development`: Colored console output
  - `production`: JSON format for log aggregation

## Usage

### In Services/Controllers

Use NestJS's built-in Logger which is integrated with Winston:

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MyService {
  private readonly logger = new Logger(MyService.name);

  someMethod() {
    this.logger.log('Info message');
    this.logger.warn('Warning message');
    this.logger.error('Error message', 'ErrorStack');
    this.logger.debug('Debug message');
    this.logger.verbose('Verbose message');
  }
}
```

### Log Levels

- `logger.log()` - General information (info level)
- `logger.warn()` - Warnings
- `logger.error()` - Errors
- `logger.debug()` - Debug information
- `logger.verbose()` - Verbose information

### Log Format Examples

**Development (Console):**
```
2024-01-15 10:30:45 [info] [MyService] Info message
2024-01-15 10:30:46 [error] [MyService] Error message
ErrorStack
```

**Production (JSON):**
```json
{
  "timestamp": "2024-01-15T10:30:45.123Z",
  "level": "info",
  "message": "Info message",
  "context": "MyService",
  "service": "bsp-api",
  "environment": "production"
}
```

## Log Files

Log files are stored in the `logs/` directory:

- `logs/error.log` - Errors only
- `logs/combined.log` - All logs
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

**Note:** The `logs/` directory is gitignored and should be created automatically.

## Customization

To customize Winston configuration, edit `src/config/winston.config.ts`:

```typescript
export const winstonConfig: WinstonModuleOptions = {
  // Your custom configuration
};
```

## Best Practices

1. **Always include context**: Use the class name as context for better log filtering
2. **Use appropriate log levels**:
   - `error` for errors that need attention
   - `warn` for warnings
   - `log` for important information
   - `debug` for development debugging
3. **Include stack traces**: For errors, include the stack trace
4. **Structured logging**: In production, use JSON format for better log aggregation tools

## Example: Logging HTTP Requests

You can create an interceptor to log HTTP requests:

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const { statusCode } = response;
        const delay = Date.now() - now;
        this.logger.log(`${method} ${url} ${statusCode} - ${delay}ms`);
      }),
    );
  }
}
```

Then register it in `app.module.ts`:

```typescript
import { APP_INTERCEPTOR } from '@nestjs/core';

@Module({
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
})
export class AppModule {}
```

