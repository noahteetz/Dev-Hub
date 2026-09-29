package com.devhub.backend.service;

import com.devhub.backend.dto.EntityReferenceRequest;
import com.devhub.backend.exception.ForbiddenException;
import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.EntityReference;
import com.devhub.backend.model.EntityType;
import com.devhub.backend.model.Permission;
import com.devhub.backend.repository.EntityReferenceRepository;
import com.devhub.backend.repository.GlobalContentRepository.Placement;
import com.devhub.backend.security.CurrentUser;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EntityReferenceService {

	private final EntityReferenceRepository references;
	private final ProjectAccessService access;
	private final CurrentUser currentUser;

	public EntityReferenceService(EntityReferenceRepository references, ProjectAccessService access, CurrentUser currentUser) {
		this.references = references;
		this.access = access;
		this.currentUser = currentUser;
	}

	@Transactional
	public EntityReference create(EntityReferenceRequest request) {
		if (request == null || request.sourceType() == null || request.targetType() == null
				|| request.sourceId() == null || request.targetId() == null) {
			throw new InvalidRequestException("Source and target are required");
		}
		if (request.sourceType() == request.targetType() && Objects.equals(request.sourceId(), request.targetId())) {
			throw new InvalidRequestException("An entry cannot reference itself");
		}
		requireTitle(request.sourceType(), request.sourceId());
		if (!canWrite(request.sourceType(), request.sourceId())) {
			throw new ForbiddenException("Your role in this project does not allow this action");
		}
		requireTitle(request.targetType(), request.targetId());

		EntityReference reference = references
				.find(request.sourceType(), request.sourceId(), request.targetType(), request.targetId())
				.orElseGet(() -> references.create(request.sourceType(), request.sourceId(), request.targetType(), request.targetId()));
		return resolve(reference).orElseThrow();
	}

	/** Outgoing references of an entry, with links to deleted entries cleaned up on the way out. */
	@Transactional
	public List<EntityReference> outgoing(EntityType type, long id) {
		requireTitle(type, id);
		return resolveAll(references.findOutgoing(type, id));
	}

	/** Incoming references, so every entry shows which entries point at it. */
	@Transactional
	public List<EntityReference> incoming(EntityType type, long id) {
		requireTitle(type, id);
		return resolveAll(references.findIncoming(type, id));
	}

	@Transactional
	public void delete(long id) {
		EntityReference reference = references.find(id)
				.orElseThrow(() -> new ResourceNotFoundException("Reference " + id + " was not found"));
		boolean allowed = references.createdByCurrentUser(id)
				|| (references.title(reference.sourceType(), reference.sourceId()).isPresent()
					&& canWrite(reference.sourceType(), reference.sourceId()));
		if (!allowed) {
			throw new ResourceNotFoundException("Reference " + id + " was not found");
		}
		references.delete(id);
	}

	private List<EntityReference> resolveAll(List<EntityReference> raw) {
		return raw.stream().map(this::resolve).flatMap(Optional::stream).toList();
	}

	/**
	 * Fills in both titles. A reference to an entry the caller may not see is left out for them.
	 * One whose source or target was deleted is removed here, so a deleted entry silently drops
	 * the link instead of leaving a broken row behind.
	 */
	private Optional<EntityReference> resolve(EntityReference reference) {
		Optional<String> sourceTitle = references.title(reference.sourceType(), reference.sourceId());
		Optional<String> targetTitle = references.title(reference.targetType(), reference.targetId());
		if (sourceTitle.isEmpty() || targetTitle.isEmpty()) {
			if (!references.exists(reference.sourceType(), reference.sourceId())
					|| !references.exists(reference.targetType(), reference.targetId())) {
				references.delete(reference.id());
			}
			return Optional.empty();
		}
		return Optional.of(new EntityReference(reference.id(), reference.sourceType(), reference.sourceId(), sourceTitle.get(),
				reference.targetType(), reference.targetId(), targetTitle.get(), reference.targetUrl(), reference.sourceUrl(),
				reference.createdAt()));
	}

	/** The caller's own inbox entries, and anything in a project where they may change content. */
	private boolean canWrite(EntityType type, long id) {
		Optional<Placement> placement = references.placement(type, id);
		if (placement.isEmpty()) {
			return false;
		}
		if (placement.get().projectId() == null) {
			return placement.get().ownerId() == currentUser.id();
		}
		try {
			access.require(placement.get().projectId(), Permission.WRITE_CONTENT);
			return true;
		} catch (ResourceNotFoundException | ForbiddenException exception) {
			return false;
		}
	}

	private void requireTitle(EntityType type, long id) {
		references.title(type, id)
				.orElseThrow(() -> new ResourceNotFoundException(type + " " + id + " was not found"));
	}
}
