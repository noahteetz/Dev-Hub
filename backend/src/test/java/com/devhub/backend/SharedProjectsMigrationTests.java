package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

class SharedProjectsMigrationTests {

	private static final Map<String, String> PLACEHOLDERS = Map.of("legacyOwnerSubject", "legacy-owner");

	@Test
	void keepsFavoritesAndAuthorsWhenTheSharingTablesArrive() throws Exception {
		String url = "jdbc:h2:mem:migration-shared-projects;MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
		try (java.sql.Connection connection = java.sql.DriverManager.getConnection(url, "sa", "")) {
			SingleConnectionDataSource source = new SingleConnectionDataSource(connection, true);
			Flyway.configure().dataSource(source).locations("classpath:db/migration").placeholders(PLACEHOLDERS)
					.target(MigrationVersion.fromVersion("6")).load().migrate();
			JdbcTemplate jdbc = new JdbcTemplate(source);
			Long owner = jdbc.queryForObject("SELECT id FROM app_users WHERE oidc_subject = 'legacy-owner'", Long.class);
			jdbc.update("INSERT INTO projects (id, name, favorite, owner_id) VALUES (200, 'Starred', TRUE, ?), (201, 'Plain', FALSE, ?)", owner, owner);
			jdbc.update("INSERT INTO notes (id, project_id, title, content, owner_id) VALUES (200, 200, 'Filed', '', ?), (201, NULL, 'Inbox', '', ?)", owner, owner);
			jdbc.update("INSERT INTO todos (id, project_id, title, content, owner_id) VALUES (200, 200, 'Todo', '', ?)", owner);

			Flyway.configure().dataSource(source).locations("classpath:db/migration").placeholders(PLACEHOLDERS).load().migrate();

			assertThat(jdbc.queryForList("SELECT project_id FROM project_user_settings WHERE user_id = ? AND favorite = TRUE", Long.class, owner))
					.containsExactly(200L);
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_user_settings", Integer.class)).isEqualTo(1);
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'PROJECTS' AND column_name = 'FAVORITE'", Integer.class))
					.isZero();
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notes WHERE created_by <> owner_id", Integer.class)).isZero();
			assertThat(jdbc.queryForObject("SELECT created_by FROM todos WHERE id = 200", Long.class)).isEqualTo(owner);

			jdbc.update("INSERT INTO app_users (id, oidc_subject) VALUES (900, 'member')");
			jdbc.update("INSERT INTO project_members (project_id, user_id, role, added_by) VALUES (200, 900, 'EDITOR', ?)", owner);
			assertThatThrownBy(() -> jdbc.update("INSERT INTO project_members (project_id, user_id, role, added_by) VALUES (201, 900, 'OWNER', ?)", owner))
					.isInstanceOf(DataIntegrityViolationException.class);

			jdbc.update("DELETE FROM projects WHERE id = 200");
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_members", Integer.class)).isZero();
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM project_user_settings", Integer.class)).isZero();
		}
	}
}
