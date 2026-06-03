package com.aicc.backend.common.security;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;

/**
 * AES-256-GCM authenticated encryption for sensitive field storage.
 *
 * Encryption targets (apply via @Convert or explicit service calls):
 *   - CaptureEvent.payload bodies containing raw AI conversation text
 *   - SemanticMemory.content for sensitive project context
 *
 * Key management:
 *   - Key sourced from ENCRYPTION_KEY env var (base64-encoded 32 bytes)
 *   - Key must never be committed to source control
 *   - Rotate via re-encryption job + new key version (future enhancement)
 *
 * Wire format: Base64( IV[12] || Ciphertext+AuthTag )
 */
@Service
public class EncryptionService {

    private static final Logger log = LoggerFactory.getLogger(EncryptionService.class);
    private static final String ALGORITHM   = "AES/GCM/NoPadding";
    private static final int    IV_BYTES    = 12;   // 96-bit IV — GCM standard
    private static final int    TAG_BITS    = 128;  // 128-bit authentication tag
    private static final int    KEY_BYTES   = 32;   // 256-bit key

    private final SecretKey secretKey;
    private final boolean   encryptionEnabled;

    public EncryptionService(@Value("${aicc.encryption.key:}") String base64Key) {
        if (base64Key == null || base64Key.isBlank()) {
            log.warn("ENCRYPTION_KEY not set — EncryptionService running in passthrough mode. " +
                     "Set aicc.encryption.key for production.");
            this.secretKey = null;
            this.encryptionEnabled = false;
        } else {
            byte[] keyBytes = Base64.getDecoder().decode(base64Key);
            if (keyBytes.length != KEY_BYTES) {
                throw new IllegalStateException(
                        "ENCRYPTION_KEY must decode to exactly 32 bytes (AES-256), " +
                        "got " + keyBytes.length + " bytes");
            }
            this.secretKey = new SecretKeySpec(keyBytes, "AES");
            this.encryptionEnabled = true;
        }
    }

    @PostConstruct
    void logStartupState() {
        if (encryptionEnabled) {
            log.info("EncryptionService ready — AES-256-GCM active");
        }
    }

    /**
     * Encrypts plaintext. Returns the original string unchanged if encryption is disabled
     * (dev mode without key). Always use decrypt() on the return value to reverse.
     */
    public String encrypt(String plaintext) {
        if (!encryptionEnabled || plaintext == null) return plaintext;
        try {
            byte[] iv = new byte[IV_BYTES];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            // Layout: [IV (12 bytes) | ciphertext + auth tag]
            byte[] combined = new byte[IV_BYTES + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, IV_BYTES);
            System.arraycopy(ciphertext, 0, combined, IV_BYTES, ciphertext.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception ex) {
            throw new IllegalStateException("Encryption failed", ex);
        }
    }

    /**
     * Decrypts a value produced by encrypt(). Returns the original value unchanged
     * if encryption is disabled.
     */
    public String decrypt(String ciphertext) {
        if (!encryptionEnabled || ciphertext == null) return ciphertext;
        try {
            byte[] combined = Base64.getDecoder().decode(ciphertext);
            byte[] iv         = Arrays.copyOfRange(combined, 0, IV_BYTES);
            byte[] encrypted  = Arrays.copyOfRange(combined, IV_BYTES, combined.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, new GCMParameterSpec(TAG_BITS, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("Decryption failed", ex);
        }
    }

    public boolean isEnabled() {
        return encryptionEnabled;
    }
}
