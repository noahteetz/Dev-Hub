package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.*;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

class UnifiedProfilesMigrationTests {
    @Test void preservesIdsLoginsAndLiveShellBindingsAndDisambiguatesNames() throws Exception {
        try (var connection = java.sql.DriverManager.getConnection("jdbc:h2:mem:unified-profile-migration;MODE=PostgreSQL", "sa", "")) {
            var source = new SingleConnectionDataSource(connection, true);
            var placeholders = Map.of("legacyOwnerSubject", "legacy-owner");
            Flyway.configure().dataSource(source).locations("classpath:db/migration").placeholders(placeholders)
                    .target(MigrationVersion.fromVersion("9")).load().migrate();
            var jdbc = new JdbcTemplate(source);
            Long owner = jdbc.queryForObject("SELECT id FROM app_users WHERE oidc_subject = 'legacy-owner'", Long.class);
            String claude = UUID.randomUUID().toString(), codex = UUID.randomUUID().toString(), conflicting = UUID.randomUUID().toString();
            for (var item : List.of(List.of(claude, "CLAUDE", "Work"), List.of(codex, "CODEX", "work"), List.of(conflicting, "CODEX", "Work (Claude)")))
                jdbc.update("INSERT INTO ai_profiles (id, owner_id, provider, name) VALUES (?, ?, ?, ?)", item.get(0), owner, item.get(1), item.get(2));
            jdbc.update("INSERT INTO projects (id, name, owner_id) VALUES (200, 'Test', ?)", owner);
            String workspace = UUID.randomUUID().toString(), terminal = UUID.randomUUID().toString();
            jdbc.update("""
                INSERT INTO workspaces (id, project_id, owner_id, repository_url, branch, new_branch, commit_name, commit_email, status, desired, authorized_until)
                VALUES (?, 200, ?, 'https://github.com/a/b', 'main', false, 'Test', 'test@example.com', 'RUNNING', 'RUNNING', CURRENT_TIMESTAMP)
                """, workspace, owner);
            jdbc.update("INSERT INTO workspace_terminals (id, workspace_id, provider, profile_id) VALUES (?, ?, 'CLAUDE', ?)", terminal, workspace, claude);
            Flyway.configure().dataSource(source).locations("classpath:db/migration").placeholders(placeholders).load().migrate();
            assertThat(jdbc.queryForList("SELECT id FROM ai_profiles", String.class)).containsExactlyInAnyOrder(claude, codex, conflicting);
            assertThat(jdbc.queryForObject("SELECT provider FROM ai_profile_providers WHERE profile_id = ?", String.class, claude)).isEqualTo("CLAUDE");
            assertThat(jdbc.queryForObject("SELECT provider FROM ai_profile_providers WHERE profile_id = ?", String.class, codex)).isEqualTo("CODEX");
            assertThat(jdbc.queryForList("SELECT normalized_name FROM ai_profiles", String.class)).doesNotHaveDuplicates();
            assertThat(jdbc.queryForObject("SELECT name FROM ai_profiles WHERE id = ?", String.class, conflicting)).isEqualTo("Work (Claude)");
            assertThat(jdbc.queryForObject("SELECT launch_mode FROM workspace_terminals WHERE id = ?", String.class, terminal)).isEqualTo("SHELL");
            assertThat(jdbc.queryForObject("SELECT profile_id FROM workspace_terminals WHERE id = ?", String.class, terminal)).isEqualTo(claude);
            assertThat(jdbc.queryForObject("SELECT provider FROM workspace_terminal_providers WHERE terminal_id = ?", String.class, terminal)).isEqualTo("CLAUDE");
            jdbc.update("DELETE FROM workspace_terminals WHERE id = ?", terminal);
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM workspace_terminal_providers", Integer.class)).isZero();
        }
    }
}
