import { BadgeCheck, Gavel, Image, Inbox, PackageSearch, ShieldCheck, Star } from 'lucide-react';

/**
 * The sections of the staff workspace.
 */
export const navigation = [
  { key: 'orders', i18nKey: 'nav.orders', icon: PackageSearch },
  { key: 'team', i18nKey: 'nav.team', icon: BadgeCheck },
  { key: 'inbox', i18nKey: 'nav.inbox', icon: Inbox },
  { key: 'disputes', i18nKey: 'nav.disputes', icon: ShieldCheck },
  { key: 'auctionSupport', i18nKey: 'nav.auctionSupport', icon: Gavel },
  { key: 'banners', i18nKey: 'nav.banners', icon: Image },
  { key: 'reviews', i18nKey: 'nav.reviews', icon: Star },
] as const;

export type StaffSection = (typeof navigation)[number]['key'];

export const sectionContent: Record<
  StaffSection,
  { title: string; description: string; topics: string[] }
> = {
  team: {
    title: 'Support Team Management',
    description: 'Manage support staff members and send account activation invitations.',
    topics: [],
  },
  inbox: {
    title: 'Customer Support Inbox',
    description: 'Claim conversations, reply to customers, and monitor the support queue.',
    topics: [],
  },
  disputes: {
    title: 'Complaints & Disputes',
    description:
      'Review order complaints, inspect submitted evidence, and track resolution progress.',
    topics: ['Intake complaints', 'Inspect evidence', 'Track resolution progress'],
  },
  orders: {
    title: 'Orders & After-Sales Support',
    description: 'Look up orders, inspect shipping status, escrow, and process return requests.',
    topics: [],
  },
  auctionSupport: {
    title: '3D Auction Support',
    description: 'Monitor auction room requests, bidding issues, and 3D showcase rendering.',
    topics: ['Auction room incidents', 'Bidding inquiries', '3D product display'],
  },
  banners: {
    title: 'Event Banner Management',
    description: 'Create, update, and schedule marketplace promotional banners.',
    topics: [],
  },
  reviews: {
    title: 'Review Moderation',
    description: 'Inspect and moderate flagged reviews according to assigned staff permissions.',
    topics: [],
  },
};

export const staffSectionPaths: Record<StaffSection, string> = {
  team: '/staff/team',
  inbox: '/staff/inbox',
  disputes: '/staff/disputes',
  orders: '/staff/orders',
  auctionSupport: '/staff/auction-support',
  banners: '/staff/banners',
  reviews: '/staff/reviews',
};
