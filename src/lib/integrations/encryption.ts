import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-key-change-in-production";

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
}

export function decrypt(ciphertext: string): string {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

export function encryptJSON<T>(data: T): string {
  return encrypt(JSON.stringify(data));
}

export function decryptJSON<T>(ciphertext: string): T | null {
  try {
    const decrypted = decrypt(ciphertext);
    return JSON.parse(decrypted) as T;
  } catch {
    return null;
  }
}
