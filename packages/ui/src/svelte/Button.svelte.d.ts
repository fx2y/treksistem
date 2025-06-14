import { SvelteComponent } from "svelte";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  class?: string;
}

declare const Button: new (options: {
  target: Element;
  props?: ButtonProps;
}) => SvelteComponent;

export default Button;
