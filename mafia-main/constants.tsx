import React from 'react';
import { Role } from './types';

export const ROLE_DETAILS = {
  [Role.KILLER]: {
    card: 'King',
    description: 'The eliminate-focused threat. Reach consensus with other Killers to pick a target.',
    color: 'text-red-500',
    bgColor: 'bg-red-950/40',
    borderColor: 'border-red-500/50',
    icon: (
      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
        <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.6 18.6 20 18 20H6C5.4 20 5 19.6 5 19V18H19V19Z" />
      </svg>
    ),
  },
  [Role.DETECTIVE]: {
    card: 'Jack',
    description: 'The investigator. Check players to identify the Killers.',
    color: 'text-blue-500',
    bgColor: 'bg-blue-950/40',
    borderColor: 'border-blue-500/50',
    icon: (
      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
        <path d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.5L20.5 19L15.5 14M9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" />
      </svg>
    ),
  },
  [Role.ANGEL]: {
    card: 'Ace',
    description: 'The protector. Choose one person to save each night (cannot repeat consecutive saves).',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-950/40',
    borderColor: 'border-yellow-500/50',
    icon: (
      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z" />
      </svg>
    ),
  },
  [Role.CITIZEN]: {
    card: 'Citizen',
    description: 'The innocent populace. Observe, deliberate, and vote out the Killers.',
    color: 'text-gray-400',
    bgColor: 'bg-gray-800/40',
    borderColor: 'border-gray-500/30',
    icon: (
      <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 12C14.21 12 16 10.21 16 8S14.21 4 12 4 8 5.79 8 8 9.79 12 12 12M12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" />
      </svg>
    ),
  },
};