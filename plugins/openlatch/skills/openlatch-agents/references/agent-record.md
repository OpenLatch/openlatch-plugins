# Working with the agent record

- Find by name with `agents_read` `list` and `q`; narrow with `zone_id` or `control_level`. Page long results.
- An agent resolves to one effective zone: the one assigned to it, else the nearest ancestor zone in the org
  tree. `zones_read` `agent_zone` shows the result.
- Ownership: `agents_read` `ownership`, change with `agents_write` `set_ownership`, re-verify with
  `recheck_ownership`.
- Sessions: start from `agent_sessions_read` `summary`, then `list`; narrow the execution graph with `window`,
  `from` and `to` before reading `node_events`.
- Assigning a zone changes which policies apply to the agent. Name the zone and the agent before you call
  `zones_write` `assign_agent`.
