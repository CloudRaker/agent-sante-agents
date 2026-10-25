# Agent Santé: agents

[Français](README.md)

This repository holds the agents of [Agent Santé](https://agentsante.ca), a free, independent website that helps Quebecers find official health information. The agents run on [CloudRaker Run](https://run.cloudraker.com). The website is in [CloudRaker/agent-sante](https://github.com/CloudRaker/agent-sante).

Agent Santé is not a government service and not an emergency service. It has no affiliation with the Gouvernement du Québec, Santé Québec, the INSPQ or Health Canada. In an emergency, call 911. To talk to a nurse, call 811.

## How it works

- Each agent exists in French (`fr/`) and in English (`en/`), with separate prompts.
- `fr/concierge` and `en/concierge` welcome the person, ask at most one question and hand off to a specialist. They also help a person prepare a call to 811.
- Each specialist answers only from the official sources, with a link to the official page. Care instructions are given as word-for-word quotes, which the website verifies.
- Two custom events connect the agents, and the website listens to them:
  - `handoff` `{to, reason}`: start agent `to` (same language) with the conversation so far;
  - `switch_language` `{to}`: start the agent with the same job in the other language.
- The website checks each message (personal information) and each reply (medical advice) before the person sees it.

## Website tools

Some agents call the tools of the website (`_apis/agent-sante-tools.yaml`, with `call_api`). Run secret `TOOLS_SECRET` fills the `x-agent-sante-tools` header (`network:` in `agent.yml`).

- Places and appointments: `en/access-to-care`, `en/viruses-vaccines` and their French counterparts. The website replaces a postal code with the area and a place reference (`ref-...`), which the agent passes as `near`. The agents never book.
- Nearby pharmacy: `en/flu`, `en/gastro`, `en/medications` and their French counterparts (`places_search`).
- Medications: `en/medications` and `fr/medicaments`. `drug_search` finds any product by name (a prescription product is only named, never suggested). `drug_info` gives the leaflet of an over-the-counter product only. Under each leaflet quote, the website tells the person to ask their pharmacist.

The agent table, the layout and the settings are in the [French README](README.md); the ids and file names are the same in both languages.

## Check

```sh
npx -y rakerun@latest lint .
```

## Sources and license

The prompts and settings are under the Apache License 2.0 (see `LICENSE`). The files under `knowledge/` are copies of official Québec content and stay under the terms of their owners (see `NOTICE`). Each file gives its official page in `source_url`.
