package com.devhub.backend.service;

import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.model.RepositoryProvider;
import com.devhub.backend.model.RepositorySyncCandidate;
import com.devhub.backend.model.RepositorySyncStatus;
import com.devhub.backend.repository.RepositoryMetadataRepository;
import com.devhub.backend.security.CurrentUser;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Keeps the repository snapshots current on its own, so a project's last commit - and
 * with it the activity order on the dashboard - does not wait for someone to press
 * "Sync now".
 *
 * <p>A run is cheap: both providers answer a conditional request with 304 when nothing
 * changed, which costs one request and, on GitHub, none of the hourly quota. Only a
 * repository that actually moved is read in full.
 */
@Service
public class RepositoryAutoSyncService {

	private static final Logger log = LoggerFactory.getLogger(RepositoryAutoSyncService.class);

	private final RepositoryMetadataRepository metadataRepository;
	private final RepositoryMetadataService metadataService;
	private final RepositoryUrlParser urlParser;
	private final CurrentUser currentUser;
	private final boolean enabled;
	private final Duration interval;
	private final Duration requestSpacing;

	public RepositoryAutoSyncService(
			RepositoryMetadataRepository metadataRepository,
			RepositoryMetadataService metadataService,
			RepositoryUrlParser urlParser,
			CurrentUser currentUser,
			@Value("${devhub.repository.sync.enabled:true}") boolean enabled,
			@Value("${devhub.repository.sync.interval:1h}") Duration interval,
			@Value("${devhub.repository.sync.request-spacing:1s}") Duration requestSpacing
	) {
		this.metadataRepository = metadataRepository;
		this.metadataService = metadataService;
		this.urlParser = urlParser;
		this.currentUser = currentUser;
		this.enabled = enabled;
		this.interval = interval == null || interval.isNegative() || interval.isZero()
				? Duration.ofHours(1)
				: interval;
		this.requestSpacing = requestSpacing == null || requestSpacing.isNegative()
				? Duration.ZERO
				: requestSpacing;
	}

	@Scheduled(
			fixedDelayString = "${devhub.repository.sync.interval:1h}",
			initialDelayString = "${devhub.repository.sync.initial-delay:2m}"
	)
	void runScheduledSync() {
		if (!enabled) {
			return;
		}
		syncDue();
	}

	/**
	 * Syncs every project whose repository has not been attempted for a while. Never
	 * throws: one unreachable or misconfigured repository must not stop the rest.
	 */
	public Run syncDue() {
		List<RepositorySyncCandidate> candidates = metadataRepository.findDueForSync(Instant.now().minus(dueAge()));
		int synced = 0;
		int skipped = 0;
		int failed = 0;
		for (int index = 0; index < candidates.size(); index++) {
			RepositorySyncCandidate candidate = candidates.get(index);
			if (!worthCalling(candidate)) {
				skipped++;
				continue;
			}
			try {
				// The owner's own token is used; another user's token never reads this repository.
				currentUser.runAs(candidate.ownerId(), () -> metadataService.refresh(candidate.projectId()));
				synced++;
			} catch (RuntimeException exception) {
				failed++;
				log.warn(
						"Automatic repository sync failed for project {}: {}",
						candidate.projectId(),
						exception.getMessage()
				);
			}
			if (index < candidates.size() - 1 && !pause()) {
				break;
			}
		}

		Run run = new Run(candidates.size(), synced, skipped, failed);
		if (run.considered() > 0) {
			log.info(
					"Automatic repository sync: {} due, {} synced, {} skipped, {} failed",
					run.considered(),
					run.synced(),
					run.skipped(),
					run.failed()
			);
		}
		return run;
	}

	/**
	 * Skips the calls that are known to be pointless: a provider Dev Hub cannot read, a
	 * URL that no longer parses, and a quota that has not reset yet.
	 */
	private boolean worthCalling(RepositorySyncCandidate candidate) {
		if (candidate.syncStatus() == RepositorySyncStatus.RATE_LIMITED
				&& candidate.rateLimitResetAt() != null
				&& candidate.rateLimitResetAt().isAfter(Instant.now())) {
			return false;
		}
		try {
			return urlParser.parse(candidate.repositoryUrl()).provider() != RepositoryProvider.GENERIC;
		} catch (InvalidRequestException exception) {
			return false;
		}
	}

	/**
	 * A project is due once its last attempt is older than the sync interval. The run
	 * starts marginally later than the interval, so without a little slack a project
	 * synced late in the previous run would miss the threshold by seconds and then wait
	 * a whole extra interval.
	 */
	private Duration dueAge() {
		return interval.minus(interval.dividedBy(10));
	}

	/** Spaces the provider calls out. Returns false when the run should stop. */
	private boolean pause() {
		if (requestSpacing.isZero()) {
			return true;
		}
		try {
			Thread.sleep(requestSpacing.toMillis());
			return true;
		} catch (InterruptedException exception) {
			Thread.currentThread().interrupt();
			return false;
		}
	}

	/** What one run did, for the log line and for the tests. */
	public record Run(int considered, int synced, int skipped, int failed) {
	}
}
