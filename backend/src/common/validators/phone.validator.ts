import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';
import { PHONE_REGEX, PHONE_MIN_DIGITS } from './phone.constants';

export function IsPhoneNumber(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPhoneNumber',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (value == null || typeof value !== 'string') return false;
          const trimmed = value.trim();
          if (trimmed.length === 0) return false;
          if (!PHONE_REGEX.test(trimmed)) return false;
          const digitCount = (trimmed.match(/\d/g) || []).length;
          return digitCount >= PHONE_MIN_DIGITS;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid phone number (e.g. +1 (555) 123-4567) with at least ${PHONE_MIN_DIGITS} digits`;
        },
      },
    });
  };
}
