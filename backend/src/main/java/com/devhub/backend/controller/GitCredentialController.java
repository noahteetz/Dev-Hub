package com.devhub.backend.controller;

import com.devhub.backend.dto.GitCredentialRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.GitCredentialView;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.service.GitCredentialService;
import java.util.List;
import java.util.Locale;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Provider tokens. Every answer is a {@link GitCredentialView}, which carries no token
 * value, so a token can be written but never read back.
 */
@RestController
@RequestMapping("/api/git-credentials")
public class GitCredentialController {

	private final GitCredentialService credentialService;

	public GitCredentialController(GitCredentialService credentialService) {
		this.credentialService = credentialService;
	}

	@GetMapping
	public CredentialOverview findAll() {
		return new CredentialOverview(credentialService.encryptionConfigured(), credentialService.findAll());
	}

	@PutMapping("/{provider}")
	public GitCredentialView save(
			@PathVariable("provider") String provider,
			@RequestBody(required = false) GitCredentialRequest request
	) {
		return credentialService.save(parse(provider), request);
	}

	@PostMapping("/{provider}/verify")
	public GitCredentialView verify(@PathVariable("provider") String provider) {
		return credentialService.verify(parse(provider));
	}

	@DeleteMapping("/{provider}")
	public ResponseEntity<Void> delete(@PathVariable("provider") String provider) {
		credentialService.delete(parse(provider));
		return ResponseEntity.noContent().build();
	}

	private static RepositoryProvider parse(String provider) {
		try {
			return RepositoryProvider.valueOf(provider.toUpperCase(Locale.ROOT));
		} catch (IllegalArgumentException exception) {
			throw new InvalidRequestException("Unknown provider: " + provider);
		}
	}

	/**
	 * @param encryptionConfigured false when no encryption key is set, in which case the
	 *                             settings page explains that before offering a token field
	 */
	public record CredentialOverview(boolean encryptionConfigured, List<GitCredentialView> credentials) {
	}
}
