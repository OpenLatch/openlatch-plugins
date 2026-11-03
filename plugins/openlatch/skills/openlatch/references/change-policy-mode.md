# Change how an existing policy runs

1. `policies_read` with method `get` and the policy's `public_id`. It returns the current sentences, `version`
   and `attachments`: the zone the policy is attached to (one at most), with its mode there.
2. Show the user the sentences, the zone, the mode of that zone's attachment (from `attachments`, not the
   top-level mode, which is the strictest one) and the mode you propose. The mode is set on the policy's attachment
   to one zone, not on the policy as a whole.
3. After the user agrees, `policies_write` with method `set_mode`, the `public_id` in `params`, the new `mode` in
   `body` with the `zone_id` of the attachment to change, and the `version` from step 1 as the top-level `version`.
   A `zone_id` that holds no attachment of the policy is refused (`INHERITED_HERE`). Without a `zone_id` the call
   targets the policy's attachment; a policy attached nowhere is refused (`NOT_ATTACHED`). Pass a new
   `idempotency_key` for every attempt.
4. A stale or missing `version` is refused: read the policy again and show any change before retrying.

Only a ratified policy can change mode. Enforce is refused (`NOT_ACTIVATABLE`) when no intent policy in it is
enforceable. Setting Disabled switches the policy off for every agent of its zone and of the zones beneath it.

Moving a policy to Enforce in a zone changes what happens to real agent actions there. Say so, and name the zone and
the mode you mean.

`policies_write` also attaches a ratified policy to a zone (`attach`), removes it from its zone (`detach`), promotes
an attachment to Enforce from an anomaly (`promote`) and retires a policy (`retire`); read its description before
using one, and confirm with the user first. A policy sits in one zone: attaching one already in another zone is
refused (`ONE_ZONE_PER_AIP`). To move it, `detach` it from its zone, then `attach` it to the new one, and say that
its agents in the old zone stop running it in between. A new policy, or a preset, starts a draft: use the `openlatch-autonomy-zones` skill.
