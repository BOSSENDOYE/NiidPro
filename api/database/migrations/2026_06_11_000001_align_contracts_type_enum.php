<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Aligne l'ENUM contracts.type sur l'ensemble attendu (ajout de DECRET et
     * DETACHEMENT, utilisés notamment dans la fonction publique). La table avait
     * été créée avant l'ajout de ces valeurs dans la migration d'origine.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE contracts MODIFY COLUMN type ENUM('CDI','CDD','DECRET','DETACHEMENT','Stage','Alternance','Prestation','Autre') NOT NULL DEFAULT 'CDI'");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE contracts MODIFY COLUMN type ENUM('CDI','CDD','Stage','Alternance','Prestation','Autre') NOT NULL DEFAULT 'CDI'");
        }
    }
};
