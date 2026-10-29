# The authoring journey, step by step

## What each step returns

| Step | Tool and method | You get |
| ---- | --------------- | ------- |
| Limits | `drafts_read` `metadata` | The entries you can start from, the limits, whether speech is available; refused with `AI_NOT_ENABLED` when AI authoring is off |
| Brief | `drafts_write` `paste` | A `source` with its `id`: the text is kept as written |
| Draft | `drafts_write` `create` | A `public_id` and the `job_id` of the grounding job (`null` for a built-in preset while AI authoring is off) |
| Read | `drafts_read` `get` | The draft: `revision`, `zone_ids`, `mode`, `preparation`, its intent policies with sentence, `capability`, `cards`, `cases`, `confirmed`, and the `replay` |
| Answer | `drafts_write` `answer` | The intent policy with the card answered. `body`: `card_key` and `choice` (`accept` or `change`, with `values`, `question` or `fallback` as the card asks) |
| Confirm | `drafts_write` `patch_policy` | The intent policy with `confirmed`. Its `body` may also change the `sentence` or the `dimension`; a changed sentence is grounded again by a job |
| Zones | `drafts_write` `set_zones` | The draft with its `zone_ids` and `mode` |
| Prepare | `drafts_write` `prepare` | A `job_id`. `body`: the `revision` you read |
| Replay | `drafts_write` `replay` | A `job_id`: replays the draft against recorded actions |
| Ratify | `policies_ratify` `draft` | The ratified policy, or a refusal below |

An intent policy whose `capability` is `refuse` cannot be enforced; its `refusal` says why. Show it to the user and
leave it out: it is not sent in `sentences`. Send only the confirmed, ratifiable sentences; an unconfirmed intent policy is left out too.

## When a call is refused

| Code | Meaning | Do |
| ---- | ------- | -- |
| `SENTENCES_REQUIRED` | The ratify carried no sentences | Read the draft, show the sentences, send them |
| `SENTENCES_MISMATCH` | The sentences are not the ones this call puts in force | Read the draft again with `drafts_read` `get`, show the user what it holds now, and send exactly those |
| `DRAFT_NOT_PREPARED` | The draft was not prepared at this revision | `drafts_write` `prepare`, poll the job, then ratify |
| `DRAFT_REVISION_STALE` | The draft changed since the revision you sent | Read it again, show the user what changed, and use the new `revision` |
| `EDIT_DRAFT_STALE` | The ratified policy changed since the edit draft opened | Read the policy again; open a new edit draft if the user still wants the change |
| `DRAFT_EXISTS` | Someone holds an edit draft of this policy; `held_by` names them | Tell the user who holds it |
| `AI_NOT_ENABLED` | AI authoring is off for the organization | Start from a built-in preset instead |
| `PREPARATION_TIMED_OUT` | The `error.code` of a `prepare` job that ran too long | Tell the user; do not retry in a loop |
| `FORBIDDEN` | The user's role does not allow authoring | Say which role is needed and ask an organization admin |
| `JOB_ALREADY_EXISTS` | A job of this kind is running for the draft | Poll it with `drafts_read` `job` |

A `prepare` job that ends `failed` carries an `error.code`. A retryable error is retried once with a new `prepare`;
anything else is reported to the user as it is.

## Reading the evidence for the user

- **Sentence and dimension.** Quote the sentence exactly, then say in your own words what it forbids or requires and
  which dimension it belongs to.
- **Test cases.** Each case is an action with the verdict the sentence should give: `should-block`, `should-allow`
  or `look-alike`. Show a few of each kind and name any that fail. A failing case means the sentence does not do what
  it says: offer `drafts_write` `fix` and, if the user agrees to the proposed change, `apply_fix`, or edit the
  sentence with `patch_policy`.
- **Replay.** It runs the draft over recorded actions. Report how many it would have caught, split by Allow, Ask
  and Block, and how many rows could not be read; an unreadable row is never a pass. A replay that is `empty` or
  `engine_unavailable` proves nothing: say so.
- **Mode.** In Monitor the policy records what it would have done; in Enforce it acts on real agent actions. Name the
  zone and the mode before asking for the ratify.

## After the ratify

Read the policy with `policies_read` method `get` and tell the user its `version` and where it is attached. Changing
how it runs later is `policies_write`, described in the `openlatch` skill.
