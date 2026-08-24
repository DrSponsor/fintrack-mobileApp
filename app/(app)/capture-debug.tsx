/**
 * Route shim for the alert-capture inspector. Hidden from the tab bar via
 * `href: null` in the tabs layout; see CaptureDebugScreen for what it is for
 * and when it should be deleted.
 */
export { CaptureDebugScreen as default } from '@/features/capture';
