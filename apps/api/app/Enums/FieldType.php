<?php

namespace App\Enums;

enum FieldType: string
{
    case Text = 'text';
    case Number = 'number';
    case Boolean = 'boolean';
    case Select = 'select';
    case Multiselect = 'multiselect';
    case File = 'file';
    case Date = 'date';

    public function hasOptions(): bool
    {
        return in_array($this, [self::Select, self::Multiselect], true);
    }

    public function isEvaluable(): bool
    {
        return in_array($this, [self::Number, self::Boolean, self::Select, self::Multiselect, self::Date], true);
    }
}
