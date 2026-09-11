package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

class GlobalInboxMigrationTests {
	@Test void movesOnlySystemContentIntoTheInbox() throws Exception {
		String url = "jdbc:h2:mem:migration-filled;MODE=PostgreSQL;DB_CLOSE_DELAY=-1";
		try (java.sql.Connection connection = java.sql.DriverManager.getConnection(url, "sa", "")) {
			SingleConnectionDataSource source = new SingleConnectionDataSource(connection, true);
			Flyway.configure().dataSource(source).locations("classpath:db/migration").target(MigrationVersion.fromVersion("1")).load().migrate();
			JdbcTemplate jdbc = new JdbcTemplate(source);
			jdbc.update("INSERT INTO projects (id, name, is_system, status) VALUES (100, 'General notes', TRUE, 'PLANNED'), (101, 'Real project', FALSE, 'PLANNED')");
			jdbc.update("INSERT INTO notes (id, project_id, title, content) VALUES (100, 100, 'Inbox note', 'unchanged'), (101, 101, 'Project note', 'also unchanged')");
			jdbc.update("INSERT INTO code_snippets (id, project_id, title, source_code) VALUES (100, 100, 'Inbox snippet', 'code')");
			jdbc.update("INSERT INTO ideas (id, project_id, title) VALUES (100, 100, 'Inbox idea')");
			jdbc.update("INSERT INTO todos (id, project_id, title) VALUES (100, 100, 'Inbox todo')");
			Flyway.configure().dataSource(source).locations("classpath:db/migration").load().migrate();
			assertThat(jdbc.queryForObject("SELECT project_id FROM notes WHERE id = 100", Long.class)).isNull();
			assertThat(jdbc.queryForObject("SELECT project_id FROM notes WHERE id = 101", Long.class)).isEqualTo(101L);
			assertThat(jdbc.queryForObject("SELECT content FROM notes WHERE id = 100", String.class)).isEqualTo("unchanged");
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM projects WHERE id = 100", Integer.class)).isZero();
			assertThat(jdbc.queryForObject("SELECT project_id FROM code_snippets WHERE id = 100", Long.class)).isNull();
			assertThat(jdbc.queryForObject("SELECT project_id FROM ideas WHERE id = 100", Long.class)).isNull();
			assertThat(jdbc.queryForObject("SELECT project_id FROM todos WHERE id = 100", Long.class)).isNull();
			jdbc.update("DELETE FROM projects WHERE id = 101");
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notes WHERE id = 101", Integer.class)).isZero();
			assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM notes WHERE id = 100", Integer.class)).isEqualTo(1);
		}
	}
}
