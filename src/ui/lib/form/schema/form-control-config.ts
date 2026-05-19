import { FormFieldType } from '.';
import { BaseInputFieldConfig } from './base-input-field-config';

export interface TextAreaConfig extends BaseInputFieldConfig {
  fieldType: FormFieldType.TEXT_AREA;
  rows?: number;
  /**
   * When true, render an inline copy button in the label row. 
   * Always visible
   */
  is_copyable?: boolean;
}

export interface ChipsConfig extends BaseInputFieldConfig {
  fieldType: FormFieldType.CHIPS;
}

export interface SelectConfig extends BaseInputFieldConfig {
  fieldType: FormFieldType.SELECT;
  optionList: string[];
}
