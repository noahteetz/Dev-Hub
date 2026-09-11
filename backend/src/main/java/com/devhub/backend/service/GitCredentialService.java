package com.devhub.backend.service;

import com.devhub.backend.dto.GitCredentialRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.exception.UpstreamException;
import com.devhub.backend.model.GitCredential;
import com.devhub.backend.model.GitCredentialStatus;
import com.devhub.backend.model.GitCredentialView;
import com.devhub.backend.model.RepositoryAccount;
import com.devhub.backend.model.RepositoryCredential;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.repository.GitCredentialRepository;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Stores one provider token per provider and hands the decrypted value to the provider
 * clients. Nothing here ever returns the plain token to a caller outside this package.
 */
@Service
public class GitCredentialService {

	private static final Logger log = LoggerFactory.getLogger(GitCredentialService.class);
	private static final int HINT_LENGTH = 4;

	private final GitCredentialRepository credentialRepository;
	private final TokenCipher tokenCipher;
	private final List<RepositoryMetadataProvider> providers;
	private final List<Consumer<RepositoryProvider>> changeListeners = new CopyOnWriteArrayList<>();

	public GitCredentialService(
			GitCredentialRepository credentialRepository,
			TokenCipher tokenCipher,
			List<RepositoryMetadataProvider> providers
	) {
		this.credentialRepository = credentialRepository;
		this.tokenCipher = tokenCipher;
		this.providers = providers;
	}

	/** Lets the discovery cache drop its entries as soon as a token changes or is removed. */
	public void onCredentialChanged(Consumer<RepositoryProvider> listener) {
		changeListeners.add(listener);
	}

	public boolean encryptionConfigured() {
		return tokenCipher.isConfigured();
	}

	public List<GitCredentialView> findAll() {
		return credentialRepository.findAll().stream().map(GitCredential::toView).toList();
	}

	public GitCredentialView findByProvider(RepositoryProvider provider) {
		return existing(provider).toView();
	}

	public GitCredentialView save(RepositoryProvider provider, GitCredentialRequest request) {
		RepositoryMetadataProvider client = clientFor(provider);
		if (!tokenCipher.isConfigured()) {
			throw new InvalidRequestException(
					"Set DEVHUB_ENCRYPTION_KEY before storing a token. Generate one with: openssl rand -base64 32"
			);
		}
		GitCredentialRequest body = request == null ? new GitCredentialRequest("", "") : request;
		String token = body.token() == null ? "" : body.token().trim();
		if (token.isBlank()) {
			throw new InvalidRequestException("Token is required");
		}

		RepositoryAccount account = verifyToken(client, new RepositoryCredential(provider, token));
		String label = body.label() == null || body.label().isBlank()
				? account.login()
				: body.label().trim();
		credentialRepository.save(
				provider,
				label,
				client.host(),
				tokenCipher.encrypt(token),
				hint(token),
				account.login(),
				account.scopes(),
				GitCredentialStatus.VERIFIED
		);
		notifyChanged(provider);
		return existing(provider).toView();
	}

	public GitCredentialView verify(RepositoryProvider provider) {
		GitCredential credential = existing(provider);
		RepositoryMetadataProvider client = clientFor(provider);
		String token;
		try {
			token = tokenCipher.decrypt(credential.tokenEncrypted());
		} catch (TokenCipher.TokenUnreadableException exception) {
			credentialRepository.updateVerification(
					provider,
					credential.accountLogin(),
					credential.scopes(),
					GitCredentialStatus.UNREADABLE,
					"The stored token could not be read. Enter it again."
			);
			notifyChanged(provider);
			return existing(provider).toView();
		}

		try {
			RepositoryAccount account = client.verify(new RepositoryCredential(provider, token));
			credentialRepository.updateVerification(
					provider,
					account.login(),
					account.scopes(),
					GitCredentialStatus.VERIFIED,
					""
			);
		} catch (RestClientResponseException exception) {
			credentialRepository.updateVerification(
					provider,
					credential.accountLogin(),
					credential.scopes(),
					statusFor(exception.getStatusCode().value()),
					rejectionMessage(exception.getStatusCode().value())
			);
		} catch (ResourceAccessException exception) {
			credentialRepository.updateVerification(
					provider,
					credential.accountLogin(),
					credential.scopes(),
					credential.status(),
					"The provider could not be reached."
			);
		}
		notifyChanged(provider);
		return existing(provider).toView();
	}

