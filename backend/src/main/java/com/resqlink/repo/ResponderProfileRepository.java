package com.resqlink.repo;

import com.resqlink.domain.ResponderProfile;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResponderProfileRepository extends JpaRepository<ResponderProfile, Long> {
    Optional<ResponderProfile> findByUserId(Long userId);

    List<ResponderProfile> findByUserIdIn(Collection<Long> userIds);
}
