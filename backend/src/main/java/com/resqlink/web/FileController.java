package com.resqlink.web;

import com.resqlink.domain.Incident;
import com.resqlink.error.ApiException;
import com.resqlink.repo.IncidentRepository;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.FileStorageService;
import com.resqlink.service.IncidentService;
import java.util.concurrent.TimeUnit;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Serves incident evidence only to users who are authorised to see that incident. */
@RestController
@RequestMapping("/api/v1/files")
public class FileController {
    private final FileStorageService files;
    private final IncidentRepository incidents;
    private final IncidentService incidentService;
    private final CurrentUser current;

    public FileController(FileStorageService files, IncidentRepository incidents, IncidentService incidentService, CurrentUser current) {
        this.files = files;
        this.incidents = incidents;
        this.incidentService = incidentService;
        this.current = current;
    }

    @GetMapping("/{name}")
    public ResponseEntity<byte[]> get(@PathVariable String name) {
        var user = current.getOperational();
        if (!FileStorageService.validKey(name)) throw ApiException.notFound("File");
        Incident i = incidents.findByImageUrl(FileStorageService.URL_PREFIX + name).orElseThrow(() -> ApiException.notFound("File"));
        if (!incidentService.canAccess(user, i)) throw ApiException.notFound("File");
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(FileStorageService.mimeFor(name)))
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'")
                .cacheControl(CacheControl.maxAge(1, TimeUnit.HOURS).cachePrivate())
                .body(files.readKey(name).orElseThrow(() -> ApiException.notFound("File")));
    }
}
