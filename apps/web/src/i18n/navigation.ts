import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Link/useRouter/usePathname conscientes del locale activo. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
