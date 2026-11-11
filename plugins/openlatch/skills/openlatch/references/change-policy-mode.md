# Change how an existing policy runs

1. `policies_read` with method `get` and the policy's `public_id`. It returns the current sentences, `version`
   and `attachments`: the zone the policy belongs to, with its mode there.
2. Show the user the sentences, the zone, the mode of that zone's attachment (from `attachments`, not the
   top-level mode, which is the strictest one) and the mode you propose. The mode is set on the policy's attachment
   to one zone, not on the policy as a whole.
3. After the user agrees, `policies_write` with method `set_mode`, the `public_id` in `params`, the new `mode` in
   `body` with the `zone_id` of the attachment to change, and the `version` from step 1 as the top-level `version`.
   A `zone_id` that holds no attachment of the policy is refused (`INHERITED_HERE`). Without a `zone_id` the call
   targets the policy's attachment; a policy with no attachment is refused (`NOT_ATTACHED`). Pass a new
   `idempotency_key` for every attempt.
4. A stale or missing `version` is refused: read the policy again and show any change before retrying.

Only a ratified policy can change mode. Enforce is refused (`NOT_ACTIVATABLE`) when no intent policy in it is
enforceable. Setting Disabled switches the policy off for every agent of its zone and of the zones beneath it.

Setting a policy to Enforce in a zone changes what happens to real agent actions there. Say so, and name the zone and
the mode you mean.

`policies_write` also promotes an attachment to Enforce from an anomaly (`promote`), deletes a policy (`retire`: it
cannot be used again) and copies a policy to another zone (`copy`, with the target `zone_id` in `body`: it starts a new
Monitor draft with the same intent policies, ratified like any draft); read its description before using one, and
confirm with the user first. A policy belongs to one zone for its whole life and never moves (`ZONE_FIXED` for an
edit that names another zone). To run the same rules elsewhere, `copy` the policy there; to stop running it, delete
it, and say that its agents stop running it. A new policy, or a preset, starts a draft: use the `openlatch-autonomy-zones` skill.
