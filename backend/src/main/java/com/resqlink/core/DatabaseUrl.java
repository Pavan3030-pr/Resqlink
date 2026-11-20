package com.resqlink.core;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

/** Converts managed-database URLs (postgres://user:pass@host:5432/db) to JDBC form plus credentials. */
public final class DatabaseUrl {
    public record Parsed(String jdbcUrl, String username, String password) {}

    private DatabaseUrl() {}

    /** @return null when the value is already a JDBC URL (or empty) and needs no conversion */
    public static Parsed parse(String url) {
        if (url == null || url.isBlank() || url.startsWith("jdbc:")) return null;
        if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) return null;
        URI u = URI.create(url.replaceFirst("^postgres(ql)?://", "http://"));
        String user = null, pass = null;
        if (u.getRawUserInfo() != null) {
            String[] parts = u.getRawUserInfo().split(":", 2);
            user = URLDecoder.decode(parts[0], StandardCharsets.UTF_8);
            if (parts.length > 1) pass = URLDecoder.decode(parts[1], StandardCharsets.UTF_8);
        }
        int port = u.getPort() > 0 ? u.getPort() : 5432;
        String query = u.getRawQuery() == null ? "" : "?" + u.getRawQuery();
        return new Parsed("jdbc:postgresql://" + u.getHost() + ":" + port + u.getRawPath() + query, user, pass);
    }
}
