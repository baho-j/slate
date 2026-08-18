<?php

namespace App\Http\Requests\Users;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->target());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->target()->id)],
            'role' => ['sometimes', Rule::enum(UserRole::class)->only(UserRole::assignable())],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            // Reject any field we don't accept — notably organization_id, so an attempt to
            // move a user into another org fails loudly instead of being silently dropped.
            foreach (array_diff(array_keys($this->all()), array_keys($this->rules())) as $unknown) {
                $validator->errors()->add($unknown, 'This field cannot be changed.');
            }

            $target = $this->target();
            $newRole = $this->enum('role', UserRole::class);

            // Demoting the org's last hr_manager away from hr_manager would lock the org
            // out of user management. Refuse it.
            if ($newRole !== null
                && $target->role === UserRole::HrManager
                && $newRole !== UserRole::HrManager
                && $this->isLastHrManager($target)) {
                $validator->errors()->add('role', 'This is the last HR manager; assign another before changing this one.');
            }
        });
    }

    public function target(): User
    {
        /** @var User $user */
        $user = $this->route('user');

        return $user;
    }

    private function isLastHrManager(User $target): bool
    {
        return User::query()
            ->where('organization_id', $target->organization_id)
            ->where('role', UserRole::HrManager)
            ->where('id', '!=', $target->id)
            ->doesntExist();
    }
}
