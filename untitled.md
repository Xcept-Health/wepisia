
# Chapitre 8 : Sécurité, gouvernance et souveraineté – 2026 mindset

---

## 8.1 Introduction : la sécurité n’est plus négociable

Un pipeline RAG n’est plus un jouet de data scientist.  
En 2026, il traite des données **sensibles**, alimente des **décisions à fort enjeu** et opère dans des environnements **réglementés** (santé, finance, droit, administration publique, éducation, RH).

La sécurité, la gouvernance et la souveraineté ne sont **pas des options** ni des couches que l’on ajoute à la fin.  
Ce sont des **fondations architecturales**.  

Les frameworks open-source (LangChain, LlamaIndex, Haystack, etc.) excellent sur la rapidité de prototypage, mais pèchent encore souvent sur la **production sécurisée**.  
Conséquence classique en 2025-2026 :  
- fuites involontaires de PII ou de secrets industriels  
- hallucinations jugées recevables par erreur  
- absence totale de traçabilité → impossibilité de répondre à un audit RGPD / HIPAA / ISO 42001

---

## 8.2 Protection des données personnelles (PII / quasi-identifiants)

### Risques 2026
- RGPD → amendes jusqu’à 4 % du CA mondial  
- HIPAA, NIS2, DORA, EU AI Act (high-risk systems)  
- Re-identification via **quasi-identifiants** (âge + commune + profession + quelques mots-clés)

### Stratégie multi-couches (state of the art 2026)
1. **Ingestion-time** : redaction / masking systématique  
   → Microsoft Presidio, Protecto.ai, AWS Comprehend Medical, regex + spaCy NER  
2. **Chunk-level tagging** : metadata « pii_level: high / medium / none »  
3. **Retrieval-time** : filtrage selon rôle utilisateur (RBAC + metadata filter)  
4. **Generation-time** : scan de la sortie avec Bedrock Guardrails, NeMo Guardrails, LLM-Guard  
5. **Post-generation** : double-check critique par un petit modèle local ou règles dures

Outils les plus déployés en enterprise francophone / EU 2026 :  
- **Protecto.ai** (context-aware, très fort sur quasi-identifiers)  
- **AWS Bedrock Guardrails** (PII + toxicity + contextual)  
- **NVIDIA NeMo Guardrails** (multilingue, retrieval rails)

---

## 8.2 Protection des données personnelles (PII / quasi-identifiants)

Un pipeline RAG mal conçu peut aspirer des **données personnelles identifiables (PII)** lors de l’ingestion, les stocker dans l’index vectoriel, les récupérer lors du retrieval, et les ré-exposer dans la réponse générée parfois sans que l’utilisateur final s’en rende compte.

### Exemples concrets de PII qui posent problème
- Nom, prénom, adresse email ou postale apparaissant dans un log d’activité ou un email interne.
- Numéro de sécurité sociale, carte bancaire ou numéro de téléphone dans un rapport RH ou financier.
- Données médicales (symptômes, diagnostics, traitements) dans un dossier patient ou un compte-rendu hospitalier.
- Combinaisons subtiles : âge + commune + profession + quelques mots-clés → **quasi-identifiants** qui permettent de ré-identifier une personne même sans nom explicite.

### Risques associés
- **Juridiques** : RGPD en Europe (amendes jusqu’à 4 % du CA mondial), HIPAA aux US pour la santé, et en 2026 : NIS2 (cybersécurité), DORA (finance), EU AI Act (systèmes high-risk en santé, emploi, droit, finance → exigences strictes sur data governance et PII).
- **Réputationnels** : scandales médiatiques, perte de confiance clients/partenaires.
- **Opérationnels** : audits internes bloquants, interdictions d’usage (comme Samsung en 2023), ou blocage par les DPO/CISO.

