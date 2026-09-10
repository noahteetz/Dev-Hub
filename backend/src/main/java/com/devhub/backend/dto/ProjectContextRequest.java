package com.devhub.backend.dto;

public record ProjectContextRequest(
		String progressSummary,
		String nextStep,
		String blockers,
		String startCommand,
		String buildCommand,
		String technicalDecisions
) {
}