import execFormatWithUndo from '../format/execFormatWithUndo';
import { Editor } from 'roosterjs-editor-core';
import { formatTable, TableFormatName } from 'roosterjs-editor-dom';

/**
 * Insert table into editor at current selection
 * @param editor The editor instance
 * @param columns Number of columns in table, it also controls the default table cell width:
 * if columns <= 4, width = 120px; if columns <= 6, width = 100px; else width = 70px
 * @param rows Number of rows in table
 * @param format (Optional) The table format. If not passed, the default format will be applied:
 * cellSpacing = '0', cellPadding = '0', borderWidth = '1px', borderStyle = 'solid', borderColor = '#c6c6c6',
 * borderCollapse = 'collapse'
 */
export default function insertTable(
    editor: Editor,
    columns: number,
    rows: number,
    format: TableFormatName = 'Default'
) {
    let document = editor.getDocument();
    let fragment = document.createDocumentFragment();
    let table = document.createElement('table') as HTMLTableElement;
    fragment.appendChild(table);
    table.cellSpacing = '0';
    table.cellPadding = '1';
    for (let i = 0; i < rows; i++) {
        let tr = document.createElement('tr') as HTMLTableRowElement;
        table.appendChild(tr);
        for (let j = 0; j < columns; j++) {
            let td = document.createElement('td') as HTMLTableCellElement;
            tr.appendChild(td);
            td.appendChild(document.createElement('br'));
            td.style.width = getTableCellWidth(columns);
        }
    }

    execFormatWithUndo(editor, () => {
        editor.insertNode(fragment);
        formatTable(table, format);
    });
}

function getTableCellWidth(columns: number): string {
    if (columns <= 4) {
        return '120px';
    } else if (columns <= 6) {
        return '100px';
    } else {
        return '70px';
    }
}
