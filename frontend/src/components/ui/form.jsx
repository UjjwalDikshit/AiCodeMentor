import { cn } from '../../lib/utils';

export function FormError({ message, className }) {
  if (!message) return null;
  return <p className={cn('text-sm text-red-600', className)}>{message}</p>;
}

export function FormField({ label, error, children, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && <label className="text-sm font-medium">{label}</label>}
      {children}
      <FormError message={error} />
    </div>
  );
}
