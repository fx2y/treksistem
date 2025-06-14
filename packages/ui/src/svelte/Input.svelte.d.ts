import { SvelteComponent } from "svelte";

export interface InputProps {
  type?: "text" | "email" | "password" | "tel" | "number";
  placeholder?: string;
  value?: string;
  error?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  class?: string;
}

declare const Input: new (options: {
  target: Element;
  props?: InputProps;
}) => SvelteComponent;

export default Input;
