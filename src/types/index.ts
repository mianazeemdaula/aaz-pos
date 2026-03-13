// POS System  unified type exports
export * from './pos';
export * from './fbr';

// Common UI types (already in pos.ts but re-exported for safety)
export type Size = 'sm' | 'md' | 'lg' | 'xl';
export type Variant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'ghost';
export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'default';
export type TrendDirection = 'up' | 'down' | 'neutral';
