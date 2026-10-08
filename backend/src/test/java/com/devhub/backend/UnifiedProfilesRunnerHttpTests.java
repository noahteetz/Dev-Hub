package com.devhub.backend;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.devhub.backend.exception.ConflictException;
import com.devhub.backend.exception.UpstreamException;
import com.devhub.backend.workspace.*;
import com.devhub.backend.workspace.WorkspaceModels.*;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class UnifiedProfilesRunnerHttpTests {
    @Test void sendsBothProviderBindingsAndMapsOldImagesToAnActionableSafeError() throws Exception {
        var payload = new AtomicReference<String>();
        var response = new AtomicReference<>("{\"code\":\"WORKSPACE_UPGRADE_REQUIRED\"}");
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/workspaces/workspace/terminals", exchange -> {
            payload.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] body = response.get().getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(409, body.length);
            try (var output = exchange.getResponseBody()) { output.write(body); }
        });
        server.start();
        try {
            var settings = new WorkspaceSettings();
            settings.runnerUrl = "http://127.0.0.1:" + server.getAddress().getPort();
            settings.runnerToken = "test-runner-token-with-at-least-32-characters";
            var runner = new HttpWorkspaceRunner(settings);
            var workspace = mock(Workspace.class);
            when(workspace.id()).thenReturn("workspace"); when(workspace.ownerId()).thenReturn(1L);
            var terminal = new Terminal("terminal", "workspace", "CLAUDE", "profile", List.of("CLAUDE", "CODEX"));
            assertThatThrownBy(() -> runner.terminal(workspace, terminal)).isInstanceOf(ConflictException.class)
                    .hasMessageContaining("Stop and resume");
            var request = JsonMapper.builder().build().readTree(payload.get());
            assertThat(request.get("launchMode").asText()).isEqualTo("CLAUDE");
            assertThat(request.get("profileId").asText()).isEqualTo("profile");
            assertThat(request.get("providers").size()).isEqualTo(2);
            response.set("Sensitive provider output must not reach the browser");
            assertThatThrownBy(() -> runner.terminal(workspace, terminal)).isInstanceOf(UpstreamException.class)
                    .hasMessageNotContaining("Sensitive");
            server.stop(0);
            assertThatThrownBy(() -> runner.terminal(workspace, terminal)).isInstanceOf(UpstreamException.class)
                    .hasMessageContaining("could not be confirmed");
            assertThatThrownBy(() -> runner.checkProfile(1L, "profile", List.of("CODEX"))).isInstanceOf(ConflictException.class)
                    .hasMessageContaining("unavailable");
        } finally { server.stop(0); }
    }
}
