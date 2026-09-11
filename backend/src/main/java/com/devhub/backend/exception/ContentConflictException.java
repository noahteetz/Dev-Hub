package com.devhub.backend.exception;

import com.devhub.backend.model.ContentEntry;

/** Signals that an entry changed on the server since the client last loaded it. */
public class ContentConflictException extends RuntimeException {

	private final transient ContentEntry current;

	public ContentConflictException(String message, ContentEntry current) {
		super(message);
		this.current = current;
	}

	public ContentEntry current() {
		return current;
	}
}
