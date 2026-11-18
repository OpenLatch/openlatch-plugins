# The agent query

`agents_read` `list` takes it as `query`. `agents_read` `query_catalog` holds every keyword, operator and relation,
and the properties of the `scope` you ask for (`root`, or a relation key), with each property's type and values:
read it first, and use only what it lists. Ask one scope at a time; the whole catalog is too large for one answer.

## Shape

```text
[HAS <conditions>] { WITH | WITHOUT <relation> [HAS <conditions>] }
```

| Part | Meaning |
| ---- | ------- |
| `HAS` | Conditions on the agent itself: properties whose `scope` is `root` |
| `WITH <relation> HAS …` | The agent has at least one related record (an anomaly, a session, a decision, …) matching the conditions, which name that relation's properties |
| `WITHOUT <relation> HAS …` | The agent has none |
| `AND`, `OR`, `NOT`, `( )` | Combine conditions; `NOT` binds tightest, then `AND`, then `OR` |

A condition is `<property> <operator> <value>`. A property's type decides its operators (`operators_by_type`):
`in` and `not_in` take a list `(a, b)`, `between` takes `x AND y`, `exists` and `not_exists` take nothing. Quote a
value with spaces or punctuation: `owner = "alice@example.com"`. Durations are `24h`, `7d`, `30d`.

## Examples

| Question | Query |
| -------- | ----- |
| Shadow agents with a Security anomaly | `HAS sanction = shadow WITH anomaly HAS dimension = security` |
| Agents no longer under control | `HAS control_state = no_longer_under_control` |
| Agents of one owner with an open anomaly | `HAS owner = "alice@example.com" WITH anomaly` |
| Agents in an org unit and below | `HAS org_unit under "Acme/IT"` |

## Rules

- Removed agents are hidden unless the query names `activity` (`HAS activity = removed` lists them).
- `query` is ANDed with every other `list` parameter (`q`, `zone_id`, …).
- `sort` takes a property the catalog marks `sortable`, `order` is `asc` or `desc`; both are read only with `query`.
  The default is open anomalies, descending.
- Limits: 2,000 characters, 20 conditions, 5 joins, 5 levels of parentheses (`QUERY_TOO_COMPLEX`). A slow query
  returns `QUERY_TIMEOUT`: narrow it.
