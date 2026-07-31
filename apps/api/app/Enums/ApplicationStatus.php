<?php

namespace App\Enums;

enum ApplicationStatus: string
{
    case Applied = 'applied';
    case InReview = 'in_review';
    case Rejected = 'rejected';
    case Withdrawn = 'withdrawn';
    case Hired = 'hired';
}
