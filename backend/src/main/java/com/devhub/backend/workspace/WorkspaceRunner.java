package com.devhub.backend.workspace;

import static com.devhub.backend.workspace.WorkspaceModels.*;
import com.devhub.backend.workspace.WorkspaceModels.Runtime;
import java.net.URI;

public interface WorkspaceRunner {
    Runtime start(Workspace workspace);
    Runtime stop(Workspace workspace);
    Runtime inspect(String id);
    GitReport git(String id);
    void delete(Workspace workspace, boolean discard, String confirmation);
    void terminal(Workspace workspace, Terminal terminal);
    void closeTerminal(String workspaceId, String terminalId);
    void deleteProfile(long ownerId, String profileId);
    void checkProfile(long ownerId, String profileId, java.util.List<String> providers);
    URI terminalUri(String workspaceId, String terminalId);
}
