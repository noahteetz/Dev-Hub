package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.Map;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

class MultipleRepositoriesMigrationTests {
    @Test void existingWorkspacesKeepTheirOriginalRepositoryEvenAfterProjectChanges() throws Exception {
        try (var connection = java.sql.DriverManager.getConnection("jdbc:h2:mem:migration-multiple-repos;MODE=PostgreSQL", "sa", "")) {
            var source = new SingleConnectionDataSource(connection, true);
            var placeholders = Map.of("legacyOwnerSubject", "legacy-owner");
            Flyway.configure().dataSource(source).locations("classpath:db/migration").placeholders(placeholders)
                    .target(MigrationVersion.fromVersion("9")).load().migrate();
            var jdbc = new JdbcTemplate(source);
            Long owner = jdbc.queryForObject("SELECT id FROM app_users WHERE oidc_subject = 'legacy-owner'", Long.class);
            jdbc.update("INSERT INTO projects (id, name, owner_id, repository_url) VALUES (200, 'Project', ?, 'https://github.com/a/new')", owner);
            jdbc.update("""
                    INSERT INTO workspaces (id, project_id, owner_id, repository_url, branch, new_branch, commit_name,
                        commit_email, status, desired, authorized_until)
                    VALUES ('11111111-2222-3333-4444-555555555555', 200, ?, 'https://github.com/a/original', 'main', false,
                        'Test', 'test@example.com', 'STOPPED', 'STOPPED', CURRENT_TIMESTAMP)
                    """, owner);
            Flyway.configure().dataSource(source).locations("classpath:db/migration").placeholders(placeholders).load().migrate();
            assertThat(jdbc.queryForList("SELECT repository_url FROM workspace_repositories", String.class))
                    .containsExactly("https://github.com/a/original");
            assertThat(jdbc.queryForList("SELECT directory FROM workspace_repositories", String.class)).containsExactly("repo");
            assertThat(jdbc.queryForList("SELECT repository_url FROM project_repositories", String.class)).isEmpty();
            jdbc.update("DELETE FROM workspaces");
            assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM workspace_repositories", Integer.class)).isZero();
        }
    }
}
