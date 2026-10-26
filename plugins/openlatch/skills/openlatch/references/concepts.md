# Concepts

## Modes

| Mode | Effect |
| ---- | ------ |
| Disabled | The policy does not run |
| Monitor | The policy evaluates and records; it never intervenes. Verdicts that would have acted are flagged |
| Enforce | The verdict is applied before the action executes |

Customers graduate a policy from Monitor to Enforce. OpenLatch never widens an agent's authority on its own.

## Verdicts

| Verdict | What happens |
| ------- | ------------ |
| Allow | The action proceeds |
| Ask | The action is allowed and flagged for asynchronous review. Holding for an answer is the zone's Ask behaviour (*hold until validated*), inherited down the zone tree and overridable per policy; where the agent has no native ask, a hold becomes allow-and-flag. On Claude Code the agent's native ask is used |
| Block | The action does not run |
| Optimize | Not available in this release: no action gets an Optimize verdict. A past Optimize decision may still appear, labelled |

A verdict is deterministic because an explicit policy produced it. Every covered action reaches the decision
point. Never state a latency figure and never claim overall agent safety.

## Dimensions

Quality (output standards), Economics (budgets, models, loops), Security (data, credentials, tools, access),
Safety (blast radius, reversibility), Compliance (regulation, internal standards, contracts). A policy can carry
more than one.

## Anomalies

An anomaly is an agent action that violated an intent policy. It carries the policy, the dimension, the verdict
and the mode the policy was in. Triage is in the `openlatch-triage` skill.
