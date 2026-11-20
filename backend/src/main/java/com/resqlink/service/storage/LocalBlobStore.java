package com.resqlink.service.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import java.util.regex.Pattern;

/** Development adapter: files on local disk. Not suitable for hosts with an ephemeral filesystem. */
public class LocalBlobStore implements BlobStore {
    private static final Pattern SAFE_KEY = Pattern.compile("^[a-f0-9]{32}\\.(jpg|png)$");
    private final Path root;

    public LocalBlobStore(Path root) throws IOException {
        this.root = root.toAbsolutePath().normalize();
        Files.createDirectories(this.root);
    }

    private Path path(String key) {
        if (!SAFE_KEY.matcher(key).matches()) throw new IllegalArgumentException("Unsafe object key");
        Path p = root.resolve(key).normalize();
        if (!p.startsWith(root)) throw new IllegalArgumentException("Unsafe object key");
        return p;
    }

    @Override
    public void put(String key, byte[] bytes, String contentType) {
        try {
            Files.write(path(key), bytes);
        } catch (IOException e) {
            throw new IllegalStateException("Could not store object", e);
        }
    }

    @Override
    public Optional<byte[]> get(String key) {
        try {
            Path p = path(key);
            return Files.isRegularFile(p) ? Optional.of(Files.readAllBytes(p)) : Optional.empty();
        } catch (IOException e) {
            throw new IllegalStateException("Could not read object", e);
        }
    }

    @Override
    public boolean exists(String key) { return Files.isRegularFile(path(key)); }

    @Override
    public String kind() { return "local"; }

    public Path root() { return root; }
}
