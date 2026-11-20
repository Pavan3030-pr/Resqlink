package com.resqlink.core;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Password rules: length, mixed character classes, no common passwords, no e-mail or name reuse. */
public final class PasswordPolicy {
    public static final int MIN = 10;
    public static final int MAX = 72; // BCrypt limit
    private static final Set<String> COMMON = Set.of("password", "password1", "password123", "123456789", "1234567890",
            "qwertyuiop", "qwerty123", "iloveyou1", "welcome123", "admin12345", "letmein123", "abc123456", "11111111111");

    private PasswordPolicy() {}

    /** @return human-readable problems; empty when the password is acceptable */
    public static List<String> check(String password, String email, String fullName) {
        List<String> problems = new ArrayList<>();
        if (password == null) return List.of("Password is required");
        if (password.length() < MIN) problems.add("Use at least " + MIN + " characters");
        if (password.length() > MAX) problems.add("Use at most " + MAX + " characters");
        int classes = 0;
        if (password.chars().anyMatch(Character::isLowerCase)) classes++;
        if (password.chars().anyMatch(Character::isUpperCase)) classes++;
        if (password.chars().anyMatch(Character::isDigit)) classes++;
        if (password.chars().anyMatch(c -> !Character.isLetterOrDigit(c))) classes++;
        if (classes < 3) problems.add("Mix at least three of: lowercase, uppercase, digits, symbols");
        String lower = password.toLowerCase(Locale.ROOT);
        if (COMMON.contains(lower)) problems.add("This password is too common");
        if (email != null && email.contains("@")) {
            String local = email.substring(0, email.indexOf('@')).toLowerCase(Locale.ROOT);
            if (local.length() >= 4 && lower.contains(local)) problems.add("Do not include your e-mail name");
        }
        if (fullName != null) {
            for (String part : fullName.toLowerCase(Locale.ROOT).split("\\s+")) {
                if (part.length() >= 4 && lower.contains(part)) { problems.add("Do not include your name"); break; }
            }
        }
        return problems;
    }
}
