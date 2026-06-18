<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class SettingsController extends Controller
{
    /** Paramètres publics de l'entreprise (utilisés notamment par la page de connexion). */
    public function index()
    {
        return response()->json($this->format(CompanySetting::current()));
    }

    /** Mise à jour des informations de l'entreprise (+ logo). */
    public function update(Request $request)
    {
        $data = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'legal_name'    => ['nullable', 'string', 'max:255'],
            'email'         => ['nullable', 'email', 'max:255'],
            'phone'         => ['nullable', 'string', 'max:50'],
            'website'       => ['nullable', 'string', 'max:255'],
            'address'       => ['nullable', 'string', 'max:1000'],
            'city'          => ['nullable', 'string', 'max:255'],
            'country'       => ['nullable', 'string', 'max:255'],
            'latitude'      => ['nullable', 'numeric', 'between:-90,90'],
            'longitude'     => ['nullable', 'numeric', 'between:-180,180'],
            'pointage_radius' => ['nullable', 'integer', 'min:10', 'max:50000'],
            'rccm'          => ['nullable', 'string', 'max:255'],
            'ninea'         => ['nullable', 'string', 'max:255'],
            'primary_color' => ['nullable', 'string', 'max:20'],
            'description'   => ['nullable', 'string', 'max:2000'],
            'logo'          => ['nullable', 'image', 'max:4096'], // 4 Mo
        ]);

        $settings = CompanySetting::current();

        if ($request->hasFile('logo')) {
            // Supprime l'ancien logo
            if ($settings->logo_path && Storage::disk('public')->exists($settings->logo_path)) {
                Storage::disk('public')->delete($settings->logo_path);
            }
            $data['logo_path'] = $request->file('logo')->store('company', 'public');
        }

        unset($data['logo']);
        $settings->update($data);

        return response()->json($this->format($settings->fresh()));
    }

    /** Supprime le logo de l'entreprise. */
    public function deleteLogo()
    {
        $settings = CompanySetting::current();
        if ($settings->logo_path && Storage::disk('public')->exists($settings->logo_path)) {
            Storage::disk('public')->delete($settings->logo_path);
        }
        $settings->update(['logo_path' => null]);

        return response()->json($this->format($settings->fresh()));
    }

    private function format(CompanySetting $s): array
    {
        return [
            'name'          => $s->name,
            'legal_name'    => $s->legal_name,
            'logo_url'      => $s->logo_path ? Storage::disk('public')->url($s->logo_path) : null,
            'email'         => $s->email,
            'phone'         => $s->phone,
            'website'       => $s->website,
            'address'       => $s->address,
            'city'          => $s->city,
            'country'       => $s->country,
            'latitude'      => $s->latitude !== null ? (float) $s->latitude : null,
            'longitude'     => $s->longitude !== null ? (float) $s->longitude : null,
            'pointage_radius' => $s->pointage_radius !== null ? (int) $s->pointage_radius : 200,
            'rccm'          => $s->rccm,
            'ninea'         => $s->ninea,
            'primary_color' => $s->primary_color,
            'description'   => $s->description,
            // Conservé pour compatibilité avec l'existant
            'company_name'  => $s->name,
        ];
    }
}
