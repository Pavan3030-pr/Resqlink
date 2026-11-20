package com.resqlink.service.storage;

import java.util.Optional;

/** Private binary storage for incident evidence. Implementations never expose objects publicly. */
public interface BlobStore {
    void put(String key, byte[] bytes, String contentType);

    Optional<byte[]> get(String key);

    boolean exists(String key);

    /** Human-readable adapter name for health output and logs. */
    String kind();
}
