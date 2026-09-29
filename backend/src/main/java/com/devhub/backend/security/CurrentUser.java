package com.devhub.backend.security;

import com.devhub.backend.repository.AppUserRepository;
import java.util.function.Supplier;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;

/**
 * The account the current request belongs to. Every repository scopes its queries by
 * this id, so a user only ever reads and writes their own rows.
 */
@Component
public class CurrentUser {

	/** The single account a run without a login works as. */
	public static final String LOCAL_SUBJECT = "local";

	private static final String REQUEST_ATTRIBUTE = CurrentUser.class.getName() + ".id";
	private static final ThreadLocal<Long> RUN_AS = new ThreadLocal<>();

	private final AppUserRepository users;
	private final AuthProperties properties;

	public CurrentUser(AppUserRepository users, AuthProperties properties) {
		this.users = users;
		this.properties = properties;
	}

	public long id() {
		Long forced = RUN_AS.get();
		if (forced != null) {
			return forced;
		}
		RequestAttributes request = RequestContextHolder.getRequestAttributes();
		if (request != null && request.getAttribute(REQUEST_ATTRIBUTE, RequestAttributes.SCOPE_REQUEST) instanceof Long cached) {
			return cached;
		}
		long id = resolve();
		if (request != null) {
			request.setAttribute(REQUEST_ATTRIBUTE, id, RequestAttributes.SCOPE_REQUEST);
		}
		return id;
	}

	/** Runs work outside a request, such as the background sync, on behalf of one account. */
	public <T> T runAs(long userId, Supplier<T> action) {
		Long previous = RUN_AS.get();
		RUN_AS.set(userId);
		try {
			return action.get();
		} finally {
			if (previous == null) {
				RUN_AS.remove();
			} else {
				RUN_AS.set(previous);
			}
		}
	}

	private long resolve() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
			Jwt token = jwtAuthentication.getToken();
			if (!StringUtils.hasText(token.getSubject())) {
				throw new AccessDeniedException("The access token carries no subject");
			}
			return users.resolve(token.getSubject(), token.getClaimAsString("preferred_username"));
		}
		if (!properties.isEnabled()) {
			return users.resolve(LOCAL_SUBJECT, LOCAL_SUBJECT);
		}
		throw new AccessDeniedException("No logged-in user");
	}
}
