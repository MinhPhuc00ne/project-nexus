import type { ReactNode } from 'react';

export interface HomeProduct {
  id: number | string;
  name: string;
  price?: number;
  oldPrice?: number;
  image?: string;
  discount?: number;
  rating?: number;
  sold?: number;
  saleSold?: number;
  badge?: string;
}

export interface HomeCategory {
  id: number;
  name: string;
  count?: number;
  image: string;
}

export interface HomeHeroSlide {
  badge: string;
  title: string;
  accent: string;
  description: string;
  image: string;
}

export interface HomeBenefitProps {
  icon: ReactNode;
  title: string;
}