### Solutions de base (approche 2023-2024, toujours valable pour démarrer)
Filtrage PII intégré **en amont et en aval** du pipeline :
- **Amont** → nettoyage dès l’ingestion (avant chunking/indexation).
- **Aval** → scan systématique de la réponse générée avant envoi à l’utilisateur.

Outils open-source classiques et efficaces :
- **Microsoft Presidio** : détection NER + regex + patterns customs, gratuit, facile à intégrer.
- **spaCy NER** + règles regex + critic-LLM (un petit modèle pour valider les détections douteuses).

C’est suffisant pour des prototypes ou des usages non-réglementés, et ça reste la base de beaucoup de pipelines en production légère.

### Évolution vers l’état de l’art 2026 : stratégie multi-couches (defense in depth)
En 2026, les breaches via RAG (fuites via chunks non nettoyés, quasi-identifiants, retrieval de contenu sensible) sont documentées et les régulateurs (EU AI Act high-risk) exigent une protection **tout au long du pipeline**, pas seulement entrée/sortie.

Stratégie recommandée en enterprise (francophone/EU/Afrique) :
1. **Ingestion-time** : redaction/masking systématique (Presidio reste bon, mais complété par outils context-aware).
2. **Chunk-level tagging** : ajouter metadata comme « pii_level: high / medium / none » ou « contains_phi: true » pour filtrer granulairement.
3. **Retrieval-time** : filtrage dynamique selon rôle utilisateur (RBAC + metadata filter) → chunks sensibles exclus pour certains users.
4. **Generation-time** : scan de la sortie avec guardrails programmables.
5. **Post-generation** : double-check par règles dures ou petit modèle local (ex. pour quasi-identifiants).

Outils les plus déployés en 2026 (enterprise-grade, focus RAG) :
- **Protecto.ai** : context-aware, >99% recall sur PII/PHI/PCI + quasi-identifiers, masking qui préserve >85% similarité cosine (ne casse pas le raisonnement LLM), multilingual (50+ langues), très fort pour RAG/agentic AI.
- **AWS Bedrock Guardrails** : PII redaction + toxicity + contextual filters, updates 2025-2026 incluant code domain et hybrid content (texte + code).
- **NVIDIA NeMo Guardrails** : retrieval rails (masquer/rejeter chunks sensibles avant prompt), PII detection/masking intégré, multilingual, programmable (Colang), excellent pour RAG grounding + privacy.

| Niveau de maturité | Approche PII                          | Outils typiques                  | Quand l'utiliser ? |
|--------------------|---------------------------------------|----------------------------------|---------------------|
| Base / Prototype   | Scan ingestion + scan sortie          | Presidio, spaCy NER + regex      | Quick start, non-réglementé |
| Enterprise 2026    | 5 couches + tagging + retrieval ACL   | Protecto.ai, Bedrock/NeMo Guardrails | Santé, finance, droit, admins publiques |
| Souverain/local    | Self-hosted + open-source renforcé    | Presidio + NeMo local-run        | Air-gapped, souveraineté max |


---

## 8.3 Le droit à l’oubli 

Une fois qu’un document a été ingéré, découpé en chunks et indexé dans une base vectorielle, sa suppression complète devient techniquement délicate. Les fragments sont dispersés, les embeddings sémantiquement mêlés, et dans une architecture RAG naïve, effacer le fichier source ne suffit pas à garantir l’oubli total : des résidus peuvent encore être rappelés par similarité.

Pourtant, un pipeline RAG responsable et conforme doit impérativement permettre la **purge sélective**. C’est un pilier de la **souveraineté documentaire** : l’utilisateur (ou le DPO) doit pouvoir exercer son droit à l’effacement (RGPD article 17) sans délai injustifié, y compris pour des données personnelles ou sensibles indexées.

### Contexte réglementaire 2026 des exigences renforcées

