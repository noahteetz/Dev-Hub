package com.devhub.backend.service;

import com.devhub.backend.dto.ContentArchiveRequest;
import com.devhub.backend.dto.ContentAssignmentRequest;
import com.devhub.backend.dto.InboxCaptureRequest;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ConflictException;
import com.devhub.backend.exception.ContentConflictException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.ContentEntry;
import com.devhub.backend.model.ContentType;
import com.devhub.backend.model.EntityType;
import com.devhub.backend.model.Permission;
import com.devhub.backend.model.Project;
import com.devhub.backend.model.ProjectAccess;
import com.devhub.backend.model.Tag;
import com.devhub.backend.repository.EntityReferenceRepository;
import com.devhub.backend.repository.GlobalContentRepository;
import com.devhub.backend.repository.GlobalContentRepository.Placement;
import com.devhub.backend.repository.ProjectRepository;
import com.devhub.backend.security.CurrentUser;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GlobalContentService {
	private final GlobalContentRepository content; private final ProjectRepository projects; private final TagService tags;
	private final ProjectAccessService access; private final CurrentUser currentUser; private final EntityReferenceRepository references;
	public GlobalContentService(GlobalContentRepository content, ProjectRepository projects, TagService tags, ProjectAccessService access, CurrentUser currentUser, EntityReferenceRepository references) {
		this.content = content; this.projects = projects; this.tags = tags; this.access = access; this.currentUser = currentUser; this.references = references;
	}
	public List<ContentEntry> findAll(ContentType type, String scope, Long projectId, Boolean archived, Boolean completed) {
		return findAll(type, scope, projectId, archived, completed, null, null, "created", 100, 0);
	}
	public List<ContentEntry> findAll(ContentType type, String scope, Long projectId, Boolean archived, Boolean completed, List<String> tagNames, Boolean converted, String sort, int limit, int offset) {
		String actualScope = scope == null ? "all" : scope;
		if (!List.of("all", "inbox", "project").contains(actualScope)) throw new InvalidRequestException("Scope must be all, inbox, or project");
		if ("project".equals(actualScope) && projectId == null) throw new InvalidRequestException("projectId is required for project scope");
		if (limit < 1 || limit > 500 || offset < 0) throw new InvalidRequestException("Invalid limit or offset");
		List<String> requestedTags = tagNames == null ? List.of() : tagNames.stream().flatMap(value -> java.util.Arrays.stream(value.split(","))).map(String::trim).filter(value -> !value.isBlank()).map(String::toLowerCase).toList();
		java.util.Comparator<ContentEntry> order = switch (sort == null ? "created" : sort) {
			case "updated" -> java.util.Comparator.comparing(ContentEntry::updatedAt).reversed();
			case "title" -> java.util.Comparator.comparing(ContentEntry::title, String.CASE_INSENSITIVE_ORDER);
			case "created" -> java.util.Comparator.comparing(ContentEntry::createdAt).reversed();
			default -> throw new InvalidRequestException("Sort must be created, updated, or title");
		};
		return content.findAll(type, actualScope, projectId, archived, completed).stream()
				.filter(entry -> converted == null || entry.converted() == converted)
				.filter(entry -> requestedTags.isEmpty() || requestedTags.stream().allMatch(tag -> entry.tags().stream().anyMatch(candidate -> candidate.name().equalsIgnoreCase(tag))))
				.sorted(order).skip(offset).limit(limit).toList();
	}
	@Transactional public ContentEntry capture(InboxCaptureRequest request) {
		if (request == null || request.type() == null) throw new InvalidRequestException("Content type is required");
		ContentEntry entry = content.create(request.type(), RequestValidation.required(request.title(), "Title"), RequestValidation.optional(request.content()), RequestValidation.optionalLanguage(request.language()), RequestValidation.optionalUrl(request.sourceUrl(), "Source URL"));
		content.replaceTags(entry.type(), entry.id(), tags.resolveNames(currentUser.id(), request.tags())); return require(entry.type(), entry.id());
	}
	@Transactional public ContentEntry assign(ContentType type, long id, ContentAssignmentRequest request) {
		Long projectId = request == null ? null : request.projectId();
		ProjectAccess target = projectId == null ? null : access.require(projectId, Permission.WRITE_CONTENT);
		ContentEntry existing = require(type, id);
		Placement source = content.placement(type, id).orElseThrow(() -> missing(type, id));
		if (java.util.Objects.equals(source.projectId(), projectId)) return existing;
		// Leaving a shared project is the owner's call; an entry in the own inbox can go anywhere the caller may write.
		if (source.projectId() != null) requireOnEntry(type, id, source.projectId(), Permission.DETACH_CONTENT);
		long newOwner = target == null ? currentUser.id() : target.ownerId();
		if (content.assign(type, id, projectId, newOwner) == 0) throw missing(type, id);
		if (newOwner != source.ownerId()) moveTags(type, id, source.ownerId(), newOwner);
		return require(type, id);
	}
	@Transactional public ContentEntry archive(ContentType type, long id, ContentArchiveRequest request) {
		if (type == ContentType.TODO) throw new InvalidRequestException("Todos use completion instead of archiving");
		writable(type, id);
		if (content.archive(type, id, request != null && request.archived()) == 0) throw missing(type, id); return require(type, id);
	}
	public ContentEntry find(ContentType type, long id) { return require(type, id); }
	@Transactional public ContentEntry update(ContentType type, long id, InboxCaptureRequest request) {
		if (request == null) throw new InvalidRequestException("Request body is required");
		Placement placement = writable(type, id);
		requireUnchanged(type, id, request.expectedUpdatedAt());
		if (content.update(type, id, RequestValidation.required(request.title(), "Title"), RequestValidation.optional(request.content()), RequestValidation.optionalLanguage(request.language()), RequestValidation.optionalUrl(request.sourceUrl(), "Source URL")) == 0) throw missing(type, id);
		content.replaceTags(type, id, tags.resolveNames(placement.ownerId(), request.tags())); return require(type, id);
	}
	@Transactional public ContentEntry setCompleted(long id, boolean completed) {
		writable(ContentType.TODO, id);
		if (content.setCompleted(id, completed) == 0) throw missing(ContentType.TODO, id); return require(ContentType.TODO, id);
	}
	@Transactional public Project promote(ContentType type, long id) {
		ContentEntry entry = require(type, id);
		if (entry.projectId() == null) {
			Project project = projects.create(entry.title(), entry.content()); content.assign(type, id, project.id(), currentUser.id()); return project;
		}
		// An editor may start an own project from an idea of a project they do not own; the idea stays where it is.
		if (type != ContentType.IDEA) throw new ConflictException("Only inbox entries can be promoted");
		ProjectAccess source = access.require(entry.projectId(), Permission.WRITE_CONTENT);
		if (source.ownerId() == currentUser.id()) throw new ConflictException("Only inbox entries can be promoted");
		Project project = projects.create(entry.title(), entry.content());
		references.create(EntityType.PROJECT, project.id(), EntityType.IDEA, id);
		return project;
	}
	@Transactional public void delete(ContentType type, long id) {
		Placement placement = writable(type, id);
		if (content.delete(type, id) == 0) throw missing(type, id); tags.deleteOrphans(placement.ownerId());
	}
	/** The entry must be the caller's own inbox entry or sit in a project where the caller may change content. */
	private Placement writable(ContentType type, long id) {
		Placement placement = content.placement(type, id).orElseThrow(() -> missing(type, id));
		if (placement.projectId() == null) {
			if (placement.ownerId() != currentUser.id()) throw missing(type, id);
			return placement;
		}
		requireOnEntry(type, id, placement.projectId(), Permission.WRITE_CONTENT);
		return placement;
	}
	/** A project the caller cannot see must not show up in the error of an entry that lives in it. */
	private void requireOnEntry(ContentType type, long id, long projectId, Permission permission) {
		try {
			access.require(projectId, permission);
		} catch (ResourceNotFoundException exception) {
			throw missing(type, id);
		}
	}
	/** Tags are per owner, so an entry that changes owner takes its tags over by name. */
	private void moveTags(ContentType type, long id, long oldOwner, long newOwner) {
		List<String> names = content.findTags(type, id).stream().map(Tag::name).toList();
		content.replaceTags(type, id, tags.resolveNames(newOwner, names));
		tags.deleteOrphans(oldOwner);
	}
	/** An editor sends the timestamp it loaded; a newer server state means somebody else saved first. */
	private void requireUnchanged(ContentType type, long id, java.time.Instant expectedUpdatedAt) {
		if (expectedUpdatedAt == null) return;
		ContentEntry current = require(type, id);
		if (current.updatedAt() != null && !current.updatedAt().truncatedTo(java.time.temporal.ChronoUnit.MILLIS).equals(expectedUpdatedAt.truncatedTo(java.time.temporal.ChronoUnit.MILLIS)))
			throw new ContentConflictException("This entry changed on the server since you opened it", current);
	}
	private ContentEntry require(ContentType type, long id) { return content.find(type, id).orElseThrow(() -> missing(type, id)); }
	private ResourceNotFoundException missing(ContentType type, long id) { return new ResourceNotFoundException(type + " " + id + " was not found"); }
}
