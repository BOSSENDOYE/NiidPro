# Règles et Calculs — Génération du Bulletin de Paie

> Document de référence technique pour le module paie de NiidPro.  
> Toute modification des formules dans le code doit être répercutée ici.

---

## 1. Structure générale d'un bulletin

Un bulletin est composé de **sections ordonnées**. Chaque section regroupe des lignes issues du modèle de paie affecté à l'agent.

| Ordre | Type (code) | Libellé affiché |
|------:|-------------|-----------------|
| 1 | `base` | TRAITEMENT DE BASE |
| 2 | `augmentation` | AUGMENTATIONS ET INDEMNITÉS |
| 3 | `ipress` | I.P.R.E.S — RETRAITE |
| 4 | `ipm` | I.P.M — INSTITUTION DE PRÉVOYANCE MALADIE |
| 5 | `css` | C.S.S — CAISSE DE SÉCURITÉ SOCIALE |
| 6 | `ir` | I.R — IMPÔT SUR LE REVENU |
| 7 | `trimf` | TRIMF — TAXE SUR REVENU |
| 8 | `retenue` | RETENUES DIVERSES |
| N | *tout autre type* | Nom du type en majuscules (généré dynamiquement) |

> Les types 8 et suivants sont **extensibles** : tout type créé dans le modèle de paie apparaît automatiquement dans le bulletin sans modification du code.

---

## 2. Source des données

| Donnée | Source |
|--------|--------|
| Rubriques et taux | Modèle de paie affecté à l'agent (`payroll_template_lines`) |
| Solde mensuel indiciaire | Table `recruitment_indices` → champ `solde_mensuelle` |
| Augmentations par indice | Table pivot `indice_augmentations` → champ `montant` |
| Part IR et Part TRIMF | Fiche agent → champs `part_ir` et `part_trimf` (défaut : 1) |
| Barème IRPP / TRIMF | Table `recruitment_baremes` (4 974 tranches, 50 000 à 5 000 000 FCFA) |

---

## 3. Section BASE — Traitement de base

### 3.1 Solde Mensuel Indiciaire (SMI)

```
GAIN = solde_mensuelle  (issu de l'indice de l'agent)
```

La colonne **Base de Calcul** affiche la valeur de l'indice (`valeur`).

### 3.2 Complément Spécial de Solde (CSS_S)

```
GAIN = ARRONDI( taux_salarial% × solde_mensuelle )
```

> Le `taux_salarial` est défini dans le modèle (ex : 14 %).  
> Condition : `solde_mensuelle > 0` et `base_calcul > 0` dans la ligne du modèle.

### 3.3 Indemnité de Résidence

```
GAIN = ARRONDI( taux_salarial% × solde_mensuelle )
```

> Même règle que le Complément Spécial de Solde.

### 3.4 Règle générale pour les autres lignes `base`

```
GAIN = valeur saisie manuellement dans le bulletin
```

---

## 4. Section AUGMENTATION — Augmentations et Indemnités

Chaque ligne d'augmentation est liée à une rubrique (`rubrique_id`).  
Si l'indice de l'agent possède cette augmentation via la table pivot :

```
GAIN = montant pivot  (montant de l'augmentation pour cet indice)
```

Sinon, le montant reste celui saisi manuellement ou issu du modèle.

> **Exception** : les lignes dont le libellé contient *"solde"* et *"indiciaire"* dans la section `augmentation` sont supprimées (doublon avec la ligne SMI de la section base).

---

## 5. Salaire Brut Social — Indicateur synthétique

Le **Salaire Brut Social** (SBS) n'est pas une ligne du bulletin, c'est un indicateur calculé affiché après la section AUGMENTATION. Il sert de base aux cotisations.

```
SBS = Σ GAIN(section base) + Σ GAIN(section augmentation)
```

Il est affiché visuellement dans le tableau après le sous-total des augmentations.

---

## 6. Section IPRESS — Cotisations retraite

### Base de calcul IPRESS

```
Base IPRESS = SBS − Indemnité Risques/Santé
```

> L'Indemnité Risques/Santé est identifiée automatiquement parmi les lignes : rubrique dont le libellé contient les mots **"risque"** ET **"santé"**.

### Calcul par ligne

```
Montant salarial  = ARRONDI( Base IPRESS × taux_salarial / 100 )
Montant patronal  = ARRONDI( Base IPRESS × taux_patronal / 100 )
```

