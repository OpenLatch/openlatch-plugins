# Change how an existing policy runs

1. `policies_read` with method `get` and the policy's `public_id`. It returns the current sentences and `version`.
2. Show the user the sentences, the current mode and the mode you propose.
3. After the user agrees, `policies_write` with method `set_mode`, the `public_id`, the new `mode` and the
   `version` from step 1. Pass a new `idempotency_key` for every attempt.
4. A stale or missing `version` is refused: read the policy again and show any change before retrying.

Moving a policy to Enforce changes what happens to real agent actions. Say so, and name the mode you mean.

This is the only way to change a policy through MCP. A new policy, or a preset, is made in the console.
