import { Button } from "@tremor/react";
import {
  ArrayHelpers,
  ErrorMessage,
  Field,
  FieldArray,
  useField,
  useFormikContext,
} from "formik";
import * as Yup from "yup";
import { FormBodyBuilder } from "./types";
import { DefaultDropdown, StringOrNumberOption } from "@/components/Dropdown";
import { FiInfo, FiPlus, FiX } from "react-icons/fi";
import { Tooltip } from "@/components/tooltip/Tooltip";
import { NewLabel } from "@/components/new/label";

export function SectionHeader({
  children,
}: {
  children: string | JSX.Element;
}) {
  return <div className="mb-4 font-bold text-lg">{children}</div>;
}

export function Label({ children }: { children: string | JSX.Element }) {
  return <div className="block font-medium text-base">{children}</div>;
}

export function SubLabel({ children }: { children: string | JSX.Element }) {
  return <div className="text-sm text-subtle mb-2">{children}</div>;
}

export function ManualErrorMessage({ children }: { children: string }) {
  return <div className="text-error text-sm">{children}</div>;
}

export function FurtherDetails({ text, link }: { text: string, link?: string }) {
  return (
    <>
      {
        link ? <a target="_blank" href={link} className=" underline cursor-pointer text-sm font-medium">{text}</a>
          :
          <div className="text-sm font-semibold"> {text} </div>
      }
    </>
  )
}

export function TextFormField({
  name,
  label,
  subtext,
  placeholder,
  onChange,
  type = "text",
  isTextArea = false,
  disabled = false,
  autoCompleteDisabled = true,
  error,
  defaultHeight,
  isCode = false,
  fontSize,
  hideError,
  tooltip,
  furtherText,
  furtherLink,
  smaller
}: {
  name: string;
  label: string;
  subtext?: string | JSX.Element;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  isTextArea?: boolean;
  disabled?: boolean;
  autoCompleteDisabled?: boolean;
  error?: string;
  defaultHeight?: string;
  isCode?: boolean;
  fontSize?: "text-sm" | "text-base" | "text-lg";
  hideError?: boolean;
  tooltip?: string
  furtherText?: string,
  furtherLink?: string,
  smaller?: boolean
}) {
  let heightString = defaultHeight || "";
  if (isTextArea && !heightString) {
    heightString = "h-28";
  }

  return (
    <div className="mb-6">
      <div className="flex gap-x-2 items-center">
        {!smaller ?
          <Label>{label}</Label>
          :
          <NewLabel>{label}</NewLabel>}
        {tooltip &&
          <Tooltip
            content={<p className="bg-black text-white">I can talk</p>}
            side="top"
            align="start"
          >
            <FiInfo size={12} />
          </Tooltip>
        }
        {error ? (
          <ManualErrorMessage>{error}</ManualErrorMessage>
        ) : (
          !hideError && (
            <ErrorMessage
              name={name}
              component="div"
              className="text-red-500 my-auto text-sm"
            />
          )
        )}
      </div>

      {subtext && <SubLabel>{subtext}</SubLabel>}
      <Field
        as={isTextArea ? "textarea" : "input"}
        type={type}
        name={name}
        id={name}
        className={`
          ${smaller && "text-sm"}
          border 
          border-border 
          rounded 
          w-full 
          py-2 
          px-3 
          mt-1
          ${heightString}
          ${fontSize}
          ${disabled ? " bg-background-strong" : " bg-background-emphasis"}
          ${isCode ? " font-mono" : ""}
        `}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoCompleteDisabled ? "off" : undefined}
        {...(onChange ? { onChange } : {})}
      />
      {furtherText && <FurtherDetails link={furtherLink} text={furtherText} />}
    </div>
  );
}

interface BooleanFormFieldProps {
  name: string;
  label: string;
  subtext?: string | JSX.Element;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  noPadding?: boolean;
  small?: boolean;
  alignTop?: boolean
}

