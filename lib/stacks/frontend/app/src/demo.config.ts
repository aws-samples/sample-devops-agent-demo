/**
 * Demo Configuration
 *
 * Single source of truth for your demo app's branding and settings.
 * Change values here and they propagate to all pages automatically.
 *
 * To change the color theme, update the `industry` field and re-run:
 *   aws-design init --industry <name>
 * This will update your index.css with the matching color palette.
 */

export type Industry =
  | 'default'
  | 'healthcare'
  | 'finance'
  | 'retail'
  | 'energy'
  | 'manufacturing'
  | 'automotive'
  | 'gaming'
  | 'media'
  | 'telco'
  | 'education'
  | 'government'

export interface DemoConfig {
  /** Display title shown in headers and landing pages */
  title: string
  /** Short description shown below the title */
  description: string
  /** Industry vertical — determines the color theme in index.css */
  industry: Industry
  /** Path to light-mode logo (relative to public/) */
  logo: string
  /** Path to dark-mode logo (relative to public/), falls back to logo */
  logoDark: string
  /** Path to background asset (video or image, relative to public/) */
  background: string
  /** Whether the background is a video or static image */
  backgroundType: 'video' | 'image'
  /** Call-to-action button label on the landing page */
  ctaLabel: string
  /** Tagline shown on the landing page */
  tagline: string
  /** Page variant selections */
  pages: {
    landing: string
    login: string
    demo: string
    overview: string
  }
}

export const demoConfig: DemoConfig = {
  title: 'Demo App',
  description: 'Built with AWS Design Library',
  industry: 'default',
  logo: '/logos/logo.svg',
  logoDark: '/logos/logo-white.svg',
  background: '/backgrounds/devopsagent.mp4',
  backgroundType: 'video',
  ctaLabel: 'Start Demo',
  tagline: 'Powered by AWS',
  pages: {
    landing: 'landing-page-split',
    login: 'login-page',
    demo: 'demo-page',
    overview: 'overview-page',
  },
}