- **RGPD article 17** : droit à l’effacement « sans retard injustifié » lorsque les données ne sont plus nécessaires, le consentement est retiré, ou en cas d’objection légitime. Exceptions limitées (obligation légale, intérêt public, recherche scientifique).
- **Rapport EDPB (février 2026)** : une action coordonnée de 32 autorités a mis en lumière des lacunes récurrentes : absence de procédures internes claires, recours abusif à l’anonymisation comme substitut à la suppression, persistance dans les backups, rétention non définie. De nombreuses organisations sont en non-conformité sur la suppression effective.
- **EU AI Act (systèmes à haut risque)** : pour les secteurs santé, emploi, droit, finance, la traçabilité est obligatoire (logs, jeux de données) mais ne dispense pas du RGPD. Les données personnelles doivent rester effaçables ; pas de rétention éternelle sous couvert d’audit. La documentation requise par l’AI Act peut être conservée dix ans, mais sans inclure de PII brutes.
- **Défis spécifiques aux architectures RAG et IA** :
  - Les **embeddings** peuvent permettre une reconstruction partielle (attaques par inversion).
  - Les **modèles fine‑tunés** retiennent l’information dans leurs poids. Un effacement véritable est quasi impossible sans *machine unlearning*, technique encore coûteuse et immature en 2026.
  - Pour une architecture RAG *retrieval‑only*, la suppression est réalisable : il suffit d’effacer les chunks concernés pour que la source ne soit plus restituée.

### Solutions pratiques pour un pipeline responsable

1. **Dès l’ingestion** : assigner un **UUID unique par document** et enrichir les métadonnées :
   - `document_id : uuid`
   - `owner_id : user/tenant`
   - `source_version : v1.2`
   - `expiration_date : YYYY-MM-DD` (pour auto‑purge)
   - `sensitive : true/false` ou `pii_level : high`

2. **Traçabilité au niveau des chunks** : chaque chunk hérite du `document_id` parent et possède son propre `chunk_id`. Cela permet une suppression granulaire sans casser l’intégrité du reste de l’index.

3. **API de purge sélective** (état de l’art 2026) :
   - Suppression par identifiant ou filtre sur les métadonnées (ex. `delete where document_id = 'abc123'`).
   - Suppression par lots avec confirmation : vérifier qu’aucun vecteur résiduel n’est retrouvé via une requête test.
   - Déclenchement événementiel : un webhook RGPD peut lancer une purge automatique.

4. **Gestion des sauvegardes et des journaux** : les backups doivent également supporter la suppression sélective ou la restauration sans les données effacées. Des purges programmées (cron) associées à un versioning permettent de maintenir la conformité.

5. **Cas particuliers** : si des PII subsistent dans les embeddings, combiner avec une rédaction amont (type Protecto.ai) avant suppression. Pour les LLMs purs (hors RAG), le *machine unlearning* reste expérimental et non recommandé en production.

### Support de la suppression sélective dans les bases vectorielles (2026)

Tous les leaders du marché offrent des mécanismes de suppression, mais avec des nuances importantes.

| Base vectorielle | Type d’offre        | Suppression sélective (UUID / métadonnées) | Isolation multi‑tenant | Notes (conformité RGPD) |
|------------------|---------------------|---------------------------------------------|------------------------|--------------------------|
| **Weaviate**     | Open‑source + cloud | Oui (par UUID, filtre sur objets)          | Multi‑tenancy natif (classes/tenants) | Hybride search puissant, métadonnées riches, excellent pour purge |
| **Qdrant**       | Open‑source + cloud | Oui (par ID, filtre JSON)                   | Collections + filtres payload | Filtrage très performant, quantification préservant la confidentialité |
| **Pinecone**     | Cloud managé        | Oui (par ID, namespaces)                    | Namespaces               | Simple, serverless, bon pour l’entreprise |
| **Milvus**       | Open‑source + cloud | Oui (par expression, filtre scalaire)       | Collections + partitions | Passage à l’échelle massif, adapté au self‑hosted souverain |
| **Chroma**       | Open‑source léger   | Oui (par ID, collection)                     | Collections simples       | Idéal pour prototypes, moins mature en production lourde |

