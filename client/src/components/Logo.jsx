import React from 'react';

/**
 * Z-ON DOOR brand logo, rebuilt as crisp inline SVG.
 *
 * <Logo />            → full horizontal lockup (door icon + "Z-ON DOOR" text)
 * <Logo iconOnly />   → just the door mark (for collapsed sidebar / favicons)
 *
 * Colors:
 *   Brand red  = #E0312A
 *   Brand dark = #2B2B2B
 */

const RED = '#E0312A';
const DARK = '#2B2B2B';

/** The door mark with the red swoosh. */
function DoorMark({ size = 40 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
        >
            {/* Door frame */}
            <rect x="26" y="14" width="48" height="72" rx="5" fill={DARK} />
            {/* Inner door panel (open-door slant) */}
            <path d="M34 22 L58 26 L58 78 L34 80 Z" fill="#fff" />
            <path d="M58 26 L66 24 L66 80 L58 78 Z" fill="#d8d8d8" />
            {/* Handle */}
            <circle cx="40" cy="52" r="2.6" fill={DARK} />
            {/* Red swoosh sweeping under the door */}
            <path
                d="M6 70 C 26 58, 52 60, 92 40 C 60 64, 30 70, 10 80 Z"
                fill={RED}
            />
        </svg>
    );
}

export default function Logo({ iconOnly = false, size = 40, className = '', textClassName = '' }) {
    if (iconOnly) {
        return (
            <span className={`inline-flex ${className}`}>
                <DoorMark size={size} />
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-2.5 ${className}`}>
            <DoorMark size={size} />
            <span className={`font-black leading-none tracking-tight ${textClassName}`}>
                <span style={{ color: RED }}>Z-ON</span>{' '}
                <span style={{ color: DARK }} className="zon-dark-text">DOOR</span>
            </span>
        </span>
    );
}

export { RED as BRAND_RED, DARK as BRAND_DARK };
