package com.resqlink.service.storage;

import com.resqlink.config.AppProperties;
import java.io.IOException;
import java.nio.file.Path;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class StorageConfig {
    @Bean
    BlobStore blobStore(AppProperties props) throws IOException {
        var s = props.storage();
        if ("s3".equalsIgnoreCase(s.type())) {
            if (s.bucket().isBlank() || s.accessKey().isBlank() || s.secretKey().isBlank()) {
                throw new IllegalStateException("STORAGE_TYPE=s3 requires S3_BUCKET, S3_ACCESS_KEY and S3_SECRET_KEY");
            }
            return new S3BlobStore(s.bucket(), s.region(), s.endpoint(), s.accessKey(), s.secretKey());
        }
        return new LocalBlobStore(Path.of(props.uploadDir()));
    }
}
