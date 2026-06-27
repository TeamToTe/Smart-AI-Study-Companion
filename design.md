---
version: alpha
name: StudyMind Modern Design System
description: Visual identity and design tokens for the StudyMind AI study companion app.
colors:
  # Accent / Brand Colors
  accent-blue: "#3b82f6"
  accent-blue-hover: "#2563eb"
  accent-blue-light: "#2563eb"
  accent-blue-light-hover: "#1d4ed8"
  
  # Semantic Colors
  success-emerald: "#10b981"
  success-emerald-hover: "#059669"
  success-emerald-light: "#059669"
  success-emerald-light-hover: "#047857"
  
  warning-amber: "#f59e0b"
  warning-amber-light: "#d97706"
  
  danger-red: "#ef4444"
  danger-red-light: "#dc2626"

  # Theme Colors - Dark Theme
  bg-main-dark: "#020617"
  bg-surface-dark: "#0b0f19"
  bg-card-dark: "rgba(15, 23, 42, 0.6)"
  bg-card-hover-dark: "rgba(30, 41, 59, 0.7)"
  border-dark: "rgba(59, 130, 246, 0.15)"
  border-hover-dark: "rgba(59, 130, 246, 0.35)"
  text-primary-dark: "#f8fafc"
  text-secondary-dark: "#94a3b8"
  text-muted-dark: "#64748b"

  # Theme Colors - Light Theme
  bg-main-light: "#f8fafc"
  bg-surface-light: "#ffffff"
  bg-card-light: "rgba(255, 255, 255, 0.8)"
  bg-card-hover-light: "rgba(241, 245, 249, 0.9)"
  border-light: "rgba(59, 130, 246, 0.12)"
  border-hover-light: "rgba(59, 130, 246, 0.25)"
  text-primary-light: "#0f172a"
  text-secondary-light: "#475569"
  text-muted-light: "#94a3b8"

typography:
  headline-display:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "56px"
    fontWeight: 800
    lineHeight: 1.15
  headline-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: 1.2
  headline-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.4
  body-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  label-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "13px"
    fontWeight: 700
    lineHeight: 1.2
  label-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
  label-sm:
    fontFamily: "Plus Jakarta Sans"
    fontSize: "10px"
    fontWeight: 700
    lineHeight: 1.2

rounded:
  none: "0px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  full: "9999px"

spacing:
  base: "16px"
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "40px"
  huge: "48px"
  massive: "56px"

components:
  button-primary:
    backgroundColor: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-secondary:
    backgroundColor: "{colors.bg-card-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  logo-icon:
    backgroundColor: "linear-gradient(135deg, #3b82f6 0%, #10b981 100%)"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    size: "32px"
  demo-badge:
    backgroundColor: "rgba(16, 185, 129, 0.1)"
    textColor: "{colors.success-emerald}"
    rounded: "{rounded.md}"
    padding: "4px 10px"
  workspace-back-btn:
    backgroundColor: "{colors.bg-card-dark}"
    textColor: "{colors.text-primary-dark}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
  modal-content:
    backgroundColor: "{colors.bg-card-dark}"
    rounded: "{rounded.lg}"
    padding: "32px"
---

## Overview

StudyMind is a premium, modern, AI-powered study companion application. Its design system utilizes a dark-mode-first aesthetic with dynamic theme variables. The interface leverages translucent layers, vibrant gradients, precise micro-animations, and sharp layout spacing grids to convey a clean, functional, and professional user experience.

## Colors

The system uses a dynamic dual-theme structure controlled via global body classes (`.theme-dark` and `.theme-light`).
- **Accent Blue**: Royalty blue used for primary actions, highlight states, and interactive borders.
- **Success Emerald**: Clean green indicating correct answers, progress completion, or successful states.
- **Warning Amber**: Golden amber for ratings, warnings, and warning icons.
- **Danger Red**: Vibrant red for errors, destructive actions, and status indicators.
- **Backgrounds**: Deep slate/slate 950 for main dark workspace backgrounds, and pure white/slate 50 for light mode.
- **Cards**: Translucent slate layers that blend with background-color to present a premium frosted feel.
- **Borders**: Thin, semi-transparent blue outlines to create structural definition without visual clutter.

## Typography

The design system relies on the **Plus Jakarta Sans** font family for a clean, geometric sans-serif aesthetic, with **ui-monospace** used for stats, counters, and technical timestamps.
- **Headline Display**: Bold, large 56px headers for landing pages.
- **Headline Large/Medium**: 24px and 18px headings for section boundaries and panel headers.
- **Body Large**: 16px text for body text, inputs, and interactive lists.
- **Body Medium/Small**: 14px and 12px for supporting description text, tooltips, and explanations.
- **Label Large/Medium/Small**: 13px, 11px, and 10px uppercase or bold metadata text.

## Layout

Layout is based on a responsive container model. Main workspaces support a grid with a sticky right sidebar for secondary elements (e.g., chatbot, quiz, mindmap panels). Spacing follows a 4px/8px incremental grid.

## Elevation & Depth

Depth is achieved using **Glassmorphism** and subtle shadows rather than heavy skeuomorphic effects.
- Glass containers feature a semi-transparent background combined with a `backdrop-filter: blur(12px)` and a subtle light/dark border.
- Accents utilize glowing drop-shadows (e.g., `shadow-glow-blue`, `shadow-glow-emerald`) to emphasize state transitions on hover.

## Shapes

Shapes are defined by clean, modern rounded edges.
- Minimal radius (4px) for scrollbars, tooltips, and code elements.
- Small radius (8px) for buttons, tabs, and small cards.
- Medium/Large radius (12px to 16px) for main content cards, inputs, and modals.
- Circular shapes (50% / full) for theme toggle handles, avatar placeholders, and status indicators.

## Components

- **Primary Buttons**: Bold, colorful buttons using the signature blue-emerald gradient, white text, and a drop shadow that glows on hover.
- **Secondary Buttons**: Neutral background, clean border that highlights to accent color on hover.
- **Logo Icon**: Rounded square container hosting the brand logo with accent gradient background.
- **Demo Badge**: Soft success-colored pill badge showing status.
- **Workspace Back Button**: Fully rounded pill button showing back navigation.
- **Modal Content**: Centered, rounded card with heavy shadow overlay.

## Do's and Don'ts

- **Do** use CSS variables for theme safety to allow seamless Dark/Light switching.
- **Don't** hardcode hex colors or sizes in React components' CSS files or inline `style` objects.
- **Do** reuse the pre-defined button classes (`.btn-primary`, `.btn-secondary`) to maintain style uniformity.
- **Don't** use custom sizing elements (like margins and paddings) that do not align with the 4px/8px spacing grid.
