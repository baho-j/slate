<?php

namespace App\Enums;

enum IneligibleHandling: string
{
    case Flag = 'flag';
    case Reject = 'reject';
}
