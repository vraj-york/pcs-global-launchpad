import logoMark from '@/assets/logos/logo-mark.svg';
import { cn } from '@/lib/utils';

interface IconProps {
  src: string;
  className?: string;
  alt?: string;
}

export function Icon({ src, className, alt = '' }: IconProps) {
  return (
    <img
      src={src}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      className={cn('inline-block shrink-0', className)}
    />
  );
}

export function LogoMark({ className }: { className?: string }) {
  return <Icon src={logoMark} alt="DevCity" className={cn('h-8 w-8', className)} />;
}
