package com.devhub.backend.service;

import com.devhub.backend.model.RemoteRepository;
import com.devhub.backend.model.RepositoryAccount;
import com.devhub.backend.model.RepositoryCredential;
import com.devhub.backend.model.RepositoryFetch;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositoryReference;
import java.util.List;

public interface RepositoryMetadataProvider {

	RepositoryProvider provider();

	/** The host a token for this provider belongs to, shown next to the stored credential. */
	String host();

	/**
	 * @param credential may be null, in which case only public repositories are readable
	 * @param etag the value stored from the previous read, or null for an unconditional read
	 */
	RepositoryFetch fetch(RepositoryReference reference, RepositoryCredential credential, String etag);

	/** Confirms a token and reports who it belongs to. */
	RepositoryAccount verify(RepositoryCredential credential);

	/** Every repository the token can reach, private and organization ones included. */
	List<RemoteRepository> listRepositories(RepositoryCredential credential);
}
