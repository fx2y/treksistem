import { SvelteComponent } from "svelte";

export interface CardProps {
  title?: string;
  subtitle?: string;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
  class?: string;
}

declare const Card: new (options: {
  target: Element;
  props?: CardProps;
}) => SvelteComponent;

export default Card;
