package com.devhub.backend.controller;

import com.devhub.backend.exception.InvalidRequestException;
import com.devhub.backend.exception.ResourceNotFoundException;
import com.devhub.backend.model.UserSummary;
import com.devhub.backend.repository.AppUserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

	private final AppUserRepository users;

	public UserController(AppUserRepository users) {
		this.users = users;
	}

	/** Finds one account by its exact username or e-mail; there is no listing or partial match. */
	@GetMapping("/lookup")
	public UserSummary lookup(@RequestParam("query") String query) {
		if (query == null || query.isBlank()) {
			throw new InvalidRequestException("Query is required");
		}
		return users.findByUsernameOrEmail(query)
				.orElseThrow(() -> new ResourceNotFoundException("No user matches that username or e-mail"));
	}
}
