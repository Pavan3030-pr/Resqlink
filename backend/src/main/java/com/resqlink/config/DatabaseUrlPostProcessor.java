package com.resqlink.config;

import com.resqlink.core.DatabaseUrl;
import java.util.HashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/** Accepts the postgres://user:pass@host/db form that managed hosts (Render, Heroku, Supabase) provide as DATABASE_URL. */
public class DatabaseUrlPostProcessor implements EnvironmentPostProcessor {
    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        DatabaseUrl.Parsed p = DatabaseUrl.parse(env.getProperty("DATABASE_URL"));
        if (p == null) return;
        Map<String, Object> m = new HashMap<>();
        m.put("spring.datasource.url", p.jdbcUrl());
        if (p.username() != null) m.put("spring.datasource.username", p.username());
        if (p.password() != null) m.put("spring.datasource.password", p.password());
        env.getPropertySources().addFirst(new MapPropertySource("resqlinkDatabaseUrl", m));
    }
}
