<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change ENUM to VARCHAR on document_templates
        DB::statement("ALTER TABLE document_templates MODIFY COLUMN type VARCHAR(50) NOT NULL");

        // Change ENUM to VARCHAR on generated_documents
        DB::statement("ALTER TABLE generated_documents MODIFY COLUMN type VARCHAR(50) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE document_templates MODIFY COLUMN type ENUM('attestation','note_service') NOT NULL");
        DB::statement("ALTER TABLE generated_documents MODIFY COLUMN type ENUM('attestation','note_service') NOT NULL");
    }
};
