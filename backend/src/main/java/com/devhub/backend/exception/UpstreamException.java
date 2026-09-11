package com.devhub.backend.exception;

/** The Git provider could not be reached or answered in a way we cannot act on. */
public class UpstreamException extends RuntimeException {

	public UpstreamException(String message) {
		super(message);
	}
}
