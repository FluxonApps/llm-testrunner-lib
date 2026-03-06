import {
  InputFieldValidation,
  BaseInputFieldConfig,
} from './base-input-field-config';
import {
  ChipsConfig,
  TextAreaConfig,
  SelectConfig,
} from './form-control-config';

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
  FormFieldType,
};