**En 2026 il est récommandé de** : combiner un **UUID unique**, un **filtrage par métadonnées** et un **cloisonnement par tenant** (namespaces ou collections). Cela garantit une purge rapide, évite les fuites croisées et assure la conformité RGPD et EU AI Act.

### Schéma simplifié du flux de purge

```
[Demande de suppression] (utilisateur / DPO)
         ↓
[Identification des documents/chunks] (via document_id, tenant_id)
         ↓
[Appel API de suppression] (delete by filter)
         ↓
[Vérification] (requête test pour confirmer l’absence)
         ↓
[Purge des backups] (cron / script dédié)
         ↓
[Journalisation] (trace horodatée de l’opération)
```

---

## 8.4 Cloisonnement des données : multi‑tenancy et isolation

Un pipeline RAG qui ne met pas en œuvre de cloisonnement explicite expose les données à des risques de fuites croisées. Dans une architecture naïve, l’ensemble des sources (internes, externes, publiques, privées) et surtout les données de multiples clients ou unités d’affaires sont ingérées dans un même index vectoriel. Cette promiscuité sémantique permet à un utilisateur, volontairement ou non, de récupérer des fragments d’information appartenant à un autre tenant, par simple similarité de requête.

### 8.4.1 Exemple fondateur et actualisation 2026

En 2023, Samsung a interdit l’usage de ChatGPT après que des ingénieurs eurent involontairement transféré du code source sensible (optimisations, détails matériels, comptes rendus de réunions) vers les serveurs d’OpenAI. Ces données, une fois stockées, échappent à tout contrôle : impossible de les supprimer, risque de réutilisation pour l’entraînement ou de divulgation indirecte.

Transposé à un environnement RAG partagé en 2026, le même mécanisme de fuite peut se produire : un chunk sensible d’un tenant peut être rappelé par une requête sémantiquement proche émanant d’un autre tenant, si l’index n’est pas strictement cloisonné.

### 8.4.2 Conséquences juridiques, réputationnelles et techniques

- **Juridiques** :  
  - Violation du RGPD (articles 5 – minimisation des données, et 32 – sécurité du traitement).  
  - Non‑conformité à l’EU AI Act pour les systèmes à haut risque (gouvernance des données défaillante).  
  - Cumul possible d’amendes avec NIS2 et CRA (si le produit est un logiciel connecté).

- **Réputationnelles** :  
  - Perte de confiance des clients, en particulier dans les secteurs sensibles (santé, finance, droit).  
  - Refus d’adopter une solution SaaS RAG sans preuve d’isolation.

- **Techniques et opérationnelles** :  
  - Vulnérabilité aux attaques adversariales (requêtes construites pour exfiltrer des chunks d’autres tenants).  
  - Surcharge des audits internes et des contrôles de conformité.

### 8.4.3 Principes de conception pour un cloisonnement robuste

L’objectif est de garantir qu’aucune donnée d’un tenant ne puisse être accessible par un autre. Plusieurs stratégies, combinables, sont déployées en 2026 selon le niveau d’isolation recherché et les contraintes d’exploitation.

#### 8.4.3.1 Isolation physique par namespaces

Un **namespace** est une partition physique au sein de l’index vectoriel. Chaque tenant possède son propre namespace ; toutes les opérations d’indexation et d’interrogation sont limitées à cet espace.

- **Avantages** :  
  - Isolation totale, aucune fuite possible par similarité.  
  - Scaling indépendant : la charge d’un tenant n’affecte pas les performances des autres.  
  - Optimisation des requêtes (réduction de l’espace de recherche).

- **Inconvénients** :  
  - Consommation de ressources potentiellement plus élevée.  
  - Gestion administrative des namespaces (création, suppression).

#### 8.4.3.2 Isolation logique par filtrage de métadonnées et contrôle d’accès

