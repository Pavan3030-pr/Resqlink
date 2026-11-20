package com.resqlink.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "resqlink")
public record AppProperties(
        Jwt jwt,
        Cors cors,
        String uploadDir,
        Storage storage,
        boolean demoMode,
        boolean seedDemoData,
        String demoPassword,
        RateLimit rateLimit,
        Nexconn nexconn,
        Gemini gemini) {

    /** type = local (development) or s3 (any S3-compatible private bucket: AWS S3, Cloudflare R2, Supabase Storage, MinIO). */
    public record Storage(String type, String bucket, String region, String endpoint, String accessKey, String secretKey,
                          boolean migrateLocalOnStartup) {}

    public record Jwt(String secret, int expiryHours) {}

    public record Cors(String allowedOrigins) {}

    public record RateLimit(int authPerMinute, int reportPerMinute) {}

    public record Nexconn(String appKey, String appSecret, String apiDomain, int webhookMaxSkewSeconds) {
        public boolean configured() {
            return notBlank(appKey) && notBlank(appSecret) && notBlank(apiDomain);
        }
    }

    public record Gemini(String apiKey, String model, String embeddingModel, String baseUrl, int timeoutSeconds,
                         boolean sendImages, Double priceInPerMillion, Double priceOutPerMillion) {
        public boolean configured() { return notBlank(apiKey); }
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }
}
