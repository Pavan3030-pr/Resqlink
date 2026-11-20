package com.resqlink.security;

import com.resqlink.domain.Role;

/** Authenticated principal. Built from the database on every request, never from token claims alone. */
public record AuthUser(long id, String email, Role role) {}
