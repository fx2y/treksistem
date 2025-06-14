import { SvelteComponent } from "svelte";

export interface ModalProps {
  open: boolean;
  title?: string;
  size?: "sm" | "md" | "lg" | "xl";
  closable?: boolean;
  class?: string;
}

declare const Modal: new (options: {
  target: Element;
  props?: ModalProps;
}) => SvelteComponent;

export default Modal;
