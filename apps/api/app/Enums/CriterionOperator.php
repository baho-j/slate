<?php

namespace App\Enums;

enum CriterionOperator: string
{
    case Eq = 'eq';
    case Neq = 'neq';
    case Gt = 'gt';
    case Gte = 'gte';
    case Lt = 'lt';
    case Lte = 'lte';
    case In = 'in';
    case NotIn = 'not_in';
    case IncludesAny = 'includes_any';
    case IncludesAll = 'includes_all';
    case Exists = 'exists';

    /**
     * @return array<int, FieldType>
     */
    public function compatibleTypes(): array
    {
        return match ($this) {
            self::Gt, self::Gte, self::Lt, self::Lte => [FieldType::Number, FieldType::Date],
            self::IncludesAny, self::IncludesAll => [FieldType::Multiselect],
            self::In, self::NotIn => [FieldType::Select, FieldType::Multiselect, FieldType::Text, FieldType::Number],
            self::Eq, self::Neq => [FieldType::Number, FieldType::Boolean, FieldType::Select, FieldType::Text, FieldType::Date],
            self::Exists => FieldType::cases(),
        };
    }

    public function supports(FieldType $type): bool
    {
        return in_array($type, $this->compatibleTypes(), true);
    }
}
