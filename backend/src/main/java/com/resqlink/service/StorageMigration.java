package com.resqlink.service;

import com.resqlink.config.AppProperties;
import com.resqlink.repo.IncidentRepository;
import com.resqlink.service.storage.BlobStore;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * One-off migration from the old local upload directory to the configured store (STORAGE_MIGRATE_LOCAL=true).
 * Object keys are unchanged, so no database update is needed. Idempotent: objects that already exist are skipped.
 * Legacy WebP uploads are not migrated (they were never sanitised); the incident simply shows no photo.
 */
@Component
public class StorageMigration implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(StorageMigration.class);
    private final AppProperties props;
    private final BlobStore store;
    private final IncidentRepository incidents;

    public StorageMigration(AppProperties props, BlobStore store, IncidentRepository incidents) {
        this.props = props;
        this.store = store;
        this.incidents = incidents;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!props.storage().migrateLocalOnStartup() || "local".equals(store.kind())) return;
        Path dir = Path.of(props.uploadDir()).toAbsolutePath().normalize();
        if (!Files.isDirectory(dir)) { log.info("Storage migration: {} does not exist, nothing to migrate", dir); return; }
        int moved = 0, skipped = 0, failed = 0;
        try (var files = Files.list(dir)) {
            for (Path p : (Iterable<Path>) files::iterator) {
                String name = p.getFileName().toString();
                if (!FileStorageService.validKey(name)) { skipped++; continue; }
                try {
                    if (store.exists(name)) { skipped++; continue; }
                    store.put(name, Files.readAllBytes(p), FileStorageService.mimeFor(name));
                    moved++;
                } catch (IOException | RuntimeException e) {
                    failed++;
                    log.warn("Storage migration failed for {}: {}", name, e.getClass().getSimpleName());
                }
            }
        } catch (IOException e) {
            log.warn("Storage migration could not list {}", dir);
        }
        log.info("Storage migration finished: {} moved, {} skipped, {} failed", moved, skipped, failed);
    }
}
