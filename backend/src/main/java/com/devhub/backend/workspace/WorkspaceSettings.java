package com.devhub.backend.workspace;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class WorkspaceSettings {
    @Value("${devhub.workspace.enabled:false}") public boolean enabled;
    @Value("${devhub.workspace.runner-url:http://runner:8090}") public String runnerUrl;
    @Value("${devhub.workspace.runner-token:}") public String runnerToken;
    @Value("${devhub.workspace.allowed-origins:http://localhost:5173}") public String allowedOrigins;
    @Value("${devhub.workspace.worker-enabled:true}") public boolean workerEnabled;
    @jakarta.annotation.PostConstruct public void validate() {
        if (enabled && runnerToken.length() < 32) throw new IllegalStateException("Configure DEVHUB_RUNNER_TOKEN with at least 32 characters before enabling workspaces");
    }
}
