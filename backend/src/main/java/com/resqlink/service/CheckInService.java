package com.resqlink.service;

import com.resqlink.domain.User;
import com.resqlink.error.ApiException;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Peer-support check-ins. A person checks in "OK" or "NEED_HELP" and picks how often they will check in.
 * Whoever is overdue, or asked for help, appears at the top of the board that volunteers and dispatchers see.
 * Overdue is computed when read, so no background job is needed and nothing can be missed after a restart.
 */
@Service
public class CheckInService {
    private static final int DEFAULT_INTERVAL_HOURS = 24;
    private static final int MAX_NOTE = 280;

    private final JdbcTemplate jdbc;
    private final AuditService audit;

    public CheckInService(JdbcTemplate jdbc, AuditService audit) {
        this.jdbc = jdbc;
        this.audit = audit;
    }

    public record CheckInDto(long id, String status, String note, Instant createdAt, int intervalHours, Instant nextDueAt) {}

    public record MineDto(CheckInDto latest, int intervalHours, Instant nextDueAt, boolean overdue) {}

    public record BoardRow(long userId, String fullName, String phone, String latestStatus, String note,
                           Instant lastCheckInAt, int intervalHours, Instant nextDueAt, boolean overdue, boolean needsHelp,
                           Instant lastFollowUpAt, String lastFollowUpBy) {}

    public CheckInDto submit(User user, String status, String note, Integer intervalHours) {
        String s = status == null ? "" : status.trim().toUpperCase();
        if (!s.equals("OK") && !s.equals("NEED_HELP")) throw ApiException.badRequest("status must be OK or NEED_HELP");
        String n = cleanNote(note);
        int interval = intervalHours != null ? intervalHours : previousInterval(user.getId());
        if (interval < 1 || interval > 72) throw ApiException.badRequest("intervalHours must be between 1 and 72");
        Instant now = Instant.now();
        Long id = jdbc.queryForObject(
                "INSERT INTO check_ins(user_id, status, note, interval_hours, created_at) VALUES (?, ?, ?, ?, ?) RETURNING id",
                Long.class, user.getId(), s, n, interval, Timestamp.from(now));
        return new CheckInDto(id == null ? 0L : id, s, n, now, interval, now.plus(Duration.ofHours(interval)));
    }

    public MineDto mine(Long userId) {
        List<CheckInDto> rows = jdbc.query(
                "SELECT id, status, note, created_at, interval_hours FROM check_ins WHERE user_id = ? "
                        + "ORDER BY created_at DESC, id DESC LIMIT 1",
                (rs, i) -> {
                    Instant at = rs.getTimestamp("created_at").toInstant();
                    int h = rs.getInt("interval_hours");
                    return new CheckInDto(rs.getLong("id"), rs.getString("status"), rs.getString("note"), at, h, at.plus(Duration.ofHours(h)));
                },
                userId);
        if (rows.isEmpty()) return new MineDto(null, DEFAULT_INTERVAL_HOURS, null, false);
        CheckInDto latest = rows.get(0);
        boolean overdue = Instant.now().isAfter(latest.nextDueAt());
        return new MineDto(latest, latest.intervalHours(), latest.nextDueAt(), overdue);
    }

    public List<BoardRow> board() {
        List<BoardRow> fetched = jdbc.query(
                "SELECT u.id AS uid, u.full_name, u.phone, c.status, c.note, c.created_at, c.interval_hours, "
                        + "f.created_at AS f_at, fu.full_name AS f_by "
                        + "FROM check_ins c "
                        + "JOIN users u ON u.id = c.user_id "
                        + "LEFT JOIN LATERAL (SELECT created_at, by_user_id FROM check_in_follow_ups "
                        + "                   WHERE user_id = c.user_id ORDER BY created_at DESC, id DESC LIMIT 1) f ON TRUE "
                        + "LEFT JOIN users fu ON fu.id = f.by_user_id "
                        + "WHERE c.id IN (SELECT MAX(id) FROM check_ins GROUP BY user_id) AND u.status = 'ACTIVE'",
                (rs, i) -> {
                    Instant at = rs.getTimestamp("created_at").toInstant();
                    int h = rs.getInt("interval_hours");
                    Instant due = at.plus(Duration.ofHours(h));
                    String status = rs.getString("status");
                    Timestamp fAt = rs.getTimestamp("f_at");
                    return new BoardRow(rs.getLong("uid"), rs.getString("full_name"), rs.getString("phone"), status,
                            rs.getString("note"), at, h, due, Instant.now().isAfter(due), "NEED_HELP".equals(status),
                            fAt == null ? null : fAt.toInstant(), rs.getString("f_by"));
                });
        List<BoardRow> rows = new ArrayList<>(fetched);
        // Needs help first, then overdue (longest overdue first), then everyone else by who checked in longest ago.
        rows.sort(Comparator
                .comparing((BoardRow r) -> !r.needsHelp())
                .thenComparing(r -> !r.overdue())
                .thenComparing(BoardRow::nextDueAt));
        return rows;
    }

    public void followUp(User by, long userId, String note) {
        Integer known = jdbc.queryForObject("SELECT count(*) FROM check_ins WHERE user_id = ?", Integer.class, userId);
        if (known == null || known == 0) throw ApiException.notFound("Check-in");
        String n = cleanNote(note);
        jdbc.update("INSERT INTO check_in_follow_ups(user_id, by_user_id, note, created_at) VALUES (?, ?, ?, ?)",
                userId, by.getId(), n, Timestamp.from(Instant.now()));
        audit.log(by.getId(), "CHECKIN_FOLLOW_UP", "USER", userId, n);
    }

    private int previousInterval(Long userId) {
        List<Integer> rows = jdbc.query(
                "SELECT interval_hours FROM check_ins WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
                (rs, i) -> rs.getInt(1), userId);
        return rows.isEmpty() ? DEFAULT_INTERVAL_HOURS : rows.get(0);
    }

    private static String cleanNote(String note) {
        if (note == null) return null;
        String n = note.trim();
        if (n.isEmpty()) return null;
        if (n.length() > MAX_NOTE) throw ApiException.badRequest("note must be at most " + MAX_NOTE + " characters");
        return n;
    }
}
