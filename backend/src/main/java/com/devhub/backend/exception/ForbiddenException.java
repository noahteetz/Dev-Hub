package com.devhub.backend.exception;

/** The caller can see the project but their role does not allow the action. */
public class ForbiddenException extends RuntimeException {

	public ForbiddenException(String message) {
		super(message);
	}
}
