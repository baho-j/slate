<?php

namespace App\Enums;

enum Eligibility: string
{
    case Eligible = 'eligible';
    case Ineligible = 'ineligible';
    case Manual = 'manual';
}
