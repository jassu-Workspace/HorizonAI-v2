import crypto from 'crypto';

const MAX_SKEW_MS = Number(process.env.INTERNAL_SIGNATURE_TTL_MS || 30_000);

const getSigningKeys = (): string[] => {
    return String(process.env.INTERNAL_SIGNING_KEYS || process.env.INTERNAL_SIGNING_KEY || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
};

const sha256Hex = (value: string): string => {
    return crypto.createHash('sha256').update(value).digest('hex');
};

const sign = (key: string, payload: string): string => {
    return crypto.createHmac('sha256', key).update(payload).digest('hex');
};

const timingSafeEq = (a: string, b: string): boolean => {
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
};

const toPayload = (method: string, path: string, timestamp: string, nonce: string, bodyHash: string): string => {
    return [method.toUpperCase(), path, timestamp, nonce, bodyHash].join('.');
};

export const buildInternalAuthHeaders = (method: string, path: string, body: string) => {
    const [currentKey] = getSigningKeys();
    if (!currentKey) {
        throw new Error('Internal signing key missing');
    }

    const timestamp = String(Date.now());
    const nonce = crypto.randomUUID();
    const bodyHash = sha256Hex(body || '');
    const payload = toPayload(method, path, timestamp, nonce, bodyHash);
    const signature = sign(currentKey, payload);

    return {
        'x-internal-ts': timestamp,
        'x-internal-nonce': nonce,
        'x-internal-signature': signature,
        'x-internal-body-hash': bodyHash,
    };
};

export const verifyInternalRequest = (req: any, expectedMethod: string, expectedPath: string): boolean => {
    const signature = String(req.headers['x-internal-signature'] || '');
    const timestamp = String(req.headers['x-internal-ts'] || '');
    const nonce = String(req.headers['x-internal-nonce'] || '');
    const bodyHash = String(req.headers['x-internal-body-hash'] || '');

    if (!signature || !timestamp || !nonce || !bodyHash) {
        return false;
    }

    const ts = Number(timestamp);
    if (!Number.isFinite(ts)) {
        return false;
    }

    if (Math.abs(Date.now() - ts) > MAX_SKEW_MS) {
        return false;
    }

    const expectedBodyHash = sha256Hex(JSON.stringify(req.body || {}));
    if (!timingSafeEq(bodyHash, expectedBodyHash)) {
        return false;
    }

    const payload = toPayload(expectedMethod, expectedPath, timestamp, nonce, bodyHash);
    const keys = getSigningKeys();
    if (keys.length === 0) {
        return false;
    }

    return keys.some((key) => timingSafeEq(signature, sign(key, payload)));
};
