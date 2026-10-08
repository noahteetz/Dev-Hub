package com.devhub.backend.workspace;

import static com.devhub.backend.workspace.WorkspaceModels.*;
import com.devhub.backend.workspace.WorkspaceModels.Runtime;
import java.net.URI;
import java.time.Duration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Component
public class HttpWorkspaceRunner implements WorkspaceRunner {
    private final WorkspaceSettings settings;
    public HttpWorkspaceRunner(WorkspaceSettings settings) { this.settings = settings; }
    private RestClient client() {
        var factory = new JdkClientHttpRequestFactory(java.net.http.HttpClient.newBuilder().version(java.net.http.HttpClient.Version.HTTP_1_1).connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(Duration.ofSeconds(120));
        return RestClient.builder().baseUrl(settings.runnerUrl).requestFactory(factory)
                .defaultHeader("X-Runner-Token", settings.runnerToken).build();
    }
    public Runtime start(Workspace w) {
        return client().post().uri("/workspaces/{id}/start", w.id())
                .body(new RunnerStart(w.id(), w.ownerId(), w.repositoryUrl(), w.branch(), w.newBranch(), w.commitName(), w.commitEmail(), w.generation()))
                .retrieve().body(Runtime.class);
    }
    public Runtime stop(Workspace w) {
        return client().post().uri("/workspaces/{id}/stop", w.id()).body(new RunnerAction(w.generation(), false, ""))
                .retrieve().body(Runtime.class);
    }
    public Runtime inspect(String id) { return client().get().uri("/workspaces/{id}", id).retrieve().body(Runtime.class); }
    public GitReport git(String id) { return client().post().uri("/workspaces/{id}/git", id).body(java.util.Map.of()).retrieve().body(GitReport.class); }
    public void delete(Workspace w, boolean discard, String confirmation) {
        client().post().uri("/workspaces/{id}/delete", w.id()).body(new RunnerAction(w.generation(), discard, confirmation)).retrieve().toBodilessEntity();
    }
    public void terminal(Workspace w, Terminal t) {
        try { client().post().uri("/workspaces/{id}/terminals", w.id())
                .body(new RunnerTerminal(t.id(), w.ownerId(), t.launchMode(), t.profileId(), t.providers()))
                .retrieve().onStatus(status -> status.isError(), (request, response) -> {
                    String body = new String(response.getBody().readNBytes(4096), java.nio.charset.StandardCharsets.UTF_8);
                    if (body.contains("WORKSPACE_UPGRADE_REQUIRED")) throw new com.devhub.backend.exception.ConflictException("Stop and resume this workspace to update its terminal launcher");
                    throw new com.devhub.backend.exception.UpstreamException("Terminal start failed. Retry or stop and resume the workspace; files are retained.");
                }).toBodilessEntity();
        } catch (RestClientException e) {
            throw new com.devhub.backend.exception.UpstreamException("Terminal start could not be confirmed. Retry or stop and resume the workspace; files are retained.");
        }
    }
    public void closeTerminal(String w, String t) { client().delete().uri("/workspaces/{id}/terminals/{terminal}", w, t).retrieve().toBodilessEntity(); }
    public void deleteProfile(long owner, String profile) {
        client().delete().uri("/profiles/{owner}/{id}", owner, profile).retrieve().toBodilessEntity();
    }
    public void checkProfile(long owner, String profile, java.util.List<String> providers) {
        try { client().post().uri("/profiles/{owner}/{id}/check", owner, profile).body(new ProfileCheck(providers)).retrieve()
                .onStatus(status -> status.isError(), (request, response) -> {
                    throw new com.devhub.backend.exception.ConflictException("The runner could not confirm this profile is unused. End its terminals or stop your workspaces before disabling the provider.");
                }).toBodilessEntity();
        } catch (RestClientException e) {
            throw new com.devhub.backend.exception.ConflictException("The runner is unavailable. Retry before disabling a provider; its saved login is retained.");
        }
    }
    public URI terminalUri(String w, String t) {
        return URI.create(settings.runnerUrl.replaceFirst("^http", "ws") + "/workspaces/" + w + "/terminals/" + t + "/connect");
    }
}
