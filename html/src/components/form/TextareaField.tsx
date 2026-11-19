import React from 'react';
import { BaseInput, BaseInputProps } from './BaseInput';

// Props for TextareaField component
export type TextareaFieldProps = Omit<BaseInputProps, 'as' | 'type'>;

// Textarea field component that extends BaseInput
export const TextareaField: React.FC<TextareaFieldProps> = (props) => {
  return (
    <BaseInput
      {...props}
      as="textarea"
    />
  );
}; 