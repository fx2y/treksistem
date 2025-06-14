import { SvelteComponent } from "svelte";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "blue" | "gray" | "white";
  class?: string;
}

declare const Spinner: new (options: {
  target: Element;
  props?: SpinnerProps;
}) => SvelteComponent;

export default Spinner;
