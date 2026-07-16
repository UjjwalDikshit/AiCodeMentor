import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn-style class merger */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
