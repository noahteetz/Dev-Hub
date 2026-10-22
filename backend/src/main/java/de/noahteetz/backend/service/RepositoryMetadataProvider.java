package de.noahteetz.backend.service;

import de.noahteetz.backend.model.RemoteRepository;
import de.noahteetz.backend.model.RepositoryAccount;
import de.noahteetz.backend.model.RepositoryCredential;
import de.noahteetz.backend.model.RepositoryFetch;
import de.noahteetz.backend.model.RepositoryProvider;
import de.noahteetz.backend.model.RepositoryReference;
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
