# Concepts

## Modes

A mode belongs to a policy's **attachment to a zone**, never to a single intent policy inside it. A policy is
attached to **one zone at most**: a second zone is refused (`ONE_ZONE_PER_AIP`), and moving a policy means removing it
from its zone, then attaching it to the other. The policy applies to the agents of that zone and of every zone
beneath it; to run the same rules elsewhere in another mode, author a separate policy there.

| Mode | Effect |
| ---- | ------ |
| Disabled | The attachment is switched off. The policy still runs in that zone when an ancestor attaches it in Monitor or Enforce |
| Monitor | The policy evaluates and records; it never intervenes. Verdicts that would have acted are flagged |
| Enforce | The verdict is applied before the action executes |

Customers graduate a policy from Monitor to Enforce, zone by zone. OpenLatch never widens an agent's authority on its own.

## Verdicts

| Verdict | What happens |
| ------- | ------------ |
| Allow | The action proceeds |
| Ask | The action is allowed and flagged for asynchronous review. Holding for an answer is the zone's Ask behaviour (*hold until validated*), inherited down the zone tree and overridable per policy; where the agent has no native ask, a hold becomes allow-and-flag. On Claude Code the agent's native ask is used |
| Block | The action does not run |
| Optimize | The action is denied and the agent receives the ratified sentence and the steer, the better path, as its reason (Enforce); in Monitor the action runs and the would-have Optimize is recorded. A repeated action is steered at most twice, then settles by the policy's fallback (Ask by default). On model requests it is measured only: a request is never changed |

A verdict is deterministic because an explicit policy produced it. Every covered action reaches the decision
point. Never state a latency figure and never claim overall agent safety.

## Dimensions

Quality (output standards), Economics (budgets, models, loops), Security (data, credentials, tools, access),
Safety (blast radius, reversibility), Compliance (regulation, internal standards, contracts). A policy can carry
more than one.

## Anomalies

An anomaly is an agent action that violated an intent policy. It carries the policy, the dimension, the verdict
and the mode of the policy's attachment at the time. Triage is in the `openlatch-triage` skill.
