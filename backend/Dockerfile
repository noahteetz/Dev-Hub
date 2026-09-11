FROM eclipse-temurin:25-jdk AS build

WORKDIR /app
COPY . .
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:25-jre

# The runtime image ships no HTTP client at all, so the container healthcheck
# had nothing to call the actuator probe with and the container never turned
# healthy. curl is also what makes the container debuggable from a shell.
RUN apt-get update \
	&& apt-get install --no-install-recommends -y curl \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]