import { Component, h, Prop } from '@stencil/core';

import {
  ChipsConfig,
  FieldConfig,
  FormFieldType,
  SelectConfig,
  TextAreaConfig,
} from './schema';
import { TestCase } from '../../types/llm-test-runner';

@Component({
  tag: 'form-builder',
  shadow: true,
})
export class FormBuilder {
  @Prop() fields: FieldConfig[] = [];
  @Prop() onUpdateApproach: (testCase: TestCase, approach: any) => void;
  @Prop() testCase: TestCase;
  @Prop() handleTestCaseChange: (
    e: CustomEvent<{ testCaseId: string; key: string; value: string }>,
  ) => void;
  @Prop() addChip: (
    e: CustomEvent<{ testCaseId: string; key: string; value: string }>,
  ) => void;
  @Prop() removeChip: (
    e: CustomEvent<{ testCaseId: string; key: string; index: number }>,
  ) => void;

  renderField(field: FieldConfig) {
    switch (field.fieldType) {
      case FormFieldType.TEXT_AREA:
        return (
          <app-textarea
            config={field as TextAreaConfig}
            value={this.testCase[field.name]}
            testCaseId={this.testCase.id}
            onValueChange={this.handleTestCaseChange}
          ></app-textarea>
        );

      case FormFieldType.CHIPS:
        return (
          <app-chips
            config={field as ChipsConfig}
            value={this.testCase[field.name]}
            testCaseId={this.testCase.id}
            onAddChip={this.addChip}
            onRemoveChip={this.removeChip}
          />
        );

      case FormFieldType.SELECT:
        return (
          <app-select
            config={field as SelectConfig}
            value={this.testCase.evaluationParameters?.approach}
            onChange={approach =>
              this.onUpdateApproach(this.testCase, approach)
            }
          />
        );

      default:
        return <div>Unknown field type</div>;
    }
  }

  render() {
    return (
      <div class="form-builder">
        {this.fields.map(field => this.renderField(field))}
      </div>
    );
  }
}
