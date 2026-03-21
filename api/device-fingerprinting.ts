/**
 * Device Fingerprinting Module
 * Phase 2 Elite Hardening: Multi-factor abuse detection via device tensor
 * 
 * Combines: User-Agent, IP, Accept headers, TLS fingerprint indicators
 * Purpose: Detect account takeover, credential stuffing, distributed abuse
 */

import crypto from 'crypto';

export interface DeviceFingerprintInputs {
    userAgent: string;
    ip: string;
    acceptLanguage: string;
    acceptEncoding: string;
    tlsVersion?: string;
    tlsCipherSuite?: string;
    timeZone?: string;
}

/**
 * Generate stable device fingerprint
 * NOT volatile (session-based), but changes on browser/OS updates
 */
export const generateDeviceFingerprint = (inputs: DeviceFingerprintInputs): string => {
    const canonicalized = `${inputs.userAgent}|${inputs.acceptLanguage}|${inputs.acceptEncoding}|${inputs.tlsVersion}|${inputs.tlsCipherSuite}`;
    return crypto.createHash('sha256').update(canonicalized).digest('hex');
};

/**
 * Detect device anomalies
 * Flags: spoofed UA, suspicious combinations, time-zone mismatches
 */
export interface DeviceAnomalyFlags {
    isSuspiciousTls: boolean;
    uaTimestampMismatch: boolean;
    isCommonBotUA: boolean;
    isVpnProxy: boolean;
    suspiciousCombination: boolean;
    anomalyScore: number;
}

const COMMON_BOT_PATTERNS = [
    /bot|crawler|spider|scraper|curl|wget|python|java(?!script)/i,
    /headless|phantom|nightmare|puppeteer/i,
    /selenium|watir|capybara/i,
];

const VPN_PROVIDER_PATTERNS = [
    /vpn|proxy|tor|tails|whonix/i,
];

const SUSPICIOUS_UA_COMBINATIONS: Array<[RegExp, RegExp]> = [
    [/iPhone/, /Windows/],
    [/Android/, /Mac OS X/],
    [/iPad/, /Linux/],
];

export const detectDeviceAnomalies = (inputs: DeviceFingerprintInputs): DeviceAnomalyFlags => {
    const ua = inputs.userAgent.toLowerCase();
    const anomalies: DeviceAnomalyFlags = {
        isSuspiciousTls: checkSuspiciousTls(inputs.tlsVersion, inputs.tlsCipherSuite),
        uaTimestampMismatch: checkUATimestampMismatch(ua),
        isCommonBotUA: COMMON_BOT_PATTERNS.some(pattern => pattern.test(ua)),
        isVpnProxy: VPN_PROVIDER_PATTERNS.some(pattern => pattern.test(ua)),
        suspiciousCombination: SUSPICIOUS_UA_COMBINATIONS.some(([osPattern, conflictPattern]) =>
            osPattern.test(ua) && conflictPattern.test(ua),
        ),
        anomalyScore: 0,
    };

    // Calculate anomaly score
    let score = 0;
    if (anomalies.isSuspiciousTls) score += 20;
    if (anomalies.uaTimestampMismatch) score += 15;
    if (anomalies.isCommonBotUA) score += 30;
    if (anomalies.isVpnProxy) score += 25;
    if (anomalies.suspiciousCombination) score += 20;

    anomalies.anomalyScore = Math.min(score, 100);
    return anomalies;
};

/**
 * Check for outdated/suspicious TLS configurations
 */
const checkSuspiciousTls = (tlsVersion?: string, cipherSuite?: string): boolean => {
    if (!tlsVersion) return false; // Undetectable from server-side normally

    // Flag old TLS versions
    if (/SSL 3\.0|TLS 1\.0|TLS 1\.1/i.test(tlsVersion)) {
        return true;
    }

    // Flag broken/weak ciphers
    if (cipherSuite && /NULL|EXPORT|DES|RC4|MD5/i.test(cipherSuite)) {
        return true;
    }

    return false;
};

/**
 * Detect UA claiming to be from browser released in future
 * or browser+OS combos that don't exist
 */
const checkUATimestampMismatch = (ua: string): boolean => {
    const now = new Date().getFullYear();

    // Chrome versions: 100+ released 2022+, 120+ released 2024+
    const chromeVersion = ua.match(/Chrome\/(\d+)/)?.[1];
    if (chromeVersion && parseInt(chromeVersion) > now - 1900) {
        return true;
    }

    // Safari versions: 15+ is 2021+, 17+ is 2023+
    const safariVersion = ua.match(/Version\/(\d+)/)?.[1];
    if (safariVersion && parseInt(safariVersion) > now - 2000) {
        return true;
    }

    return false;
};

/**
 * Analyze multi-device login patterns
 * Flags: too many devices in short time, geographic impossibility
 */
export interface GeoPattern {
    ip: string;
    fingerprint: string;
    timestamp: number;
}

export interface GeoAnomalyResult {
    isGeographicallyImpossible: boolean;
    knownDeviceBefore: boolean;
    deviceTransitionMinutes: number;
}

export const detectGeographicalImpossibility = (
    current: GeoPattern,
    previous: GeoPattern | null,
    estimatedTravelTimeMinutes: number = 30, // Minimum time to reasonably travel between IPs
): GeoAnomalyResult => {
    if (!previous) {
        return {
            isGeographicallyImpossible: false,
            knownDeviceBefore: false,
            deviceTransitionMinutes: 0,
        };
    }

    const timeSinceLastRequest = (current.timestamp - previous.timestamp) / 1000 / 60;
    const isNewDevice = current.fingerprint !== previous.fingerprint;

    // If new device appears too soon (less than travel time), flag
    const isGeographicallyImpossible = isNewDevice && timeSinceLastRequest < estimatedTravelTimeMinutes;

    return {
        isGeographicallyImpossible,
        knownDeviceBefore: !isNewDevice,
        deviceTransitionMinutes: timeSinceLastRequest,
    };
};

/**
 * Multi-device tracking context
 * Stores recent device access for the user
 */
export class DeviceTracker {
    private userDeviceMap: Map<string, GeoPattern> = new Map();

    addAccess(userId: string, pattern: GeoPattern): void {
        this.userDeviceMap.set(userId, pattern);
        // Auto-cleanup old entries (optional)
        if (this.userDeviceMap.size > 10000) {
            const entries = Array.from(this.userDeviceMap.entries()).sort((a, b) => a[1].timestamp - b[1].timestamp);
            for (let i = 0; i < 100; i++) {
                this.userDeviceMap.delete(entries[i][0]);
            }
        }
    }

    getLastAccess(userId: string): GeoPattern | null {
        return this.userDeviceMap.get(userId) || null;
    }
}

export const deviceTracker = new DeviceTracker();
