# Agent Santé : les agents

[English](README.en.md)

Ce dépôt contient les agents d'[Agent Santé](https://agentsante.ca), un site gratuit et indépendant qui aide les Québécois à trouver l'information santé officielle. Les agents fonctionnent sur [CloudRaker Run](https://run.cloudraker.com). Le site web est dans [CloudRaker/agent-sante](https://github.com/CloudRaker/agent-sante).

Agent Santé n'est pas un service gouvernemental ni un service d'urgence. Il n'a aucune affiliation avec le gouvernement du Québec, Santé Québec, l'INSPQ ou Santé Canada. En cas d'urgence, appelez le 911. Pour parler à une infirmière, appelez le 811.

## Fonctionnement

- Chaque agent existe en français (`fr/`) et en anglais (`en/`), avec des consignes distinctes.
- `fr/concierge` et `en/concierge` accueillent la personne, posent au plus une question et transfèrent vers un agent spécialisé. Ils aident aussi à préparer un appel au 811.
- Chaque agent spécialisé répond seulement à partir des sources officielles, avec un lien vers la page officielle. Les consignes de soins se donnent en citation mot pour mot, vérifiée par le site.
- Deux événements relient les agents, et le site les écoute :
  - `handoff` `{to, reason}` : démarre l'agent `to` (même langue) avec l'échange jusqu'ici;
  - `switch_language` `{to}` : démarre l'agent qui fait le même travail dans l'autre langue.
- Le site vérifie chaque message (renseignements personnels) et chaque réponse (conseil médical) avant que la personne la voie.

## Outils du site

Certains agents appellent les outils du site (`_apis/agent-sante-tools.yaml`, avec `call_api`). Le secret Run `TOOLS_SECRET` remplit l'en-tête `x-agent-sante-tools` (`network:` dans `agent.yml`).

- Lieux et rendez-vous : `fr/acces-services`, `fr/virus-vaccins` et leurs équivalents anglais. Le site remplace un code postal par le secteur et une référence de lieu (`ref-...`), que l'agent passe dans `near`. Les agents ne prennent jamais de rendez-vous.
- Pharmacie proche : `fr/grippe`, `fr/gastro`, `fr/medicaments` et leurs équivalents anglais (`places_search`).
- Médicaments : `fr/medicaments` et `en/medications`. `drug_search` trouve tout produit par son nom (un produit sur ordonnance est seulement nommé, jamais proposé). `drug_info` donne la notice d'un produit en vente libre seulement. Sous chaque citation de la notice, le site rappelle de demander conseil au pharmacien.

## Agents

| Français | Anglais | Sources (chaque agent lit sa langue d'abord, puis les mêmes dossiers dans l'autre langue) |
| --- | --- | --- |
| `fr/concierge` | `en/concierge` | orientation, rendez-vous, systeme-sante |
| `fr/virus-vaccins` | `en/viruses-vaccines` | vaccination, orientation |
| `fr/grippe` | `en/flu` | virus-respiratoires, orientation |
| `fr/gastro` | `en/gastro` | virus-respiratoires, maladies-courantes, grossesse-enfants, prevention-habitudes-de-vie, orientation |
| `fr/aines` | `en/seniors` | aines, orientation |
| `fr/sante-mentale` | `en/mental-health` | sante-mentale, orientation |
| `fr/grossesse-enfants` | `en/pregnancy-children` | grossesse-enfants, orientation |
| `fr/maladies-medicaments` | `en/illness-medication` | maladies-courantes, medicaments-pharmacie, orientation |
| `fr/medicaments` | `en/medications` | medicaments-pharmacie, maladies-courantes, orientation, et la base de données des médicaments de Santé Canada |
| `fr/acces-services` | `en/access-to-care` | rendez-vous, orientation, systeme-sante |
| `fr/prevention-environnement` | `en/prevention-environment` | prevention-habitudes-de-vie, sante-publique-environnement, orientation |
| `fr/sante-sexuelle` | `en/sexual-health` | sante-sexuelle, orientation |

`agents.json` est le catalogue des agents pour le site (`id`, `lang`, `name`, `description`, `counterpart` et l'agent d'accueil de chaque langue).

## Structure

```
agent.yml                 réglages communs : modèle, conservation, délai, limites
fr/AGENTS.md              règles communes en français (sécurité, sources, agents, événements)
fr/<agent>/AGENTS.md      le rôle d'un agent
fr/<agent>/agent.yml      réglages de l'agent : nom, mode, sources, événements, outils
fr/<agent>/_apis/         les outils du site (OpenAPI)
en/...                    la même chose en anglais
knowledge/<lang>/<theme>/ copies Markdown des sources officielles, une page par fichier
agents.json               le catalogue des agents pour le site
```

La consigne d'un agent est `fr/AGENTS.md` (ou `en/AGENTS.md`) suivi du `AGENTS.md` de l'agent. Les consignes ne contiennent aucune date ni donnée de la personne : elles sont les mêmes pour tous, ce qui permet la mise en cache chez le fournisseur du modèle.

## Réglages

- Modèle : `anthropic/claude-haiku-5-5`, température 0,2.
- Mode `turns`, `idle_ttl: 5m`, `retention: 5m` : les données de la conversation sont effacées environ 10 minutes après la fin de la conversation.
- `limits.max_steps: 200` par conversation, `timeout: 50s` par tour.
- `protection: token` : seul le serveur du site peut démarrer un agent.

## Vérifier

```sh
npx -y rakerun@latest lint .
```

## Sources et licence

Les consignes et les réglages sont sous licence Apache 2.0 (voir `LICENSE`). Les fichiers de `knowledge/` sont des copies de contenu officiel québécois et restent soumis aux conditions de leurs propriétaires (voir `NOTICE`). Chaque fichier indique sa page officielle dans `source_url`.
