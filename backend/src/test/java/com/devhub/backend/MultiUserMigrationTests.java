package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

class MultiUserMigrationTests {

	private static final String OWNER = "5092f4f6-0000-0000-0000-000000000000";

	@Test
	void handsEverythingThatExistedToTheConfiguredAccount() throws Exception {
		String url = "jdbc:h2:mem:migration-multi-user;MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
		try (java.sql.Connection connection = java.sql.DriverManager.getConnection(url, "sa", "")) {
			SingleConnectionDataSource source = new SingleConnectionDataSource(connection, true);
			Flyway.configure().dataSource(source).locations("classpath:db/migration")
					.target(MigrationVersion.fromVersion("5")).load().migrate();
			JdbcTemplate jdbc = new JdbcTemplate(source);
			jdbc.update("INSERT INTO projects (id, name) VALUES (100, 'Existing project')");
			jdbc.update("INSERT INTO notes (id, project_id, title, content) VALUES (100, 100, 'Filed note', ''), (101, NULL, 'Inbox note', '')");
			jdbc.update("INSERT INTO tags (id, name) VALUES (100, 'kept')");
			jdbc.update("INSERT INTO note_tags (note_id, tag_id) VALUES (101, 100)");
			jdbc.update("INSERT INTO entity_references (source_type, source_id, target_type, target_id) VALUES ('NOTE', 101, 'PROJECT', 100)");
			jdbc.update("INSERT INTO git_credentials (provider, token_encrypted, status) VALUES ('GITHUB', 'secret', 'VERIFIED')");

			Flyway.configure().dataSource(source).locations("classpath:db/migration")
					.placeholders(Map.of("legacyOwnerSubject", OWNER)).load().migrate();

			Long owner = jdbc.queryForObject("SELECT id FROM app_users WHERE oidc_subject = ?", Long.class, OWNER);
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM app_users", Integer.class)).isEqualTo(1);
			for (String table : new String[]{"projects", "notes", "tags", "entity_references", "git_credentials"}) {
				assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM " + table + " WHERE owner_id <> ?", Integer.class, owner))
						.as(table).isZero();
			}
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notes", Integer.class)).isEqualTo(2);
			assertThat(jdbc.queryForObject("SELECT name FROM tags WHERE id = 100", String.class)).isEqualTo("kept");
			assertThat(jdbc.queryForObject("SELECT token_encrypted FROM git_credentials WHERE provider = 'GITHUB'", String.class))
					.isEqualTo("secret");

			// Tag names are now unique per owner only.
			jdbc.update("INSERT INTO app_users (oidc_subject) VALUES ('someone-else')");
			jdbc.update("INSERT INTO tags (owner_id, name) SELECT id, 'kept' FROM app_users WHERE oidc_subject = 'someone-else'");

			jdbc.update("DELETE FROM projects WHERE id = 100");
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notes", Integer.class)).isEqualTo(1);
		}
	}
}