Chaque chunk est étiqueté avec des métadonnées (ex. `tenant_id`, `niveau_de_confidentialité`). Lors de la phase de *retrieval*, un filtre est systématiquement appliqué pour n’autoriser que les chunks dont les métadonnées correspondent aux droits de l’utilisateur.

- **Mise en œuvre** :  
  - Enrichissement des chunks lors de l’ingestion : `tenant_id = uuid_tenant`, `access_level = public | restreint | confidentiel`.  
  - Au moment de la requête, extraction de l’identité du tenant (via JWT/OIDC) et ajout d’un filtre `tenant_id == current_tenant`.

- **Avantages** :  
  - Un index unique, économique et simple à maintenir.  
  - Flexibilité : possibilité d’affiner les droits par chunk (RBAC granulaire).

- **Inconvénients** :  
  - La performance dépend de l’efficacité du moteur de filtrage de la base vectorielle.  
  - Risque d’erreur de configuration (oubli du filtre) d’où l’importance d’une architecture Zero Trust.

#### 8.4.3.3 Politiques d’accès : RBAC et Zero Trust

Au‑delà du cloisonnement technique, une politique d’accès stricte doit encadrer chaque requête :

- **RBAC (Role‑Based Access Control)** : chaque utilisateur se voit attribuer un rôle (admin, viewer, editor) dans le contexte d’un tenant. Les autorisations sont vérifiées avant toute opération.
- **Zero Trust** : l’identité et l’autorisation sont contrôlées à chaque étape authentification par JWT/OIDC, vérification RBAC, application du filtre de tenant. Aucune requête n’est traitée sans ces contrôles.

#### 8.4.3.4 Autres patterns d’isolation

- **Collections séparées** : affecter une collection par tenant (ou par groupe). Lourdeur administrative mais isolation maximale.
- **Index par tenant** : chaque tenant dispose de son propre index physique. Idéal pour la souveraineté, mais coûteux en ressources et en synchronisation.

### 8.4.4 Support du multi‑tenancy dans les bases vectorielles (état 2026)

Le tableau ci‑dessous compare les capacités d’isolation des principales bases vectorielles utilisées dans les architectures RAG.

| Base vectorielle | Mécanisme d’isolation principal | Limites / particularités | Cas d’usage recommandé |
|-------------------|----------------------------------|--------------------------|-------------------------|
| **Pinecone**      | Namespaces (jusqu’à 100 000+ sur plans standard) | 20 indexes max par projet ; namespaces physiques | SaaS multi‑clients, isolation forte, scaling indépendant |
| **Weaviate**      | Multi‑tenancy natif (tenants/classes) + filtrage métadonnées | Excellent passage à l’échelle ; compatible RBAC | Hybrid search, besoin de filtrage avancé, self‑hosted souverain |
| **Qdrant**        | Filtrage sur payload JSON + collections + partitions | Pas de limite stricte de namespaces ; filtrage très performant | Applications avec filtres complexes, open‑source, retrieval ACL |
| **Milvus**        | Collections, partitions, filtres scalaires | Adapté aux très gros volumes distribués | Projets massifs, environnements air‑gapped, souveraineté |
| **Chroma**        | Collections simples + filtres métadonnées | Moins mature pour la production à grande échelle | Prototypes, petites charges, multi‑tenancy simple |

**Recommandation 2026** :  
- Pour une offre SaaS multi‑clients, privilégier **Pinecone** (namespaces) ou **Weaviate** (tenants + filtrage).  
- Pour des déploiements souverains (Europe, Afrique) nécessitant un contrôle total, opter pour **Weaviate**, **Qdrant** ou **Milvus** en auto‑hébergement, avec une couche RBAC personnalisée.

### 8.4.5 Schéma fonctionnel d’un pipeline cloisonné

