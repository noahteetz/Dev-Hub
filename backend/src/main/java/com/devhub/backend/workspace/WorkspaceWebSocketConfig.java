package com.devhub.backend.workspace;

import java.util.Arrays;
import java.util.Map;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.HandshakeInterceptor;

@Configuration
@EnableWebSocket
public class WorkspaceWebSocketConfig implements WebSocketConfigurer {
    private final TerminalBridge bridge;
    private final TerminalTickets tickets;
    private final WorkspaceSettings settings;
    public WorkspaceWebSocketConfig(TerminalBridge bridge, TerminalTickets tickets, WorkspaceSettings settings) {
        this.bridge = bridge; this.tickets = tickets; this.settings = settings;
    }
    @Override public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        String[] origins = Arrays.stream(settings.allowedOrigins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toArray(String[]::new);
        registry.addHandler(bridge, "/api/workspaces/*/terminals/*/connect").setAllowedOrigins(origins).addInterceptors(new HandshakeInterceptor() {
            @Override public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler handler, Map<String, Object> attrs) {
                try {
                    if (!settings.enabled || Arrays.stream(origins).noneMatch(o -> o.equals(request.getHeaders().getOrigin()))) throw new IllegalArgumentException();
                    String[] path = request.getURI().getPath().split("/");
                    if (path.length != 7 || !path[6].equals("connect")) throw new IllegalArgumentException();
                    String ticket = request.getHeaders().getOrEmpty("Sec-WebSocket-Protocol").stream()
                            .flatMap(h -> Arrays.stream(h.split(","))).map(String::trim)
                            .filter(p -> p.startsWith("ticket.")).map(p -> p.substring(7)).findFirst().orElse(null);
                    var grant = tickets.consume(ticket, path[3], path[5]);
                    attrs.put("grant", grant); return true;
                } catch (RuntimeException e) { response.setStatusCode(HttpStatus.FORBIDDEN); return false; }
            }
            @Override public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response, WebSocketHandler handler, Exception error) {}
        });
    }
}
