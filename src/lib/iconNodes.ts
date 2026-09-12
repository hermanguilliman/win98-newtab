/**
 * Bookmark node → rendered icon element binding.
 *
 * Data never lives on the DOM element (no expando props): icons and folder
 * items carry their node through this WeakMap, so a WeakMap lookup is the
 * only way to reach the model from an element. GC-friendly: keys are the
 * elements themselves.
 */
import type { BookmarkNode } from "./bookmarks";

const iconNodes = new WeakMap<Element, BookmarkNode>();

/** Attach the bookmark node to a rendered icon element. */
export function setNodeForIcon(
    el: Element | null | undefined,
    node: BookmarkNode,
): void {
    if (el) iconNodes.set(el, node);
}

/** Node attached to an icon element, or undefined if the element isn't an icon. */
export function getNodeForIcon(
    el: Element | null | undefined,
): BookmarkNode | undefined {
    return (el && iconNodes.get(el)) || undefined;
}