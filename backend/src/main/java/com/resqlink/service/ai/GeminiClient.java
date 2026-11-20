package com.resqlink.service.ai;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.resqlink.config.AppProperties;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Thin Gemini REST client returning the model's JSON text output. */
@Component
public class GeminiClient {
    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);

    private final AppProperties.Gemini cfg;
    private final ObjectMapper mapper;
    private final RestClient http;

    public GeminiClient(AppProperties props, ObjectMapper mapper) {
        this.cfg = props.gemini();
        this.mapper = mapper;
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(Duration.ofSeconds(5));
        f.setReadTimeout(Duration.ofSeconds(Math.max(5, cfg.timeoutSeconds())));
        this.http = RestClient.builder().requestFactory(f).baseUrl(cfg.baseUrl()).build();
    }

    public boolean available() { return cfg.configured(); }

    public String model() { return cfg.model(); }

    /** Generates JSON (or plain text when {@code json} is false). Throws on any failure. */
    public String generate(String systemInstruction, String userText, byte[] image, String mime, boolean json) {
        if (!available()) throw new IllegalStateException("Gemini is not configured");
        List<Object> parts = new java.util.ArrayList<>();
        parts.add(Map.of("text", userText));
        if (image != null && image.length > 0) {
            parts.add(Map.of("inlineData", Map.of("mimeType", mime, "data", Base64.getEncoder().encodeToString(image))));
        }
        Map<String, Object> gen = new java.util.LinkedHashMap<>();
        gen.put("temperature", 0.2);
        gen.put("maxOutputTokens", 1024);
        if (json) gen.put("responseMimeType", "application/json");
        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemInstruction))),
                "contents", List.of(Map.of("role", "user", "parts", parts)),
                "generationConfig", gen);

        String raw = http.post()
                .uri("/models/{model}:generateContent", cfg.model())
                .header("x-goog-api-key", cfg.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(String.class);
        try {
            Map<String, Object> root = mapper.readValue(raw, new TypeReference<>() {});
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) root.get("candidates");
            @SuppressWarnings("unchecked")
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> ps = (List<Map<String, Object>>) content.get("parts");
            StringBuilder sb = new StringBuilder();
            for (Map<String, Object> p : ps) if (p.get("text") instanceof String t) sb.append(t);
            return sb.toString();
        } catch (Exception e) {
            log.warn("Unexpected Gemini response shape: {}", e.toString());
            throw new IllegalStateException("Unexpected Gemini response");
        }
    }

    /** Batch text embeddings (one vector per input, same order). Throws on any failure. */
    public List<double[]> embed(List<String> texts) {
        if (!available()) throw new IllegalStateException("Gemini is not configured");
        List<Object> requests = new java.util.ArrayList<>();
        for (String t : texts) {
            requests.add(Map.of("model", "models/" + cfg.embeddingModel(),
                    "content", Map.of("parts", List.of(Map.of("text", t))),
                    "taskType", "SEMANTIC_SIMILARITY"));
        }
        String raw = http.post()
                .uri("/models/{model}:batchEmbedContents", cfg.embeddingModel())
                .header("x-goog-api-key", cfg.apiKey())
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("requests", requests))
                .retrieve()
                .body(String.class);
        try {
            Map<String, Object> root = mapper.readValue(raw, new TypeReference<>() {});
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> embeddings = (List<Map<String, Object>>) root.get("embeddings");
            if (embeddings == null || embeddings.size() != texts.size()) throw new IllegalStateException("embedding count mismatch");
            List<double[]> out = new java.util.ArrayList<>();
            for (Map<String, Object> e : embeddings) {
                @SuppressWarnings("unchecked")
                List<Number> values = (List<Number>) e.get("values");
                double[] v = new double[values.size()];
                for (int i = 0; i < v.length; i++) v[i] = values.get(i).doubleValue();
                out.add(v);
            }
            return out;
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Unexpected embedding response");
        }
    }
}
