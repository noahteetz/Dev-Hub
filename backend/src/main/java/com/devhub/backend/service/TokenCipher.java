package com.devhub.backend.service;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Encrypts provider tokens before they reach the database. The key lives only in the
 * environment, so a database dump on its own does not expose any token.
 *
 * <p>The stored value is Base64 of {@code iv || ciphertext || tag}. A fresh random IV per
 * write means the same token never produces the same stored value twice.</p>
 */
@Component
public class TokenCipher {

	private static final String ALGORITHM = "AES";
	private static final String TRANSFORMATION = "AES/GCM/NoPadding";
	private static final int IV_LENGTH = 12;
	private static final int TAG_LENGTH_BITS = 128;

	private final SecretKey key;
	private final SecureRandom random = new SecureRandom();

	public TokenCipher(@Value("${devhub.security.encryption-key:}") String encodedKey) {
		this.key = readKey(encodedKey);
	}

	/** False when no key is configured. Storing tokens is refused in that case. */
	public boolean isConfigured() {
		return key != null;
	}

	public String encrypt(String plainText) {
		if (key == null) {
			throw new IllegalStateException("No encryption key is configured");
		}
		if (plainText == null || plainText.isEmpty()) {
			throw new IllegalArgumentException("Nothing to encrypt");
		}
		byte[] iv = new byte[IV_LENGTH];
		random.nextBytes(iv);
		try {
			Cipher cipher = Cipher.getInstance(TRANSFORMATION);
			cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
			byte[] encrypted = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
			byte[] combined = new byte[iv.length + encrypted.length];
			System.arraycopy(iv, 0, combined, 0, iv.length);
			System.arraycopy(encrypted, 0, combined, iv.length, encrypted.length);
			return Base64.getEncoder().encodeToString(combined);
		} catch (GeneralSecurityException exception) {
			throw new IllegalStateException("The token could not be encrypted", exception);
		}
	}

	/**
	 * @throws TokenUnreadableException when the key changed or the stored value is damaged
	 */
	public String decrypt(String storedValue) {
		if (key == null) {
			throw new TokenUnreadableException("No encryption key is configured");
		}
		if (storedValue == null || storedValue.isBlank()) {
			throw new TokenUnreadableException("The stored token is empty");
		}
		byte[] combined;
		try {
			combined = Base64.getDecoder().decode(storedValue);
		} catch (IllegalArgumentException exception) {
			throw new TokenUnreadableException("The stored token is not valid Base64");
		}
		if (combined.length <= IV_LENGTH) {
			throw new TokenUnreadableException("The stored token is too short");
		}
		byte[] iv = new byte[IV_LENGTH];
		System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
		byte[] encrypted = new byte[combined.length - IV_LENGTH];
		System.arraycopy(combined, IV_LENGTH, encrypted, 0, encrypted.length);
		try {
			Cipher cipher = Cipher.getInstance(TRANSFORMATION);
			cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
			return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
		} catch (GeneralSecurityException exception) {
			// A tag mismatch is the normal symptom of a rotated key, not a bug worth a stack trace.
			throw new TokenUnreadableException("The stored token could not be decrypted");
		}
	}

	private static SecretKey readKey(String encodedKey) {
		if (encodedKey == null || encodedKey.isBlank()) {
			return null;
		}
		byte[] decoded;
		try {
			decoded = Base64.getDecoder().decode(encodedKey.trim());
		} catch (IllegalArgumentException exception) {
			throw new IllegalStateException(
					"DEVHUB_ENCRYPTION_KEY must be Base64. Generate one with: openssl rand -base64 32"
			);
		}
		if (decoded.length != 16 && decoded.length != 24 && decoded.length != 32) {
			throw new IllegalStateException(
					"DEVHUB_ENCRYPTION_KEY must decode to 16, 24 or 32 bytes but decoded to " + decoded.length
			);
		}
		return new SecretKeySpec(decoded, ALGORITHM);
	}

	/** Raised when a stored token cannot be read back, usually after an encryption key change. */
	public static class TokenUnreadableException extends RuntimeException {
		public TokenUnreadableException(String message) {
			super(message);
		}
	}
}
