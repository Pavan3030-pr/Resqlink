package com.resqlink.repo;

import com.resqlink.domain.Role;
import com.resqlink.domain.User;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findByRoleIn(Collection<Role> roles);

    List<User> findByRole(Role role);
}
