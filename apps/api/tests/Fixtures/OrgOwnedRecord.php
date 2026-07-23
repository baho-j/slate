<?php

namespace Tests\Fixtures;

use App\Models\Concerns\HasOrganization;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;

#[Fillable(['name', 'organization_id'])]
class OrgOwnedRecord extends Model
{
    use HasOrganization;

    protected $table = 'org_owned_records';
}