```
[Authentification] → JWT / OIDC
         ↓
[Contrôle RBAC] → extraction du rôle et du tenant_id
         ↓
[Construction de la requête vectorielle] 
   + filtre systématique : tenant_id == current_tenant
         ↓
[Exécution du retrieval] → uniquement chunks du namespace / filtrés
         ↓
[Génération de la réponse] (LLM)
         ↓
[Gouverneur de risque] → validation finale (PII, hallucination, etc.)
         ↓
[Envoi de la réponse à l’utilisateur]
```

Ce flux garantit que chaque étape respecte le cloisonnement : l’authentification établit l’identité, le RBAC détermine les droits, le filtrage restreint l’accès aux seuls chunks autorisés, et le gouverneur de risque apporte une ultime vérification.


---

## 8.5 Le « Risk Governor » – pièce maîtresse 2026

Module transversal qui intercepte la sortie avant envoi à l’utilisateur.

Fonctions typiques :
- Détection PII résiduel  
- Vérification faithfulness / grounding (RAGAS-like scoring)  
- Blocage jailbreak / prompt injection  
- Respect des guidelines métier (ex. « ne pas prescrire de médicament », « ne pas citer de jurisprudence sans source »)

Outils phares 2026 :
- **NVIDIA NeMo Guardrails** (rails programmables, retrieval grounding, multilingual)  
- **AWS Bedrock Guardrails** (PII + denied topics + confidence thresholds)  
- **Guardrails AI** (open-source, toujours très utilisé en custom)

Flux typique :
```
[User query] → [Retrieval sécurisé] → [LLM prompt contrôlé] → [Génération] → [Risk Governor] → [Réponse ou blocage + explication]
```

---

## 8.6 Souveraineté : le prérequis stratégique en 2026

| Option                  | Avantages                              | Inconvénients                     | Usage typique 2026 (EU/Francophone) |
|-------------------------|----------------------------------------|-----------------------------------|--------------------------------------|
| Cloud US pur            | Très rapide, très scalable             | Cloud Act, exit US impossible     | Prototypes, non-réglementé           |
| EU Sovereign Cloud      | Conformité RGPD / EU AI Act, maîtrise  | Plus cher, latence parfois        | Admins, santé, finance, droit        |
| On-premise / air-gapped | Contrôle total                         | Coût infra, maintenance lourde    | Défense, énergie, justice            |
| Hybride intelligent     | Local par défaut + fallback externe    | Complexité d’implémentation       | Entreprises & startups sérieuses     |

Acteurs souverains / européens très actifs en 2026 :
- **Mistral AI** (modèles open-weight, très performants)  
- **OVHcloud AI**, **Scaleway AI**, **Gaia-X compliant providers**  
- **Ollama / vLLM / llama.cpp** pour run local  
- **Haystack** (deepset) + **LlamaIndex** self-hosted

Règle empirique 2026 :  
« Tout RAG appelant systématiquement une API US sans fallback local est considéré **non conforme** pour la majorité des entités soumises à RGPD + EU AI Act. »

---

## 8.7 Observabilité & traçabilité

Chaque réponse doit répondre à :
- Quelle requête ?  
- Quels chunks exacts (avec scores) ?  
- Quelle version du document ?  
- Quelles règles / guardrails appliquées ?  
- Score de faithfulness / pertinence ?

Outils stars 2026 :
- **Langfuse**, **Helicone**, **Phoenix** (RAG-specific tracing)  
- **RAGAS / DeepEval** pour monitoring continu qualité  
- **OpenTelemetry** + Grafana / Kibana pour metrics globaux


---

## 8.8 Auditabilité et conformité

Un pipeline peut viser des certifications (ex. ISO 27001, SOC 2) et la conformité HIPAA / RGPD, ou être validé pour un usage clinique.

Cela suppose :  
- **Journalisation** (qui a fait quoi, quand).  
- **Versioning documentaire** (quelle version d’un texte était en vigueur).  
- **Explicabilité** (source exacte de chaque réponse).  

