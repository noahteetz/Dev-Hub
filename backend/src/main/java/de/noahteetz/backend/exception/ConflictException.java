package de.noahteetz.backend.exception;

public class ConflictException extends RuntimeException {
	public ConflictException(String message) {
		super(message);
	}
}
