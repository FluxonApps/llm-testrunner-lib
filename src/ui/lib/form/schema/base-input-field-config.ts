import { FormFieldType } from '.';

/**
 * - minLength / maxLength: character limits
 * - min / max: numeric or date boundaries
 * - step: allowed increment between numeric values (e.g., 0.5 → 0, 0.5, 1.0...)
 * - custom: custom validator returning error message or null
 */
export interface InputFieldValidation {
  required?: boolean | string;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp | string;
  min?: number | string | Date;
  max?: number | string | Date;
  step?: number;
  custom?: (value: any, allValues?: Record<string, any>) => string | null;
}

/**
 * - helpText:Field Support text
 */
export interface BaseInputFieldConfig {
  name: string;
  fieldType: FormFieldType;
  type?: string;
  label?: string;
  placeholder?: string;
  defaultValue?: any;
  autocomplete?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  helpText?: string;
  validation?: InputFieldValidation;
  hidden?: boolean;
  className?: string;
  style?: Record<string, any>;
}