---

## 8.9 Red teaming et tests adversariaux : se confronter à ses propres failles

Un pipeline RAG, aussi sécurisé soit-il en conception, peut présenter des vulnérabilités insoupçonnées. Le **red teaming** consiste à simuler des attaques réelles pour découvrir ces failles **avant** qu’un adversaire ne les exploite. C’est une assurance-vie pour les systèmes critiques.

### Typologies d’attaques à tester

- **Injections de prompts** : l’attaquant tente de détourner le LLM via des instructions cachées dans la requête ou via des chunks malveillants (context injection).
- **Exfiltration de données** : requêtes conçues pour forcer le modèle à révéler des chunks sensibles d’autres tenants ou des PII non filtrées.
- **Jailbreak** : contournement des garde-fous pour obtenir des réponses interdites (conseils médicaux, légaux, etc.).
- **Empoisonnement de la base** : injection de chunks toxiques ou trompeurs dans le corpus pour polluer les réponses futures.
- **Évasion du gouverneur de risque** : tests pour voir si des réponses dangereuses peuvent passer les filtres finaux.

### Méthodologie 

1. **Constituer une équipe dédiée** (ou faire appel à des prestataires spécialisés) avec un regard neuf.
2. **Définir des scénarios réalistes** basés sur la surface d’attaque du pipeline (ingestion, retrieval, génération, gouvernance).
3. **Exécuter les tests** en conditions opérationnelles, avec instrumentation poussée (logs, métriques).
4. **Analyser les résultats** : taux de réussite des attaques, failles découvertes, temps de détection.
5. **Remédier** : ajuster les filtres, renforcer les prompts, améliorer le gouverneur de risque.
6. **Répéter** : le red teaming doit être continu, pas ponctuel.

### Outils spécialisés

| Outil | Focus | Atout principal |
|-------|-------|-----------------|
| **NVIDIA NeMo Guardrails** | Détection d’injections, jailbreak | Retrieval rails + programmabilité Colang |
| **Guardrails AI** | Validation structurelle, politiques | RAIL spec, open‑source |
| **Garak** | Scanner automatique de vulnérabilités LLM | Tests en batch, nombreuses sondes |
| **PyRIT (Microsoft)** | Framework de red teaming automatisé | Scénarios paramétrables, intégration CI/CD |
| **Firewalls IA** (ex. HiddenLayer, CalypsoAI) | Protection runtime + tests adversariaux | Détection en temps réel, logs d’attaques |

### Intégration dans le cycle de vie

- **En développement** : tests unitaires adversariaux (ex. prompt injection sur un échantillon).
- **Avant mise en production** : campagne de red teaming complète.
- **En production** : surveillance continue avec détection d’anomalies (cf. observabilité 8.7) et déclenchement de tests ciblés.

Le red teaming n’est pas un luxe : c’est le seul moyen de valider que votre pipeline résiste à des adversaires déterminés. Avec la maturité des attaques sur les systèmes RAG, une campagne régulière est indispensable pour maintenir la confiance et la conformité (EU AI Act exige des mécanismes de surveillance et de gestion des risques).

---

## 8.9 Schéma global mis à jour (2026)

