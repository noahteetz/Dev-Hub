package db.migration;

import java.util.*;
import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;

/** Keep UUIDs and provider directories; disambiguate names before enforcing user-wide uniqueness. */
public class V11__unified_ai_profiles extends BaseJavaMigration {
    @Override public void migrate(Context context) throws Exception {
        var connection = context.getConnection();
        try (var sql = connection.createStatement()) {
            sql.execute("CREATE TABLE ai_profile_providers (profile_id VARCHAR(36) NOT NULL REFERENCES ai_profiles(id) ON DELETE CASCADE, provider VARCHAR(16) NOT NULL CHECK (provider IN ('CLAUDE', 'CODEX')), enabled BOOLEAN NOT NULL DEFAULT TRUE, PRIMARY KEY (profile_id, provider))");
            sql.execute("INSERT INTO ai_profile_providers (profile_id, provider) SELECT id, provider FROM ai_profiles");
            sql.execute("ALTER TABLE ai_profiles ADD COLUMN normalized_name VARCHAR(240)");
            sql.execute("ALTER TABLE workspace_terminals ADD COLUMN launch_mode VARCHAR(16) NOT NULL DEFAULT 'SHELL' CHECK (launch_mode IN ('SHELL', 'CLAUDE', 'CODEX'))");
            sql.execute("CREATE TABLE workspace_terminal_providers (terminal_id VARCHAR(36) NOT NULL REFERENCES workspace_terminals(id) ON DELETE CASCADE, provider VARCHAR(16) NOT NULL CHECK (provider IN ('CLAUDE', 'CODEX')), PRIMARY KEY (terminal_id, provider))");
            sql.execute("INSERT INTO workspace_terminal_providers (terminal_id, provider) SELECT id, provider FROM workspace_terminals WHERE profile_id IS NOT NULL AND provider <> 'SHELL'");
        }
        record Legacy(String id, long owner, String name, String provider) {}
        var profiles = new ArrayList<Legacy>();
        try (var sql = connection.createStatement(); var rows = sql.executeQuery("SELECT * FROM ai_profiles ORDER BY owner_id, created_at, id")) {
            while (rows.next()) profiles.add(new Legacy(rows.getString("id"), rows.getLong("owner_id"), rows.getString("name").trim(), rows.getString("provider")));
        }
        var counts = new HashMap<String, Integer>();
        for (var profile : profiles) counts.merge(profile.owner() + ":" + profile.name().toLowerCase(Locale.ROOT), 1, Integer::sum);
        var used = new HashMap<Long, Set<String>>();
        for (var profile : profiles) {
            if (counts.get(profile.owner() + ":" + profile.name().toLowerCase(Locale.ROOT)) == 1)
                used.computeIfAbsent(profile.owner(), key -> new HashSet<>()).add(profile.name().toLowerCase(Locale.ROOT));
        }
        try (var update = connection.prepareStatement("UPDATE ai_profiles SET name = ?, normalized_name = ? WHERE id = ?")) {
            for (var profile : profiles) {
                String name = profile.name();
                var names = used.computeIfAbsent(profile.owner(), key -> new HashSet<>());
                if (counts.get(profile.owner() + ":" + name.toLowerCase(Locale.ROOT)) > 1) {
                    String suffix = " (" + (profile.provider().equals("CLAUDE") ? "Claude" : "Codex") + ")";
                    name = profile.name().substring(0, Math.min(profile.name().length(), 120 - suffix.length())) + suffix;
                    int attempt = 0;
                    while (!names.add(name.toLowerCase(Locale.ROOT))) {
                        suffix = " (" + profile.id() + (attempt++ == 0 ? "" : "-" + attempt) + ")";
                        name = profile.name().substring(0, Math.min(profile.name().length(), 120 - suffix.length())) + suffix;
                    }
                }
                update.setString(1, name); update.setString(2, name.toLowerCase(Locale.ROOT)); update.setString(3, profile.id()); update.executeUpdate();
            }
        }
        var obsolete = new ArrayList<String>();
        try (var sql = connection.createStatement(); var rows = sql.executeQuery("SELECT DISTINCT constraint_name FROM information_schema.key_column_usage WHERE LOWER(table_name) = 'ai_profiles' AND LOWER(column_name) = 'provider'")) {
            while (rows.next()) obsolete.add(rows.getString(1));
        }
        try (var sql = connection.createStatement()) {
            for (String constraint : obsolete) sql.execute("ALTER TABLE ai_profiles DROP CONSTRAINT \"" + constraint.replace("\"", "\"\"") + "\"");
            sql.execute("ALTER TABLE ai_profiles DROP COLUMN provider");
            sql.execute("ALTER TABLE ai_profiles ALTER COLUMN normalized_name SET NOT NULL");
            sql.execute("ALTER TABLE ai_profiles ADD CONSTRAINT ai_profiles_owner_name UNIQUE (owner_id, normalized_name)");
        }
    }
}
