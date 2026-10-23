# OpenLatch Plugins

The OpenLatch plugin for AI coding agents: skills that teach your agent the OpenLatch vocabulary and journeys, plus the MCP server configuration that connects it to your organization.

This repository is a **generated marketplace mirror**. The plugin is built and released by OpenLatch; nothing under `plugins/`, `.claude-plugin/` or `.agents/` is written by hand. Do not open pull requests against those paths.

## Install

### Claude Code

```
/plugin marketplace add OpenLatch/openlatch-plugins
/plugin install openlatch@openlatch
```

Update with `/plugin marketplace update openlatch`.

### Codex

A workspace admin imports this repository as a marketplace; the workspace then syncs it daily and offers the plugin. From the command line:

```
codex plugin marketplace add OpenLatch/openlatch-plugins
```

### Other agents

Install the skills with the instructions on [docs.openlatch.ai](https://docs.openlatch.ai/guides/agents/skills/).

## Connect

The plugin points your agent at `https://app.openlatch.ai/mcp`. You sign in with your OpenLatch account in the browser and approve the agent; no key is pasted anywhere. Setup guides for each agent are on [docs.openlatch.ai](https://docs.openlatch.ai/guides/agents/mcp-setup/).

## Support

This repository is not a support channel: issues and discussions are off. Use the [documentation](https://docs.openlatch.ai/) or contact support from your OpenLatch console. Report vulnerabilities privately, as described in [SECURITY.md](SECURITY.md).

## License

Apache-2.0, see [LICENSE](LICENSE).
