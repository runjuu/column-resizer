import cls from 'clsx';
import Link, { LinkProps } from 'next/link';
import React from 'react';

import styles from './index.module.css';

export type CardProps = LinkProps & {
  title: React.ReactNode;
  icon?: React.ReactNode;
};

export function Card({ title, icon, href, ...props }: CardProps) {
  return (
    <Link
      href={href}
      className={cls(
        styles.card,
        'group flex flex-col justify-start overflow-hidden rounded-lg border border-gray-200 bg-transparent text-current no-underline shadow-sm shadow-gray-100 transition-all duration-200 dark:border-neutral-800 dark:shadow-none',
        'hover:border-gray-300 hover:bg-slate-50 hover:shadow-md hover:shadow-gray-100 dark:hover:border-neutral-700 dark:hover:bg-neutral-900 dark:hover:shadow-none',
      )}
      {...props}
    >
      <span
        className={cls(
          styles.title,
          'gap-2 p-4 text-gray-700 dark:text-neutral-200',
          'hover:text-gray-900 dark:hover:text-neutral-50',
        )}
      >
        {icon}
        {title}
      </span>
    </Link>
  );
}

export type CardsProps = React.HTMLAttributes<HTMLDivElement> & {
  num?: number;
};

export function Cards({ children, num, ...props }: CardsProps) {
  return (
    <div
      className={cls(styles.cards, 'mt-4 gap-4')}
      {...props}
      style={
        {
          '--rows': num || 3,
          ...props.style,
        } as any
      }
    >
      {children}
    </div>
  );
}
