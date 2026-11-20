package com.resqlink.web;

import com.resqlink.service.WebhookService;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/webhooks")
public class WebhookController {
    private final WebhookService webhooks;

    public WebhookController(WebhookService webhooks) { this.webhooks = webhooks; }

    /** Public endpoint, authenticated only by the Nexconn signature (Nonce + Timestamp + Signature headers). */
    @PostMapping("/nexconn")
    public Map<String, Object> nexconn(@RequestHeader(value = "Nonce", required = false) String nonce,
                                       @RequestHeader(value = "Timestamp", required = false) String timestamp,
                                       @RequestHeader(value = "Signature", required = false) String signature,
                                       @RequestBody String body) {
        webhooks.verify(nonce, timestamp, signature);
        return Map.of("handled", webhooks.handle(body));
    }
}
