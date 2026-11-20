package com.resqlink.service;

import com.resqlink.core.ImageSanitizer;
import com.resqlink.error.ApiException;
import com.resqlink.service.storage.BlobStore;
import java.io.IOException;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Validates, re-encodes (removes EXIF/GPS and hidden payloads) and stores incident evidence in the private store. */
@Service
public class FileStorageService {
    public static final String URL_PREFIX = "/api/v1/files/";
    private final BlobStore store;

    public FileStorageService(BlobStore store) { this.store = store; }

    /** @return the authenticated URL path of the stored image */
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Image file is empty");
        if (file.getSize() > ImageSanitizer.MAX_BYTES) throw ApiException.badRequest("Image is too large (max 5 MB)");
        try {
            ImageSanitizer.Clean clean = ImageSanitizer.sanitize(file.getBytes());
            String key = HexFormat.of().formatHex(UUID.randomUUID().toString().replace("-", "").getBytes()).substring(0, 32) + "." + clean.extension();
            store.put(key, clean.bytes(), clean.mime());
            return URL_PREFIX + key;
        } catch (ImageSanitizer.RejectedImageException e) {
            throw ApiException.badRequest(e.getMessage());
        } catch (IOException | RuntimeException e) {
            throw ApiException.unavailable("Could not store the uploaded image");
        }
    }

    public static boolean validKey(String name) { return name != null && name.matches("^[a-f0-9]{32}\\.(jpg|png)$"); }

    public java.util.Optional<byte[]> readKey(String key) {
        if (!validKey(key)) return java.util.Optional.empty();
        return store.get(key);
    }

    public byte[] read(String urlPath) {
        if (urlPath == null || !urlPath.startsWith(URL_PREFIX)) return null;
        try {
            return readKey(urlPath.substring(URL_PREFIX.length())).orElse(null);
        } catch (RuntimeException e) {
            return null;
        }
    }

    public static String mimeFor(String fileName) { return fileName.endsWith(".png") ? "image/png" : "image/jpeg"; }
}
