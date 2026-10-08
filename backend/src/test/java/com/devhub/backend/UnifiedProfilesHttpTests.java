package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import com.devhub.backend.exception.UpstreamException;
import com.devhub.backend.workspace.*;
import com.devhub.backend.workspace.WorkspaceModels.*;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "devhub.workspace.enabled=true", "devhub.workspace.worker-enabled=false",
        "devhub.workspace.runner-token=test-runner-token-with-at-least-32-characters"})
@ActiveProfiles("test")
class UnifiedProfilesHttpTests {
    @LocalServerPort int port;
    @Autowired WorkspaceRepository repository;
    @MockitoBean WorkspaceRunner runner;
    final HttpClient client = HttpClient.newHttpClient();
    final JsonMapper json = JsonMapper.builder().build();

    @Test void exposesDualProfilesLaunchModesAndPatchAndCleansUpRolledBackRunnerStarts() throws Exception {
        String name = "HTTP Work " + UUID.randomUUID();
        var profile = send("POST", "/api/ai-profiles", Map.of("name", name, "providers", List.of("CLAUDE", "CODEX")));
        assertThat(profile.statusCode()).isEqualTo(200);
        var data = json.readTree(profile.body());
        String profileId = data.get("id").asText();
        assertThat(data.get("providers").size()).isEqualTo(2);
        assertThat(data.has("provider")).isFalse();
        var project = send("POST", "/api/projects", Map.of("name", name, "repositoryUrl", "https://github.com/example/repo"));
        long projectId = json.readTree(project.body()).get("id").asLong();
        var workspace = send("POST", "/api/projects/" + projectId + "/workspaces", Map.of("branch", "main", "newBranch", false,
                "commitName", "HTTP", "commitEmail", "http@example.com"));
        assertThat(workspace.statusCode()).isEqualTo(200);
        String workspaceId = json.readTree(workspace.body()).get("id").asText();
        repository.complete(repository.find(workspaceId).orElseThrow(), "RUNNING", "");
        try {
            var opened = send("POST", "/api/workspaces/" + workspaceId + "/terminals", Map.of("launchMode", "CLAUDE", "profileId", profileId));
            assertThat(opened.statusCode()).isEqualTo(200);
            var terminal = json.readTree(opened.body());
            assertThat(terminal.get("launchMode").asText()).isEqualTo("CLAUDE");
            assertThat(terminal.get("provider").asText()).isEqualTo("CLAUDE");
            assertThat(terminal.get("providers").size()).isEqualTo(2);
            verify(runner).terminal(any(), argThat(t -> t.launchMode().equals("CLAUDE") && t.providers().equals(List.of("CLAUDE", "CODEX"))));
            assertThat(send("PATCH", "/api/ai-profiles/" + profileId, Map.of("providers", List.of("CLAUDE"))).statusCode()).isEqualTo(409);
            assertThat(send("PATCH", "/api/ai-profiles/" + profileId, Map.of("name", name + " renamed")).statusCode()).isEqualTo(200);
            send("DELETE", "/api/workspaces/" + workspaceId + "/terminals/" + terminal.get("id").asText(), null);
            doThrow(new UpstreamException("Simulated runner failure")).when(runner).terminal(any(), any());
            assertThat(send("POST", "/api/workspaces/" + workspaceId + "/terminals", Map.of("launchMode", "CODEX", "profileId", profileId)).statusCode()).isEqualTo(502);
            assertThat(repository.terminals(workspaceId)).isEmpty();
            verify(runner, times(2)).closeTerminal(eq(workspaceId), anyString());
        } finally {
            send("POST", "/api/workspaces/" + workspaceId + "/stop", null);
            repository.complete(repository.find(workspaceId).orElseThrow(), "STOPPED", "");
            send("DELETE", "/api/ai-profiles/" + profileId, null);
            when(runner.git(workspaceId)).thenReturn(new GitReport(true, true, "main", List.of(), List.of(), List.of()));
            send("DELETE", "/api/workspaces/" + workspaceId, null);
            repository.complete(repository.find(workspaceId).orElseThrow(), "DELETED", "");
            send("DELETE", "/api/projects/" + projectId, null);
        }
    }
    private HttpResponse<String> send(String method, String path, Object body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        if (body != null) request.header("Content-Type", "application/json");
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
