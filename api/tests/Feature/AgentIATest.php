<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\IAAuditLog;
use App\Models\IAConversation;
use App\Models\IAMessage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AgentIATest extends TestCase
{
    use RefreshDatabase;

    private function mockAnthropicTextResponse(string $text): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::response([
                'id'         => 'msg_test',
                'type'       => 'message',
                'role'       => 'assistant',
                'stop_reason' => 'end_turn',
                'content'    => [['type' => 'text', 'text' => $text]],
                'usage'      => ['input_tokens' => 10, 'output_tokens' => 20],
            ], 200),
        ]);
    }

    private function mockAnthropicToolThenText(string $toolName, array $toolInput, string $finalText): void
    {
        Http::fake([
            'api.anthropic.com/*' => Http::sequence()
                ->push([
                    'id'          => 'msg_1',
                    'type'        => 'message',
                    'role'        => 'assistant',
                    'stop_reason' => 'tool_use',
                    'content'     => [[
                        'type'  => 'tool_use',
                        'id'    => 'tu_123',
                        'name'  => $toolName,
                        'input' => $toolInput,
                    ]],
                    'usage' => ['input_tokens' => 10, 'output_tokens' => 5],
                ], 200)
                ->push([
                    'id'          => 'msg_2',
                    'type'        => 'message',
                    'role'        => 'assistant',
                    'stop_reason' => 'end_turn',
                    'content'     => [['type' => 'text', 'text' => $finalText]],
                    'usage'       => ['input_tokens' => 30, 'output_tokens' => 20],
                ], 200),
        ]);
    }

    private function createUserWithRole(string $role): User
    {
        Role::firstOrCreate(['name' => $role, 'guard_name' => 'web']);
        $user = User::factory()->create();
        $user->assignRole($role);
        return $user;
    }

    private function seedAssistantConfig(): void
    {
        \App\Models\AssistantConfig::firstOrCreate([], [
            'provider'    => 'claude',
            'api_key'     => encrypt('sk-ant-test-key'),
            'model'       => 'claude-sonnet-5',
            'is_active'   => true,
            'max_tokens'  => 1024,
            'temperature' => 0.7,
        ]);
    }

    // ── Test 1 : réponse simple sans outil ───────────────────────────────────

    public function test_chat_returns_reply_for_authenticated_user(): void
    {
        $this->seedAssistantConfig();
        $this->mockAnthropicTextResponse('Bonjour, comment puis-je vous aider ?');

        $user = $this->createUserWithRole('admin_rh');

        $response = $this->actingAs($user, 'sanctum')
            ->postJson('/api/ia/chat', ['message' => 'Bonjour']);

        $response->assertOk()->assertJsonStructure(['reply']);
        $this->assertNotEmpty($response->json('reply'));
    }

    // ── Test 2 : conversation persistée ─────────────────────────────────────

    public function test_conversation_and_messages_are_persisted(): void
    {
        $this->seedAssistantConfig();
        $this->mockAnthropicTextResponse('Voici votre solde.');

        $user = $this->createUserWithRole('admin_rh');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/ia/chat', ['message' => 'Quel est mon solde ?'])
            ->assertOk();

        $this->assertDatabaseHas('ia_conversations', ['user_id' => $user->id]);
        $this->assertDatabaseHas('ia_messages', ['role' => 'user',      'content' => 'Quel est mon solde ?']);
        $this->assertDatabaseHas('ia_messages', ['role' => 'assistant', 'content' => 'Voici votre solde.']);
    }

    // ── Test 3 : appel d'outil → ligne dans ia_audit_logs ───────────────────

    public function test_tool_call_creates_audit_log_entry(): void
    {
        $this->seedAssistantConfig();

        // Créer un employé dans le même département que le manager
        $manager  = $this->createUserWithRole('manager');
        $employee = Employee::factory()->create([
            'department_id'   => $manager->department_id ?? 1,
            'nbre_jour_conge' => 25,
            'nbre_jour_restant' => 18,
            'annual_leave_days' => 25,
            'status'          => 'active',
        ]);

        $this->mockAnthropicToolThenText(
            'get_solde_conges',
            ['employee_number' => $employee->employee_number],
            'Le solde de congés est de 18 jours.',
        );

        $this->actingAs($manager, 'sanctum')
            ->postJson('/api/ia/chat', ['message' => 'Quel est le solde de ' . $employee->first_name . ' ?'])
            ->assertOk();

        $this->assertDatabaseHas('ia_audit_logs', [
            'user_id'   => $manager->id,
            'tool_name' => 'get_solde_conges',
        ]);
    }

    // ── Test 4 : un employe ne voit que ses propres données ─────────────────

    public function test_employe_cannot_see_other_employee_conges(): void
    {
        $this->seedAssistantConfig();

        $employe = $this->createUserWithRole('employe');
        $other   = Employee::factory()->create(['status' => 'active']);

        $this->mockAnthropicToolThenText(
            'get_solde_conges',
            ['employee_number' => $other->employee_number],
            'Accès refusé.',
        );

        $response = $this->actingAs($employe, 'sanctum')
            ->postJson('/api/ia/chat', ['message' => 'Solde de ' . $other->employee_number]);

        $response->assertOk();

        // L'audit est créé mais le résultat contient une erreur d'accès
        $log = IAAuditLog::where('user_id', $employe->id)->where('tool_name', 'get_solde_conges')->first();
        if ($log) {
            $output = json_decode($log->output_summary, true);
            $this->assertArrayHasKey('error', $output);
        }
    }

    // ── Test 5 : utilisateur non authentifié → 401 ──────────────────────────

    public function test_unauthenticated_user_is_rejected(): void
    {
        $this->postJson('/api/ia/chat', ['message' => 'Bonjour'])
            ->assertUnauthorized();
    }

    // ── Test 6 : message trop long → 422 ────────────────────────────────────

    public function test_message_exceeding_max_length_is_rejected(): void
    {
        $user = $this->createUserWithRole('admin_rh');

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/ia/chat', ['message' => str_repeat('a', 1001)])
            ->assertUnprocessable();
    }
}