> Si `Base IPRESS ≤ 0`, aucun calcul n'est effectué (montants = 0).

### Exemple (IPRES Régime Général)

| | Valeur |
|---|---|
| Taux salarial | 6 % |
| Taux patronal | 8,4 % |
| Base IPRESS | 300 000 FCFA |
| **Montant salarial** | **18 000 FCFA** |
| **Montant patronal** | **25 200 FCFA** |

---

## 7. Section IPM — Institution de Prévoyance Maladie

Les lignes IPM utilisent les **montants saisis directement** dans le modèle (`retenu_salarial` / `retenu_patronal`). Aucun calcul dynamique.

```
Montant salarial  = retenu_salarial  (valeur du modèle)
Montant patronal  = retenu_patronal  (valeur du modèle)
```

---

## 8. Section CSS — Caisse de Sécurité Sociale

### Base de calcul CSS

```
Base CSS = Salaire Brut Social (SBS)
```

> Contrairement à l'IPRESS, l'indemnité risques/santé **n'est pas déduite**.

### Calcul par ligne

```
Montant salarial  = ARRONDI( SBS × taux_salarial / 100 )
Montant patronal  = ARRONDI( SBS × taux_patronal / 100 )
```

### Sous-types CSS courants

| Rubrique | Taux salarial | Taux patronal |
|----------|:-------------:|:-------------:|
| CSS (cotisation principale) | 0 % | 8 % |
| CFCE (contribution forfaitaire) | 0 % | 3 % |

---

## 9. Section IR — Impôt sur le Revenu (IRPP)

### 9.1 Montant imposable

```
Montant Imposable = SBS − Indemnité Risques/Santé − Indemnité de Transport
```

> L'Indemnité de Transport est identifiée parmi les lignes dont le libellé contient le mot **"transport"**.

### 9.2 Tranche barème

```
Clé barème = ENTIER( Montant Imposable / 1 000 ) × 1 000
```

> Exemple : Montant Imposable = 347 823 FCFA → Clé = 347 000

### 9.3 Colonne barème selon Part IR

| Part IR (agent) | Colonne utilisée |
|:-:|---|
| 1 | `part_1` |
| 1,5 | `part_1_5` |
| 2 | `part_2` |
| 2,5 | `part_2_5` |
| 3 | `part_3` |
| 3,5 | `part_3_5` |
| 4 | `part_4` |
| 4,5 | `part_4_5` |
| 5 | `part_5` |

### 9.4 Résultat

```
Impôt sur le Revenu = bareme[Clé].part_X          (colonne choisie selon Part IR)
Base de calcul affiché = Montant Imposable
```

### 9.5 Cas limites

| Condition | Résultat |
|-----------|----------|
| `Montant Imposable ≤ 0` | IR = 0, TRIMF = 0 |
| `Montant Imposable > 5 000 000` | IR = 0, TRIMF = 0 (hors barème) |
| Part IR non reconnue (hors 1–5) | IR = 0, TRIMF = 0 |
| Clé absente du barème | IR = 0, TRIMF = 0 |

---

## 10. Section TRIMF — Taxe sur le Revenu Minimum Forfaitaire

Le TRIMF utilise **la même requête barème** que l'IR (même ligne, même clé).

```
TRIMF = ARRONDI( bareme[Clé].trimf_pers × Part TRIMF de l'agent )
```

> `Part TRIMF` est stockée sur la fiche agent (`part_trimf`). Défaut : 1.

### Exemple

| | Valeur |
|---|---|
| Clé barème | 200 000 |
| `trimf_pers` (barème) | 500 |
| Part TRIMF (agent) | 1 |
| **TRIMF** | **500 FCFA** |

---

## 11. Section RETENUE — Retenues Diverses

Les retenues utilisent le **montant saisi directement** dans le modèle de paie (`retenu_salarial`). Aucun taux, aucun calcul automatique.

```
Montant salarial = retenu_salarial  (valeur saisie dans le modèle)
Montant patronal = retenu_patronal  (valeur saisie dans le modèle, généralement 0)
GAIN             = 0  (une retenue n'est pas un gain)
```

> Ce montant **réduit le net à payer** (il est ajouté aux charges salariales).

---

## 12. Autres types personnalisés

Tout type créé dans le modèle de paie (ex : `prime`, `acompte`) suit la **règle par défaut** :

```
Montant salarial = retenu_salarial  (valeur du modèle)
Montant patronal = retenu_patronal  (valeur du modèle)
```

