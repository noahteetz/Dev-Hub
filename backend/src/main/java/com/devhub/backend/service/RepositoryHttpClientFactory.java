package com.devhub.backend.service;

import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class RepositoryHttpClientFactory {

	private final int connectTimeoutMillis;
	private final int readTimeoutMillis;

	public RepositoryHttpClientFactory(
			@Value("${devhub.repository.connect-timeout:3s}") Duration connectTimeout,
			@Value("${devhub.repository.read-timeout:10s}") Duration readTimeout
	) {
		this.connectTimeoutMillis = timeoutMillis(connectTimeout, "connect");
		this.readTimeoutMillis = timeoutMillis(readTimeout, "read");
	}

	public RestClient.Builder builder() {
		SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
		requestFactory.setConnectTimeout(connectTimeoutMillis);
		requestFactory.setReadTimeout(readTimeoutMillis);
		return RestClient.builder().requestFactory(requestFactory);
	}

	private static int timeoutMillis(Duration timeout, String type) {
		if (timeout == null || timeout.isZero() || timeout.isNegative()) {
			throw new IllegalArgumentException("Repository " + type + " timeout must be positive");
		}
		long millis = timeout.toMillis();
		if (millis > Integer.MAX_VALUE) {
			throw new IllegalArgumentException("Repository " + type + " timeout is too large");
		}
		return (int) millis;
	}
}