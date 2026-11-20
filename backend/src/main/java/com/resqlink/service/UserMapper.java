package com.resqlink.service;

import com.resqlink.core.IncidentNumbers;
import com.resqlink.domain.User;
import com.resqlink.web.dto.Dtos.UserDto;

public final class UserMapper {
    private UserMapper() {}

    public static UserDto toDto(User u) {
        return new UserDto(u.getId(), u.getFullName(), u.getEmail(), u.getPhone(), u.getRole(),
                u.getVerificationStatus(), IncidentNumbers.chatUserId(u.getId()), u.getCreatedAt(), u.getStatus());
    }
}
