import { Editor, cacheGetEventData } from 'roosterjs-editor-core';
import { NodeType, PluginEvent } from 'roosterjs-editor-types';

/**
 * Get the node at selection
 * if editor has focus, use selection.focusNode
 * if for some reason, the focus node does not get us a good node
 * fallback to the cached selection range if there is any
 * and use the start container if selection is collapsed or commonAncestorContainer otherwise.
 * If an expectedTag is specified, the return value will be the nearest ancestor of current node
 * which matches the tag name, or null if no match found in editor.
 * @param editor The editor instance
 * @param expectedTag The expected tag name. If null, return the element at cursor
 * @param startNode If specified, use this node as start node to search instead of current node
 * @returns The element at cursor or the nearest ancestor with the tag name is specified
 */
export default function getNodeAtCursor(editor: Editor, expectedTag?: string, startNode?: Node): Element {
    let node = startNode;
    if (!node && editor.hasFocus()) {
        let sel = editor.getSelection();
        node = sel ? sel.focusNode : null;
    }

    if (!node) {
        let selectionRange = editor.getSelectionRange();
        if (selectionRange) {
            node = selectionRange.collapsed
                ? selectionRange.startContainer
                : selectionRange.commonAncestorContainer;
        }
    }

    let element = node && node.nodeType == NodeType.Text ? node.parentElement : <Element>node;
    if (expectedTag) {
        while (editor.contains(element)) {
            if (element.tagName == expectedTag.toUpperCase()) {
                return element;
            }
            element = element.parentElement;
        }
    }
    return editor.contains(element) ? element : null;
}

/**
 * Get the node at selection from event cache if it exists, otherwise get from DOM
 * if editor has focus, use selection.focusNode
 * if for some reason, the focus node does not get us a good node
 * fallback to the cached selection range if there is any
 * and use the start container if selection is collapsed or commonAncestorContainer otherwise.
 * If an expectedTag is specified, the return value will be the nearest ancestor of current node
 * which matches the tag name, or null if no match found in editor.
 * @param editor The editor instance
 * @param event Event object to get cached object from
 * @param expectedTag The expected tag name. If null, return the element at cursor
 * @returns The element at cursor or the nearest ancestor with the tag name is specified
 */
export function cacheGetNodeAtCursor(editor: Editor, event: PluginEvent, expectedTag: string): Element {
    return cacheGetEventData(event, 'GET_NODE_AT_CURSOR_' + expectedTag, () => getNodeAtCursor(editor, expectedTag));
}

/**
 * @deprecated Use cacheGetNodeAtCursor instead
 */
export function cacheGetListElement(editor: Editor, event?: PluginEvent): Element {
    return cacheGetNodeAtCursor(editor, event, 'LI');
}
