package com.resqlink;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

/**
 * Full road-accident workflow against a real PostGIS database. Skipped automatically when Docker is unavailable.
 * Nexconn and Gemini are intentionally not configured: chat endpoints must fail closed and AI uses the labelled fallback.
 */
@Testcontainers(disabledWithoutDocker = true)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "resqlink.jwt.secret=test-secret-test-secret-test-secret-123456",
        "resqlink.seed-demo-data=true",
        "resqlink.demo-password=Demo@12345",
        "resqlink.rate-limit.auth-per-minute=1000",
        "resqlink.rate-limit.report-per-minute=1000"
})
class ApiWorkflowTest {

    @Container
    static final PostgreSQLContainer<?> DB = new PostgreSQLContainer<>(
            DockerImageName.parse("postgis/postgis:16-3.4").asCompatibleSubstituteFor("postgres"));

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) throws Exception {
        r.add("spring.datasource.url", DB::getJdbcUrl);
        r.add("spring.datasource.username", DB::getUsername);
        r.add("spring.datasource.password", DB::getPassword);
        r.add("resqlink.upload-dir", () -> {
            try { return Files.createTempDirectory("resqlink-uploads").toString(); } catch (Exception e) { throw new IllegalStateException(e); }
        });
    }

    @Autowired TestRestTemplate http;

    @SuppressWarnings({"unchecked", "rawtypes"})
    private ResponseEntity<Map> call(HttpMethod m, String path, String token, Object body) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        if (token != null) h.setBearerAuth(token);
        return http.exchange("/api/v1" + path, m, new HttpEntity<>(body, h), Map.class);
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private ResponseEntity<List> callList(String path, String token) {
        HttpHeaders h = new HttpHeaders();
        h.setBearerAuth(token);
        return http.exchange("/api/v1" + path, HttpMethod.GET, new HttpEntity<>(h), List.class);
    }

    private String login(String email) {
        ResponseEntity<Map> r = call(HttpMethod.POST, "/auth/login", null, Map.of("email", email, "password", "Demo@12345"));
        assertEquals(HttpStatus.OK, r.getStatusCode(), email);
        return (String) r.getBody().get("token");
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> map(Object o) { return (Map<String, Object>) o; }

    @Test
    void roadAccidentWorkflowAndSecurity() throws Exception {
        String citizen = login("citizen@resqlink.demo");
        String dispatcher = login("dispatcher@resqlink.demo");
        String responder = login("ambulance1@resqlink.demo");

        // access control
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.GET, "/incidents", null, null).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, call(HttpMethod.GET, "/responders", citizen, null).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.POST, "/webhooks/nexconn", null, Map.of()).getStatusCode());
        assertEquals(HttpStatus.UNAUTHORIZED, call(HttpMethod.POST, "/auth/login", null, Map.of("email", "citizen@resqlink.demo", "password", "wrong-password")).getStatusCode());

        // validation
        assertEquals(HttpStatus.BAD_REQUEST, call(HttpMethod.POST, "/incidents", citizen,
                Map.of("category", "ACCIDENT", "description", "short", "latitude", 17.38, "longitude", 78.48)).getStatusCode());

        // 1. citizen reports
        ResponseEntity<Map> created = call(HttpMethod.POST, "/incidents", citizen, Map.of(
                "category", "ACCIDENT",
                "description", "Two vehicles collided near the flyover, one person is injured and a lane is blocked.",
                "latitude", 17.3850, "longitude", 78.4867, "incidentTime", Instant.now().toString()));
        assertEquals(HttpStatus.CREATED, created.getStatusCode());
        Map<String, Object> summary = map(created.getBody().get("summary"));
        long id = ((Number) summary.get("id")).longValue();
        assertTrue(((String) summary.get("incidentNumber")).startsWith("RL-"));

        // 2. async AI analysis (rule-based fallback because Gemini is not configured)
        Map<String, Object> detail = null;
        for (int i = 0; i < 40; i++) {
            detail = call(HttpMethod.GET, "/incidents/" + id, dispatcher, null).getBody();
            if ("AWAITING_VERIFICATION".equals(map(detail.get("summary")).get("status"))) break;
            Thread.sleep(500);
        }
        assertEquals("AWAITING_VERIFICATION", map(detail.get("summary")).get("status"));
        assertNotNull(detail.get("analysis"));
        assertEquals("rule-based-fallback", map(detail.get("analysis")).get("modelVersion"));

        // reporter sees own report; other citizen-level access is hidden
        assertEquals(HttpStatus.OK, call(HttpMethod.GET, "/incidents/" + id, citizen, null).getStatusCode());
        assertEquals(HttpStatus.NOT_FOUND, call(HttpMethod.GET, "/incidents/" + id, responder, null).getStatusCode());

        // 3. responders cannot be assigned before verification
        List<?> responders = callList("/responders", dispatcher).getBody();
        long responderId = ((Number) map(responders.get(0)).get("userId")).longValue();
        assertEquals(HttpStatus.CONFLICT, call(HttpMethod.POST, "/assignments", dispatcher,
                Map.of("incidentId", id, "responderId", responderId)).getStatusCode());

        // 4. duplicate check + verification + recommendations
        assertEquals(HttpStatus.OK, call(HttpMethod.POST, "/ai/incidents/" + id + "/duplicates", dispatcher, Map.of()).getStatusCode());
        ResponseEntity<Map> verified = call(HttpMethod.PATCH, "/incidents/" + id + "/status", dispatcher, Map.of("status", "VERIFIED"));
        assertEquals(HttpStatus.OK, verified.getStatusCode());
        ResponseEntity<List> recs = http.exchange("/api/v1/ai/incidents/" + id + "/recommendations", HttpMethod.POST,
                new HttpEntity<>(Map.of(), authJson(dispatcher)), List.class);
        assertEquals(HttpStatus.OK, recs.getStatusCode());
        assertTrue(recs.getBody().size() >= 2);

        // 5. assign (chat is not configured, assignment must still succeed and report chatSynced=false)
        long first = ((Number) map(recs.getBody().get(0)).get("responderId")).longValue();
        ResponseEntity<Map> assigned = call(HttpMethod.POST, "/assignments", dispatcher, Map.of("incidentId", id, "responderId", first));
        assertEquals(HttpStatus.CREATED, assigned.getStatusCode());
        assertEquals(false, assigned.getBody().get("chatSynced"));
        assertEquals("PENDING", assigned.getBody().get("chatSyncStatus"), "channel sync runs after commit and never blocks the assignment");
        assertEquals(HttpStatus.CONFLICT, call(HttpMethod.POST, "/assignments", dispatcher, Map.of("incidentId", id, "responderId", first)).getStatusCode());

        // without Nexconn credentials the channel sync must end FAILED and stay visible (not silently pending forever)
        Map<String, Object> ch = null;
        for (int i = 0; i < 40; i++) {
            Map<String, Object> d = call(HttpMethod.GET, "/incidents/" + id, dispatcher, null).getBody();
            ch = d.get("channel") == null ? null : map(d.get("channel"));
            if (ch != null && "FAILED".equals(ch.get("syncStatus"))) break;
            Thread.sleep(250);
        }
        assertNotNull(ch, "channel record must exist after assignment");
        assertEquals("FAILED", ch.get("syncStatus"));
        assertNotNull(ch.get("syncError"));

        // chat token fails closed without Nexconn credentials
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, call(HttpMethod.POST, "/chat/token", dispatcher, Map.of()).getStatusCode());

        // 6. responder workflow (only if the top recommendation is the demo responder we logged in as)
        List<?> mine = callList("/assignments/mine", responder).getBody();
        for (Object o : mine) {
            Map<String, Object> a = map(o);
            if (((Number) a.get("incidentId")).longValue() != id) continue;
            long aid = ((Number) a.get("id")).longValue();
            assertEquals(HttpStatus.OK, call(HttpMethod.PATCH, "/assignments/" + aid + "/status", responder, Map.of("status", "ACCEPTED")).getStatusCode());
            assertEquals(HttpStatus.OK, call(HttpMethod.PATCH, "/assignments/" + aid + "/status", responder, Map.of("status", "ARRIVED")).getStatusCode());
            assertEquals("ON_SCENE", map(call(HttpMethod.GET, "/incidents/" + id, dispatcher, null).getBody().get("summary")).get("status"));
            assertEquals(HttpStatus.OK, call(HttpMethod.PATCH, "/assignments/" + aid + "/status", responder, Map.of("status", "COMPLETED")).getStatusCode());
        }

        // 7. resolve and check history + stats
        ResponseEntity<Map> resolved = call(HttpMethod.PATCH, "/incidents/" + id + "/status", dispatcher,
                Map.of("status", "RESOLVED", "reason", "Scene cleared"));
        assertTrue(resolved.getStatusCode() == HttpStatus.OK || resolved.getStatusCode() == HttpStatus.CONFLICT);
        ResponseEntity<Map> stats = call(HttpMethod.GET, "/incidents/stats", dispatcher, null);
        assertEquals(HttpStatus.OK, stats.getStatusCode());
        assertTrue(((Number) stats.getBody().get("total")).longValue() >= 1);
    }

    private HttpHeaders authJson(String token) {
        HttpHeaders h = new HttpHeaders();
        h.setContentType(MediaType.APPLICATION_JSON);
        h.setBearerAuth(token);
        return h;
    }
}
