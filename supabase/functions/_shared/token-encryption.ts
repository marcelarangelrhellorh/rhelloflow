/**
 * Shared AES-GCM encryption utilities for Google OAuth tokens
 * Uses GOOGLE_TOKEN_ENCRYPTION_KEY environment variable
 */

const ENCRYPTION_KEY = Deno.env.get("GOOGLE_TOKEN_ENCRYPTION_KEY") || "default-key-for-dev";

/**
 * Encrypt a token using AES-GCM
 */
export async function encryptToken(token: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(token)
  );
  return btoa(JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  }));
}

/**
 * Decrypt a token using AES-GCM
 * Falls back to legacy Base64 decryption for backward compatibility
 */
export async function decryptToken(encryptedToken: string): Promise<string> {
  try {
    // Try AES-GCM decryption first
    const data = JSON.parse(atob(encryptedToken));
    if (data.iv && data.data) {
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
        { name: "AES-GCM" },
        false,
        ["decrypt"]
      );
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: new Uint8Array(data.iv) },
        key,
        new Uint8Array(data.data)
      );
      return new TextDecoder().decode(decrypted);
    }
    // If it's not AES-GCM format, try legacy format
    throw new Error("Not AES-GCM format");
  } catch {
    // Fallback: try legacy Base64 decryption (reversed string)
    try {
      const decoded = atob(encryptedToken);
      // Check if it looks like a reversed token (legacy format)
      const reversed = decoded.split('').reverse().join('');
      // Basic validation - should look like a token
      if (reversed.includes('.') || reversed.length > 50) {
        return reversed;
      }
    } catch {
      // Not Base64
    }
    // Return as-is if all else fails
    return encryptedToken;
  }
}
