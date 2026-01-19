import { useState, useEffect } from 'react';

/**
 * Custom hook to detect if a media query matches
 * @param {string} query - CSS media query string
 * @returns {boolean} - Whether the media query matches
 */
export function useMediaQuery(query) {
    const [matches, setMatches] = useState(() => {
        if (typeof window !== 'undefined') {
            return window.matchMedia(query).matches;
        }
        return false;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const media = window.matchMedia(query);
        const listener = (e) => setMatches(e.matches);

        // Set initial value
        setMatches(media.matches);

        // Modern API
        media.addEventListener('change', listener);
        return () => media.removeEventListener('change', listener);
    }, [query]);

    return matches;
}

// Common breakpoints
export const MOBILE_BREAKPOINT = '(max-width: 768px)';
export const TABLET_BREAKPOINT = '(max-width: 1024px)';
export const DESKTOP_BREAKPOINT = '(min-width: 1025px)';

/**
 * Convenience hook for mobile detection
 * @returns {boolean} - true if screen is mobile-sized
 */
export function useIsMobile() {
    return useMediaQuery(MOBILE_BREAKPOINT);
}

/**
 * Convenience hook for tablet detection
 * @returns {boolean} - true if screen is tablet-sized or smaller
 */
export function useIsTablet() {
    return useMediaQuery(TABLET_BREAKPOINT);
}

export default useMediaQuery;
