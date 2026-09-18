package com.devhub.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Starts the scheduler that drives {@code RepositoryAutoSyncService}. Whether that job
 * actually calls a provider is decided by {@code devhub.repository.sync.enabled}, so the
 * test suite can keep the scheduler and still reach no network.
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
