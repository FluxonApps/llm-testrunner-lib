import {
  InputFieldValidation,
  BaseInputFieldConfig,
} from './base-input-field-config';
import {
  ChipsConfig,
  TextAreaConfig,
  SelectConfig,
} from './form-control-config';

type FieldConfig = TextAreaConfig | ChipsConfig | SelectConfig;

enum FormFieldType {
  TEXT_AREA = 'textarea',
  CHIPS = 'chips',
  SELECT = 'select',
}

export {
  InputFieldValidation,
  BaseInputFieldConfig,
  TextAreaConfig,
  ChipsConfig,
  SelectConfig,
  FieldConfig,
  FormFieldType,
};
