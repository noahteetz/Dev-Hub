package com.devhub.backend.model;

import java.util.List;

/** Who a token belongs to, read from the provider when the token is verified. */
public record RepositoryAccount(String login, List<String> scopes) {
}
