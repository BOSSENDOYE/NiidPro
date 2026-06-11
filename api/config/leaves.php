<?php

return [

    /*
    |--------------------------------------------------------------------------
    |  Jours ouvrables (Art. L.147 du Code du travail)
    |--------------------------------------------------------------------------
    |
    |  Sont exclus du décompte des congés :
    |   - le dimanche (repos hebdomadaire obligatoire, art. L.147) ;
    |   - les jours fériés légaux (Loi n° 74-52 du 4 novembre 1974).
    |
    |  Les samedis sont en principe comptabilisés comme jours ouvrables,
    |  SAUF disposition contraire du règlement intérieur de l'ANASER.
    |  Mettre à false pour exclure les samedis du décompte.
    |
    */
    'samedi_ouvrable' => env('LEAVES_SAMEDI_OUVRABLE', true),

    /*
    |--------------------------------------------------------------------------
    |  Majoration pour mères de famille (Art. L.148)
    |--------------------------------------------------------------------------
    |
    |  Un (1) jour de congé supplémentaire par an pour chaque enfant de moins
    |  de l'âge limite, enregistré à l'état civil.
    |
    */
    'mere_famille_age_max'        => env('LEAVES_MERE_AGE_MAX', 14), // < 14 ans
    'mere_famille_jours_enfant'   => env('LEAVES_MERE_JOURS_ENFANT', 1), // +1 j / enfant

];
