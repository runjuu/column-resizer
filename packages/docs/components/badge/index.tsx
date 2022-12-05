import React from 'react';

export type BadgeProps = {
  img: string;
  href: string;
  alt: string;
};

export function Badge({ img, href, alt }: BadgeProps) {
  return (
    <a href={href} target="_blank">
      <img src={img} alt={alt} />
    </a>
  );
}