export const BooleanFormField = ({
  name,
  label,
  subtext,
  onChange,
  noPadding,
  small,
  alignTop
}: BooleanFormFieldProps) => {
  return (
    <div className=" mb-4">
      <label className={`flex  text-sm`}>
        <Field
          name={name}
          type="checkbox"
          className={`${noPadding ? "mr-3" : "mx-3"}  px-5 w-3.5 h-3.5 ${alignTop ? "mt-1" : "my-auto"}`}
          {...(onChange ? { onChange } : {})}
        />
        <div>
          {small ? <NewLabel className="pt-0  mt-0">{label}</NewLabel> : <Label>{label}</Label>}
          {subtext && <SubLabel>{subtext}</SubLabel>}
        </div>
      </label>
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
};

interface TextArrayFieldProps<T extends Yup.AnyObject> {
  name: string;
  label: string | JSX.Element;
  values: T;
  subtext?: string | JSX.Element;
  type?: string;
}

export function TextArrayField<T extends Yup.AnyObject>({
  name,
  label,
  values,
  subtext,
  type,
}: TextArrayFieldProps<T>) {
  return (
    <div className="mb-4">
      <Label>{label}</Label>
      {subtext && <SubLabel>{subtext}</SubLabel>}

      <FieldArray
        name={name}
        render={(arrayHelpers: ArrayHelpers) => (
          <div>
            {values[name] &&
              values[name].length > 0 &&
              (values[name] as string[]).map((_, index) => (
                <div key={index} className="mt-2">
                  <div className="flex">
                    <Field
                      type={type}
                      name={`${name}.${index}`}
                      id={name}
                      className={`
                      border 
                      border-border 
                      bg-background 
                      rounded 
                      w-full 
                      py-2 
                      px-3 
                      mr-4
                      `}
                      // Disable autocomplete since the browser doesn't know how to handle an array of text fields
                      autoComplete="off"
                    />
                    <div className="my-auto">
                      <FiX
                        className="my-auto w-10 h-10 cursor-pointer hover:bg-hover rounded p-2"
                        onClick={() => arrayHelpers.remove(index)}
                      />
                    </div>
                  </div>
                  <ErrorMessage
                    name={`${name}.${index}`}
                    component="div"
                    className="text-error text-sm mt-1"
                  />
                </div>
              ))}

            <Button
              onClick={() => {
                arrayHelpers.push("");
              }}
              className="mt-3"
              color="green"
              size="xs"
              type="button"
              icon={FiPlus}
            >
              Add New
            </Button>
          </div>
        )}
      />
    </div>
  );
}

interface TextArrayFieldBuilderProps<T extends Yup.AnyObject> {
  name: string;
  label: string;
  subtext?: string | JSX.Element;
  type?: string;
}

export function TextArrayFieldBuilder<T extends Yup.AnyObject>(
  props: TextArrayFieldBuilderProps<T>
): FormBodyBuilder<T> {
  const _TextArrayField: FormBodyBuilder<T> = (values) => (
    <TextArrayField {...props} values={values} />
  );
  return _TextArrayField;
}

interface SelectorFormFieldProps {
  name: string;
  label?: string;
  options: StringOrNumberOption[];
  subtext?: string | JSX.Element;
  includeDefault?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  maxHeight?: string;
  onSelect?: (selected: string | number | null) => void;
  includeLogo?: boolean
  defaultValue?: string
}

export function SelectorFormField({
  name,
  label,
  options,
  subtext,
  includeDefault = false,
  side = "bottom",
  maxHeight,
  onSelect,
  includeLogo = false,
  defaultValue
}: SelectorFormFieldProps) {
  const [field] = useField<string>(name);
  const { setFieldValue } = useFormikContext();

  return (
    <div className="mb-2">
      {label && <Label>{label}</Label>}
      {subtext && <SubLabel>{subtext}</SubLabel>}

      <div className="mt-2">
        <DefaultDropdown
          options={options}
          selected={field.value}
          onSelect={onSelect || ((selected) => setFieldValue(name, selected))}
          includeDefault={includeDefault}
          side={side}
          maxHeight={maxHeight}
          defaultValue={defaultValue}
        />
      </div>


      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
}
