package com.devhub.backend.workspace;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.WebSocket;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.concurrent.CompletionStage;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.ConcurrentWebSocketSessionDecorator;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import tools.jackson.databind.ObjectMapper;

@Component
public class TerminalBridge extends TextWebSocketHandler {
    private record Renewal(String type, String ticket) {}
    private static class Connection {
        final WebSocketSession browser;
        final AtomicReference<TerminalTickets.Grant> grant;
        volatile WebSocket runner;
        final java.util.concurrent.CompletableFuture<WebSocket> ready = new java.util.concurrent.CompletableFuture<>();
        java.util.concurrent.CompletableFuture<WebSocket> outgoing = ready;
        int pendingBytes;
        Connection(WebSocketSession browser, TerminalTickets.Grant grant) {
            this.browser = new ConcurrentWebSocketSessionDecorator(browser, 5000, 512 * 1024);
            this.grant = new AtomicReference<>(grant);
        }
    }
    private final ConcurrentHashMap<String, Connection> connections = new ConcurrentHashMap<>();
    private final WorkspaceSettings settings;
    private final WorkspaceRunner runner;
    private final TerminalTickets tickets;
    private final ObjectMapper mapper;
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    public TerminalBridge(WorkspaceSettings settings, WorkspaceRunner runner, TerminalTickets tickets, ObjectMapper mapper) {
        this.settings = settings; this.runner = runner; this.tickets = tickets; this.mapper = mapper;
    }
    @Override public void afterConnectionEstablished(WebSocketSession browser) {
        browser.setTextMessageSizeLimit(32768);
        var grant = (TerminalTickets.Grant) browser.getAttributes().get("grant");
        var c = new Connection(browser, grant); connections.put(browser.getId(), c);
        client.newWebSocketBuilder().connectTimeout(Duration.ofSeconds(5)).header("X-Runner-Token", settings.runnerToken)
                .buildAsync(runner.terminalUri(grant.workspaceId(), grant.terminalId()), new WebSocket.Listener() {
                    @Override public void onOpen(WebSocket socket) {
                        c.runner = socket;
                        c.ready.complete(socket);
                        if (!c.browser.isOpen()) { socket.abort(); return; }
                        socket.request(1);
                    }
                    @Override public CompletionStage<?> onBinary(WebSocket socket, ByteBuffer data, boolean last) {
                        try { c.browser.sendMessage(new BinaryMessage(data)); socket.request(1); }
                        catch (IOException | RuntimeException e) { close(c, CloseStatus.SERVER_ERROR); }
                        return null;
                    }
                    @Override public CompletionStage<?> onText(WebSocket socket, CharSequence text, boolean last) {
                        try { c.browser.sendMessage(new TextMessage(text.toString())); socket.request(1); }
                        catch (IOException | RuntimeException e) { close(c, CloseStatus.SERVER_ERROR); }
                        return null;
                    }
                    @Override public CompletionStage<?> onClose(WebSocket socket, int code, String reason) { close(c, CloseStatus.NORMAL); return null; }
                    @Override public void onError(WebSocket socket, Throwable error) { close(c, CloseStatus.SERVER_ERROR); }
                }).exceptionally(e -> { c.ready.completeExceptionally(e); close(c, CloseStatus.SERVER_ERROR); return null; });
    }
    @Override protected void handleTextMessage(WebSocketSession browser, TextMessage message) {
        var c = connections.get(browser.getId()); if (c == null) return;
        try {
            // A fresh REST-issued ticket extends authorization; all other messages go to the PTY.
            if (message.getPayload().startsWith("{\"type\":\"reauthorize\",")) {
                var renewal = mapper.readValue(message.getPayload(), Renewal.class);
                var previous = c.grant.get();
                var next = tickets.consume(renewal.ticket(), previous.workspaceId(), previous.terminalId());
                if (next.ownerId() != previous.ownerId()) throw new IllegalArgumentException();
                c.grant.set(next); return;
            }
            tickets.check(c.grant.get());
            String payload = message.getPayload();
            int bytes = payload.length() * 2;
            synchronized (c) {
                c.pendingBytes += bytes;
                if (c.pendingBytes > 65536) throw new IllegalStateException("Terminal input buffer full");
                c.outgoing = c.outgoing.thenCompose(socket -> socket.sendText(payload, true)).whenComplete((socket, error) -> {
                    synchronized (c) { c.pendingBytes -= bytes; }
                    if (error != null) close(c, CloseStatus.SERVER_ERROR);
                });
            }
        } catch (Exception e) { close(c, CloseStatus.POLICY_VIOLATION); }
    }
    @Scheduled(fixedDelay = 1000)
    public void checkConnections() {
        connections.values().forEach(c -> {
            try { tickets.check(c.grant.get()); } catch (RuntimeException e) { close(c, CloseStatus.POLICY_VIOLATION); }
        });
    }
    @Override public void afterConnectionClosed(WebSocketSession browser, CloseStatus status) {
        var c = connections.remove(browser.getId()); if (c != null && c.runner != null) c.runner.abort();
    }
    @Override public void handleTransportError(WebSocketSession browser, Throwable exception) {
        var c = connections.get(browser.getId()); if (c != null) close(c, CloseStatus.SERVER_ERROR);
    }
    private void close(Connection c, CloseStatus status) {
        connections.remove(c.browser.getId());
        if (c.runner != null) c.runner.abort();
        try { c.browser.close(status); } catch (IOException ignored) {}
    }
}
