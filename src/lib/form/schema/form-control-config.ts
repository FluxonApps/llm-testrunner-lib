import { FormFieldType } from '.';
import { BaseInputFieldConfig } from './base-input-field-config';

export interface TextAreaConfig extends BaseInputFieldConfig {
  fieldType: FormFieldType.TEXT_AREA;
  rows?: number;
}

export interface ChipsConfig extends BaseInputFieldConfig {
  fieldType: FormFieldType.CHIPS;
}

export interface SelectConfig extends BaseInputFieldConfig {
  fieldType: FormFieldType.SELECT;
  optionList: any[];
}
