---
description: Check a Java service follows the four-layer folder layout and import rules
argument-hint: "[service-name | all]"
---
Layout check for **$ARGUMENTS** (default `all`). Java services: `user`, `project`, `payment`, `notification`. Read `.claude/rules/java-layout.md` first. Do not edit.

For each service folder `services/<name>-service/src/main/java/org/kshrd/webblock/<name>/`:
1. **Top-level folders** must be only `presentation`, `application`, `domain`, `infrastructure`, `common` (+ the `*Application` class). Report others (old `controller`, `service`, `model`, `repository`, `config`, `client`, `exception`, `util`, `constraint`).
2. **Imports one way.** Show offenders with file:line:
   - `grep -rn "import org.kshrd.webblock.<name>.\(presentation\|application\|infrastructure\)" domain common/domain`
   - `grep -rn "import org.kshrd.webblock.<name>.presentation" application`
   - `grep -rn "import org.kshrd.webblock.<name>.infrastructure" presentation` (allowed: `infrastructure.security`, queue-name constants in `infrastructure.messaging`)
3. **Placement.** `@Entity` only under `domain`; `@RestController` only under `presentation/rest`; `*Repository extends Jpa/Crud` only under `infrastructure/persistence`;
   `@Transactional` only under `application/**/handler` (and outbox publisher in `infrastructure/messaging`); `@Configuration` under `infrastructure/config|security|messaging`.
4. **Old package.** `grep -rn "com\.webblock" services/<name>-service` (should be empty, including `build.gradle` group).
5. **Tests mirror main.** A test for class X sits in the same package as X.
6. Build proof: `cd services/<name>-service && ./gradlew compileJava compileTestJava -q` and show the result.

Python `provisioning-service`: apply `python-layout.md` (domain imports nothing of ours; application imports only domain).
Output a table: service · rule · file:line · fix. Finish with `N violations`.