	public void delete(RepositoryProvider provider) {
		if (credentialRepository.deleteByProvider(requireSupported(provider)) == 0) {
			throw new ResourceNotFoundException("No token is stored for " + provider);
		}
		notifyChanged(provider);
	}

	/**
	 * The decrypted token for internal use. Empty when nothing is stored or when the stored
	 * value cannot be read back, so callers simply fall back to anonymous access.
	 */
	public Optional<RepositoryCredential> credentialFor(RepositoryProvider provider) {
		if (provider == null || provider == RepositoryProvider.GENERIC) {
			return Optional.empty();
		}
		return credentialRepository.findByProvider(provider).flatMap(credential -> {
			try {
				return Optional.of(new RepositoryCredential(provider, tokenCipher.decrypt(credential.tokenEncrypted())));
			} catch (TokenCipher.TokenUnreadableException exception) {
				log.warn("Stored {} token could not be decrypted: {}", provider, exception.getMessage());
				return Optional.empty();
			}
		});
	}

	/** True when a token exists, whether or not it can currently be read. */
	public boolean hasCredential(RepositoryProvider provider) {
		return provider != null
				&& provider != RepositoryProvider.GENERIC
				&& credentialRepository.findByProvider(provider).isPresent();
	}

	RepositoryMetadataProvider clientFor(RepositoryProvider provider) {
		RepositoryProvider supported = requireSupported(provider);
		return providers.stream()
				.filter(candidate -> candidate.provider() == supported)
				.findFirst()
				.orElseThrow(() -> new IllegalStateException("No provider registered for " + supported));
	}

	private RepositoryAccount verifyToken(RepositoryMetadataProvider client, RepositoryCredential credential) {
		try {
			return client.verify(credential);
		} catch (RestClientResponseException exception) {
			throw new InvalidRequestException(rejectionMessage(exception.getStatusCode().value()));
		} catch (ResourceAccessException exception) {
			throw new UpstreamException("The provider could not be reached. The token was not stored.");
		}
	}

	private GitCredential existing(RepositoryProvider provider) {
		return credentialRepository.findByProvider(requireSupported(provider))
				.orElseThrow(() -> new ResourceNotFoundException("No token is stored for " + provider));
	}

	private static RepositoryProvider requireSupported(RepositoryProvider provider) {
		if (provider == null || provider == RepositoryProvider.GENERIC) {
			throw new InvalidRequestException("Tokens are supported for GitHub and GitLab only");
		}
		return provider;
	}

	private void notifyChanged(RepositoryProvider provider) {
		changeListeners.forEach(listener -> listener.accept(provider));
	}

	private static GitCredentialStatus statusFor(int statusCode) {
		return statusCode == 401 || statusCode == 403 ? GitCredentialStatus.INVALID : GitCredentialStatus.UNVERIFIED;
	}

	private static String rejectionMessage(int statusCode) {
		return switch (statusCode) {
			case 401 -> "The provider rejected the token. Check that it was copied completely and has not expired.";
			case 403 -> "The token is missing a required scope, or it has not been authorized for the organization.";
			case 404 -> "The provider endpoint was not found. Check the configured base URL.";
			case 429 -> "The provider rate limit was reached. Try again later.";
			default -> "The provider answered with HTTP " + statusCode + ".";
		};
	}

	private static String hint(String token) {
		// A token short enough to be shown whole gets no hint at all.
		return token.length() <= HINT_LENGTH ? "" : token.substring(token.length() - HINT_LENGTH);
	}
}
