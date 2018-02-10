import execFormatWithUndo from '../format/execFormatWithUndo';
import getNodeAtCursor from '../cursor/getNodeAtCursor';
import { Editor } from 'roosterjs-editor-core';
import { TableOperation } from 'roosterjs-editor-types';
import { editTableNode } from 'roosterjs-editor-dom';

/**
 * Edit table with given operation. If there is no table at cursor then no op.
 * @param editor The editor instance
 * @param operation Table operation
 */
export default function editTable(editor: Editor, operation: TableOperation) {
    let td = getNodeAtCursor(editor, 'TD') as HTMLTableCellElement;
    if (td) {
        execFormatWithUndo(editor, () => {
            let fallbackTd = editTableNode(operation, td);
            td = editor.contains(td) ? td : fallbackTd;
            editor.focus();
            return td;
        }, true /*preserveSelection*/);
    }
}
