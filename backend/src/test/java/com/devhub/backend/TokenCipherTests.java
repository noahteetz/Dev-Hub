package com.devhub.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.devhub.backend.service.TokenCipher;
import java.util.Base64;
import org.junit.jupiter.api.Test;

class TokenCipherTests {

	private static final String KEY = base64Key((byte) 7);
	private static final String OTHER_KEY = base64Key((byte) 9);

	@Test
	void roundTripsAToken() {
		TokenCipher cipher = new TokenCipher(KEY);

		String stored = cipher.encrypt("ghp_example_token_value");

		assertThat(cipher.decrypt(stored)).isEqualTo("ghp_example_token_value");
	}

	@Test
	void neverStoresTheTokenInReadableForm() {
		TokenCipher cipher = new TokenCipher(KEY);

		String stored = cipher.encrypt("ghp_example_token_value");

		assertThat(stored).doesNotContain("ghp_example_token_value");
	}

	@Test
	void producesADifferentCipherTextEachTimeSoRepeatedTokensAreNotRecognisable() {
		TokenCipher cipher = new TokenCipher(KEY);

		assertThat(cipher.encrypt("same-token")).isNotEqualTo(cipher.encrypt("same-token"));
	}

	@Test
	void refusesToReadAValueWrittenWithAnotherKey() {
		String stored = new TokenCipher(KEY).encrypt("ghp_example_token_value");

		assertThatThrownBy(() -> new TokenCipher(OTHER_KEY).decrypt(stored))
				.isInstanceOf(TokenCipher.TokenUnreadableException.class);
	}

	@Test
	void refusesToReadADamagedValue() {
		TokenCipher cipher = new TokenCipher(KEY);

		assertThatThrownBy(() -> cipher.decrypt("not-base64-!!"))
				.isInstanceOf(TokenCipher.TokenUnreadableException.class);
		assertThatThrownBy(() -> cipher.decrypt(Base64.getEncoder().encodeToString(new byte[4])))
				.isInstanceOf(TokenCipher.TokenUnreadableException.class);
	}

	@Test
	void reportsThatNoKeyIsConfiguredInsteadOfFailingToStart() {
		TokenCipher cipher = new TokenCipher("");

		assertThat(cipher.isConfigured()).isFalse();
		assertThatThrownBy(() -> cipher.encrypt("token")).isInstanceOf(IllegalStateException.class);
	}

	@Test
	void rejectsAKeyThatIsNotUsableForAes() {
		assertThatThrownBy(() -> new TokenCipher("not base64 at all %%%"))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("Base64");
		assertThatThrownBy(() -> new TokenCipher(Base64.getEncoder().encodeToString(new byte[5])))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("16, 24 or 32");
	}

	private static String base64Key(byte filler) {
		byte[] key = new byte[32];
		java.util.Arrays.fill(key, filler);
		return Base64.getEncoder().encodeToString(key);
	}
}
