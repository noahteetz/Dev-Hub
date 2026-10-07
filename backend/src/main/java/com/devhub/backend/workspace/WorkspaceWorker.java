package com.devhub.backend.workspace;

import com.devhub.backend.model.Permission;
import com.devhub.backend.repository.ProjectMemberRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class WorkspaceWorker {
    private final WorkspaceSettings settings;
    private final WorkspaceRepository repository;
    private final ProjectMemberRepository members;
    private final WorkspaceRunner runner;
    public WorkspaceWorker(WorkspaceSettings settings, WorkspaceRepository repository, ProjectMemberRepository members, WorkspaceRunner runner) {
        this.settings = settings; this.repository = repository; this.members = members; this.runner = runner;
    }
    @Scheduled(fixedDelayString = "${devhub.workspace.poll-interval:5000}", initialDelay = 5000)
    public void reconcile() {
        if (!settings.enabled || !settings.workerEnabled) return;
        for (var w : repository.reconcileCandidates()) {
            try {
                boolean member = members.findAccess(w.projectId(), w.ownerId()).map(a -> a.role().allows(Permission.RUN_WORKSPACE)).orElse(false);
                if (!member && !w.desired().equals("STOPPED") && !w.desired().equals("DELETED")) {
                    repository.desired(w.id(), "STOPPED"); continue;
                }
                if (w.status().equals("ERROR")) continue; // explicit retry, never repeated destructive operations
                if (w.status().equals(w.desired())) {
                    if (w.status().equals("RUNNING")) {
                        var actual = runner.inspect(w.id());
                        if (actual.status().equals("STOPPED") || actual.status().equals("MISSING")) {
                            repository.desired(w.id(), "STOPPED");
                        }
                    }
                    continue;
                }
                if (!repository.claim(w)) continue;
                switch (w.desired()) {
                    case "RUNNING" -> { runner.start(w); repository.complete(w, "RUNNING", ""); }
                    case "STOPPED" -> { var runtime = runner.stop(w); repository.clearTerminals(w.id()); repository.complete(w, "STOPPED", notice(runtime)); }
                    case "DELETED" -> {
                        runner.delete(w, repository.discard(w.id()), w.id());
                        repository.clearTerminals(w.id()); repository.complete(w, "DELETED", "");
                    }
                    default -> throw new IllegalStateException("Unknown desired state");
                }
            } catch (Exception e) {
                // Do not expose provider responses, container output or credentials.
                repository.complete(w, "ERROR", "Runner operation failed. Files are retained. Check runner health and retry the operation.");
            }
        }
    }
    /** The runner keeps the reason of a stop it made on its own (idle, limits, crashed container); otherwise it is empty. */
    static String notice(WorkspaceModels.Runtime runtime) {
        String reason = runtime == null || runtime.reason() == null ? "" : runtime.reason().strip();
        if (reason.isEmpty()) return "";
        String text = "Stopped automatically: " + reason;
        return text.length() > 500 ? text.substring(0, 500) : text;
    }
}
