package com.devhub.backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(ResourceNotFoundException.class)
	public ResponseEntity<ApiError> handleNotFound(ResourceNotFoundException exception) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ApiError(exception.getMessage()));
	}

	@ExceptionHandler(InvalidRequestException.class)
	public ResponseEntity<ApiError> handleInvalidRequest(InvalidRequestException exception) {
		return ResponseEntity.badRequest().body(new ApiError(exception.getMessage()));
	}

	@ExceptionHandler(UpstreamException.class)
	public ResponseEntity<ApiError> handleUpstream(UpstreamException exception) {
		return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(new ApiError(exception.getMessage()));
	}

	@ExceptionHandler(ConflictException.class)
	public ResponseEntity<ApiError> handleConflict(ConflictException exception) {
		return ResponseEntity.status(HttpStatus.CONFLICT).body(new ApiError(exception.getMessage()));
	}

	@ExceptionHandler(ContentConflictException.class)
	public ResponseEntity<ContentConflict> handleContentConflict(ContentConflictException exception) {
		return ResponseEntity.status(HttpStatus.CONFLICT)
				.body(new ContentConflict(exception.getMessage(), exception.current()));
	}

	public record ApiError(String message) {
	}

	/** A conflict answer carries the server state so the client can compare instead of losing text. */
	public record ContentConflict(String message, com.devhub.backend.model.ContentEntry current) {
	}
}
