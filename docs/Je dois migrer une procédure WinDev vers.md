Je dois migrer une procédure WinDev vers Laravel + React (TypeScript).

## Contexte
C'est la fonctionnalité de gestion de paie. Quand l'utilisateur sélectionne 
un agent depuis une liste déroulante (select/dropdown), il faut :
1. Charger les données de l'agent dans les champs du formulaire
2. Récupérer les heures supplémentaires et les heures de coupure de l'agent
3. Vérifier qu'un modèle de paie existe, sinon rediriger vers la fiche agent
4. Déclencher le calcul de la paie

## Procédure WinDev originale (référence)
La procédure `wf_list_select()` était déclenchée lors du clic sur une ligne 
du TABLE_Agent. Dans la nouvelle version, ce déclencheur est remplacé par 
le onChange d'un composant Select (liste déroulante d'agents).

## Ce dont j'ai besoin

### Backend — Laravel
Tu connais déjà la structure des endpoints et des controllers existants.
Ajoute les méthodes nécessaires dans AgentController pour :
- Retourner les données complètes d'un agent (salaire_base, sursalaire,
  type_model_id avec son libellé, Part_TRIMF, Part_Sociale, categorie_agent,
  Prime_de_sujétion, rapel_avancement, indice_code, mld_solde)
- Retourner les heures supplémentaires : { nbr_heure_sup, montant_heure_sup }
  en fonction de l'agent, du mois et de l'année
- Retourner les heures de coupure : { nbr_heure_coupure }
  en fonction de l'agent, du mois et de l'année

---

### Frontend — React + TypeScript

**Hook : useAgentSelection**
Déclenché par le onChange du composant Select agents.
La valeur sélectionnée contient l'id_agent.
Étapes :
1. Appeler l'endpoint agent → alimenter les champs du formulaire
2. Appeler l'endpoint heures supplémentaires → setter nbrHeureSup, montantHeureSup
3. Appeler l'endpoint heures de coupure → setter nbrHeureCoupure
4. Si agent.type_model_id est null ou libellé vide :
   - Afficher une boîte de confirmation :
     "Absence du modèle de Paie dans la fiche agent — voulez-vous le configurer ?"
   - Si oui → naviguer vers /agents/{id}/edit
   - Si non → réinitialiser le formulaire
5. Si modèle présent :
   - Appeler wfCategorieAgent(categorie_agent) pour charger les champs 
     spécifiques à la catégorie
   - Déclencher le calcul de paie (appeler calculatePay())

**Interfaces TypeScript à créer :**
- Agent (tous les champs ci-dessus)
- HeuresSupplementaires
- HeuresCoupure

**Champs du state formulaire à mettre à jour :**
edtAgent, edtMatricule, edtSBase, edtSursalaire, comboModele, edtAgentId,
partTrimf, partIr, categAg, edtIPrimeSujection, edtRapelAvancement,
edtIndice, edtNbrHeureSup, edtHeureSupp, edtHeureNonTravaille

---

## Contraintes
- Ne pas créer de nouveaux fichiers inutilement — étendre les fichiers existants
- Tous les montants sont en FCFA (entiers, pas de décimales)
- mois est une chaîne numérique (01–12), annee est une année sur 4 chiffres
- Respecter les patterns déjà en place dans le projet
- Le composant Select est déjà en place, juste brancher le onChange