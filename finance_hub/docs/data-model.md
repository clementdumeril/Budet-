# Modele de donnees recommande

## Objectif

Le projet doit pouvoir gerer:

- plusieurs utilisateurs
- plusieurs comptes
- depenses, revenus et transferts
- imports de donnees brutes
- epargne et investissements

## Tables coeur

### `users`

- `id`
- `email`
- `password_hash`
- `role`
- `is_active`
- `created_at`

### `accounts`

Exemples:

- compte courant
- carte / neo-bank
- epargne
- cash
- broker

Champs conseilles:

- `id`
- `label`
- `institution`
- `type`
- `currency`
- `balance`
- `is_active`

### `transactions`

Table centrale.

Champs conseilles:

- `id`
- `account_id`
- `date`
- `year`
- `month`
- `category`
- `description`
- `amount`
- `transaction_type`
- `reimbursement_to_parents`
- `source`
- `created_at`

## Tables a ajouter ensuite

### `transfers`

Pour eviter de compter deux fois les mouvements entre ses propres comptes.

### `import_sources`

Pour suivre les connecteurs et les fichiers bruts.

### `import_batches`

Pour tracer les imports executes:

- date
- source
- nombre de lignes
- statut

### `investments`

Pour les enveloppes ou placements:

- ETF
- actions
- livrets
- cash broker

### `investment_transactions`

Pour les achats, ventes, versements et frais.

### `budgets`

Pour les objectifs mensuels:

- loyer
- alimentation
- transport
- loisirs

## Decision pratique

Ordre d'ajout recommande:

1. `account_id` sur `transactions`
2. `transaction_type` (`expense`, `income`, `transfer`)
3. `import_batches`
4. `transfers`
5. `budgets`
6. `investment_transactions`
