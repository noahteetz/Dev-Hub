package com.devhub.backend.model;

public enum EntityType {
	PROJECT,
	NOTE,
	SNIPPET,
	IDEA,
	TODO;

	public static EntityType of(ContentType type) {
		return switch (type) {
			case NOTE -> NOTE;
			case SNIPPET -> SNIPPET;
			case IDEA -> IDEA;
			case TODO -> TODO;
		};
	}

	public ContentType contentType() {
		return switch (this) {
			case NOTE -> ContentType.NOTE;
			case SNIPPET -> ContentType.SNIPPET;
			case IDEA -> ContentType.IDEA;
			case TODO -> ContentType.TODO;
			case PROJECT -> null;
		};
	}

	public String permalink(long id) {
		return switch (this) {
			case PROJECT -> "/projects/" + id;
			case NOTE -> "/notes/" + id;
			case SNIPPET -> "/snippets/" + id;
			case IDEA -> "/ideas/" + id;
			case TODO -> "/todos/" + id;
		};
	}
}
