package com.resqlink.web;

import com.resqlink.security.CurrentUser;
import com.resqlink.service.AuthService;
import com.resqlink.service.UserMapper;
import com.resqlink.web.dto.Dtos.AuthResponse;
import com.resqlink.web.dto.Dtos.LoginRequest;
import com.resqlink.web.dto.Dtos.RegisterRequest;
import com.resqlink.web.dto.Dtos.UserDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService auth;
    private final CurrentUser current;

    public AuthController(AuthService auth, CurrentUser current) {
        this.auth = auth;
        this.current = current;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest req) { return auth.register(req); }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) { return auth.login(req); }

    /** Signs out everywhere: all tokens issued to this user stop working immediately. */
    @PostMapping("/logout")
    public java.util.Map<String, Boolean> logout() {
        auth.revokeSessions(current.get().getId());
        return java.util.Map.of("ok", true);
    }

    @GetMapping("/me")
    public UserDto me() { return UserMapper.toDto(current.get()); }
}
