import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export interface PasswordRequirements {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumberOrSymbol?: boolean;
}

const DEFAULT_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumberOrSymbol: true,
};

export function IsStrongPassword(
  requirements: PasswordRequirements = {},
  validationOptions?: ValidationOptions,
) {
  const config = { ...DEFAULT_REQUIREMENTS, ...requirements };

  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;

          if (config.minLength && value.length < config.minLength) {
            return false;
          }

          if (config.requireUppercase && !/[A-Z]/.test(value)) {
            return false;
          }

          if (config.requireLowercase && !/[a-z]/.test(value)) {
            return false;
          }

          if (config.requireNumberOrSymbol) {
            const hasNumber = /\d/.test(value);
            const hasSymbol = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(
              value,
            );
            if (!hasNumber && !hasSymbol) {
              return false;
            }
          }

          return true;
        },
        defaultMessage(args: ValidationArguments): string {
          const messages: string[] = [];

          if (config.minLength) {
            messages.push(`at least ${config.minLength} characters`);
          }
          if (config.requireUppercase) {
            messages.push('one uppercase letter');
          }
          if (config.requireLowercase) {
            messages.push('one lowercase letter');
          }
          if (config.requireNumberOrSymbol) {
            messages.push('one number or symbol');
          }

          return `${args.property} must contain ${messages.join(', ')}`;
        },
      },
    });
  };
}
