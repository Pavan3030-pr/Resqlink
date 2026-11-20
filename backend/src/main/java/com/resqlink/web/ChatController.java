package com.resqlink.web;

import com.resqlink.domain.Role;
import com.resqlink.security.CurrentUser;
import com.resqlink.service.ChatService;
import com.resqlink.web.dto.Dtos.ChannelSyncDto;
import com.resqlink.web.dto.Dtos.ChatTokenDto;
import com.resqlink.web.dto.Dtos.ContactDto;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/chat")
public class ChatController {
    private final ChatService chat;
    private final CurrentUser current;

    public ChatController(ChatService chat, CurrentUser current) {
        this.chat = chat;
        this.current = current;
    }

    /** Issues a Nexconn token for the caller only. The App Secret never leaves the server. */
    @PostMapping("/token")
    public ChatTokenDto token() { return chat.token(current.getOperational()); }

    @GetMapping("/contacts")
    public List<ContactDto> contacts() { return chat.contacts(current.getOperational()); }

    @PostMapping("/channels/incidents/{incidentId}")
    public ChannelSyncDto ensure(@PathVariable Long incidentId) {
        return chat.ensureIncidentChannel(current.requireRole(Role.DISPATCHER, Role.ADMIN), incidentId);
    }

    @PostMapping("/channels/incidents/{incidentId}/invite-reporter")
    public ChannelSyncDto invite(@PathVariable Long incidentId) {
        return chat.inviteReporter(current.requireRole(Role.DISPATCHER, Role.ADMIN), incidentId);
    }

    /** Returns the channel id only to users authorised for that incident's channel. */
    @GetMapping("/channels/incidents/{incidentId}")
    public Map<String, String> channel(@PathVariable Long incidentId) {
        return Map.of("channelId", chat.channelFor(current.getOperational(), incidentId));
    }
}