La section apparaît automatiquement dans le bulletin avec le nom du type en majuscules.

---

## 13. Calculs des Totaux

### 13.1 Tableau des formules

| Indicateur | Formule |
|------------|---------|
| **Brut Total** | `Σ GAIN de toutes les sections` |
| **Salaire de Base** | `Σ GAIN(section base)` |
| **Salaire Brut Social** | `Σ GAIN(base) + Σ GAIN(augmentation)` |
| **Base IPRESS** | `SBS − Indemnité Risques/Santé` |
| **Charges Salariales** | `Σ Montant salarial de toutes les sections` |
| **Charges Patronales** | `Σ Montant patronal de toutes les sections` |
| **Net Imposable** | `Brut Total − Charges Salariales` |
| **Salaire Référence** | `GAIN de la ligne "Solde Mensuelle"` |
| **Salaire Total (coût employeur)** | `Brut Total + Charges Patronales` |
| **NET À PAYER** | `Brut Total − Charges Salariales` |

> `Net Imposable` et `Net à Payer` ont la même formule ; ils peuvent diverger si des déductions non imposables sont ajoutées ultérieurement.

### 13.2 Contribution de chaque section aux charges salariales

| Section | Contribution à `Charges Salariales` |
|---------|--------------------------------------|
| `ipress` | `ARRONDI( Base IPRESS × taux_salarial / 100 )` |
| `css` | `ARRONDI( SBS × taux_salarial / 100 )` |
| `ir` | Montant IR issu du barème |
| `trimf` | `ARRONDI( trimf_pers × Part TRIMF )` |
| `ipm` | `retenu_salarial` du modèle |
| `retenue` | `retenu_salarial` du modèle |
| Autres | `retenu_salarial` du modèle |

---

## 14. Ordre de traitement (pipeline)

```
1. Chargement du modèle de paie (templateDetail.lines)
        ↓
2. Conversion template → lignes bulletin (templateLineToBulletinLigne)
        ↓
3. Application de l'indice agent (applyIndiceToLignes)
   - SMI ← solde_mensuelle
   - CSS_S & Ind. Résidence ← taux% × solde_mensuelle
   - Augmentations ← montant pivot indice
        ↓
4. Déduplication des libellés (displayLignes)
   - Suppression des "Solde Indiciaire" en section augmentation
        ↓
5. Phase 1 — Calcul des bruts (useMemo bruts)
   - brut, salaireBase, brSocial, indemRisquesSante, transport
        ↓
6. Appel API IRPP (useQuery irppData)
   → POST /api/employees/{id}/calcul-irpp
   → Paramètres : sal_brut_social, indem_risque_sante, transport
   → Retour : { trinf, impo_sur_revn, montant_irpp }
        ↓
7. Phase 2 — Calcul des totaux (useMemo totaux)
   - baseIPRES, retSal, retPat, netAPayer...
        ↓
8. Affichage du tableau (groupLignes + getSectionMeta)
        ↓
9. Sauvegarde (buildBulletin → BulletinDePaie)
```

---

## 15. Paramètres de l'agent influençant les calculs

| Champ agent | Utilisation | Défaut |
|-------------|-------------|--------|
| `part_ir` | Sélection de la colonne barème IR (1 à 5, pas 0,5) | 1 |
| `part_trimf` | Multiplicateur TRIMF | 1 |
| `payroll_template_id` | Modèle de paie appliqué | — |
| `indice_id` | Indice hiérarchique (solde mensuel + augmentations) | — |

---

## 16. Points d'attention

1. **Arrondi** : tous les montants de cotisations sont arrondis à l'entier le plus proche (`Math.round`).
2. **Barème IR** : le barème couvre 50 000 à 5 000 000 FCFA. En dehors de ces bornes, IR = TRIMF = 0.
3. **Indemnité Risques/Santé** : détectée par mots-clés ("risque" ET "santé") dans le libellé. Si le libellé ne correspond pas, elle n'est pas déduite de la base IPRESS.
4. **Indemnité de Transport** : détectée par mot-clé "transport" dans le libellé.
5. **TRIMF dans le modèle** : doit être de type `trimf` (pas `ir`). Un type `ir` n'affichera jamais le TRIMF.
6. **Lignes dupliquées** : le Solde Mensuel Indiciaire présent dans les augmentations est automatiquement supprimé pour éviter le double comptage.