```text
             ┌────────────────────────────┐
             │   Sources fiables          │
             └─────────────┬──────────────┘
                           │
                  ┌────────▼─────────┐
                  │ Ingestion sécurisée│ ← PII redaction + tagging
                  └───────┬──────────┘
                          │
         ┌────────────────┴────────────────┐
         │                                 │
 ┌───────▼─────────┐               ┌───────▼─────────┐
 │ PII & Sensitive │               │ Droit à l’oubli │ ← UUID + expiration
 │ Filter multi    │               │ purge auto      │
 └───────┬─────────┘               └───────┬─────────┘
         └─────────────────────────────────┘
                          │
                          ▼
              ┌─────────────────────┐
              │ Index sécurisé      │ ← multi-tenancy / namespaces
              └─────────┬───────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │ Retrieval contrôlé  │ ← ACL native + metadata filter
              └─────────┬──────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │ Génération LLM      │ ← prompt templating strict
              └─────────┬──────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │ Risk Governor       │ ← NeMo / Bedrock / custom
              └─────────┬──────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │ Réponse validée     │ ← faithfulness score + citations
              └─────────┬──────────┘
                        │
           ┌────────────┴────────────┐
           │                         │
   ┌───────▼────────┐        ┌────────▼────────┐
   │ Observabilité  │        │ Audit & Red Team│
   │ + RAG eval     │        │ + ISO 42001     │
   └────────────────┘        └─────────────────┘
```

---

## 8.10 Tableau récapitulatif 2026

| Mécanisme                | Objectif principal                     | Outils / pratiques stars 2026             |
|--------------------------|----------------------------------------|--------------------------------------------|
| Filtrage PII multi-couches | Éliminer PII + quasi-identifiers      | Protecto.ai, Bedrock Guardrails, Presidio  |
| Droit à l’oubli          | Purge sélective & conforme RGPD       | UUID + metadata expiration (Weaviate, Qdrant) |
| Multi-tenancy / cloisonnement | Zéro fuite croisée                   | Retrieval-native ACL, namespaces           |
| Risk Governor            | Bloquer sorties dangereuses           | NeMo Guardrails, Bedrock Guardrails        |
| Souveraineté             | Maîtrise des données & conformité     | Mistral, OVH/Scaleway, hybride local       |
| Observabilité            | Traçabilité totale + monitoring qualité | Langfuse, Phoenix, RAGAS, OpenTelemetry    |
| Red teaming RAG          | Découvrir failles avant production    | Garak + NeMo adversarial rails             |

---

## 8.11 Conclusion

En 2026, un pipeline RAG sans sécurité native, gouvernance forte et souveraineté assumée n’est plus un outil professionnel :  
c’est un **risque organisationnel majeur**.

Les fuites de PII, les hallucinations jugées recevables, les fuites croisées multi-tenant, l’absence de purge sélective ou de cloisonnement strict ne sont plus des « bugs acceptables » ce sont des **violations réglementaires** (RGPD, EU AI Act high-risk, NIS2, DORA, CRA), des **amendes cumulées** (jusqu’à 4 % du CA mondial + pénalités sectorielles), des **scandales réputationnels** et des **interdictions d’usage** (à l'instar de Samsung en 2023, toujours enseigné comme cas d’école).

Les briques que nous avons vues dans ce chapitre ne sont pas des options luxueuses :  
- Filtrage PII multi-couches (Protecto.ai, NeMo, Bedrock)  
- Droit à l’oubli granulaire (UUID + purge APIs dans Weaviate/Qdrant/Pinecone)  
- Cloisonnement robuste (namespaces, metadata ACL, Zero Trust)  
- Gouverneur de risque transversal (NeMo Guardrails + faithfulness scoring)  
- Souveraineté assumée (Mistral self-hosted, OVH/Scaleway, AWS Sovereign Cloud, hybride local)  
- Observabilité et traçabilité (Langfuse, Phoenix, RAGAS)  
- Red teaming continu (Garak, PyRIT, adversarial rails)

Ensemble, elles forment un **cercle vertueux** :  
- **Sécurité** : protection immédiate contre fuites et injections  
- **Gouvernance** : confiance légale, audits et conformité (RGPD, EU AI Act, ISO 42001)  
- **Souveraineté** : indépendance stratégique, maîtrise des données et résilience géopolitique  

Sans elles, on reste dans des **pipelines-jouets** , fragiles et non viables pour les secteurs critiques.  
Avec elles, on obtient des **systèmes de confiance** capables d’équiper hôpitaux, tribunaux, ministères, banques, industries et administrations publiques.