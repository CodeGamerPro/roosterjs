import { Editor } from 'roosterjs-editor-core';
import { editTableNode } from 'roosterjs-editor-dom';
import execFormatWithUndo from '../format/execFormatWithUndo';
import { TableOperation } from 'roosterjs-editor-types';

/**
 * The table format
 */
export interface TableFormat {
    /**
     * (Optional) The cellSpacing style for the HTML table element
     */
    cellSpacing?: string;

    /**
     * (Optional) The cellPadding style for the HTML table element
     */
    cellPadding?: string;

    /**
     * (Optional) The borderWidth style for the HTML table element
     */
    borderWidth?: string;

    /**
     * (Optional) The borderStyle style for the HTML table element
     */
    borderStyle?: string;

    /**
     * (Optional) The borderColor style for the HTML table element
     */
    borderColor?: string;

    /**
     * (Optional) The borderCollapse style for the HTML table element
     */
    borderCollapse?: string;
}

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
    format?: TableFormat
) {
    let document = editor.getDocument();
    let fragment = document.createDocumentFragment();
    let table = document.createElement('table') as HTMLTableElement;
    fragment.appendChild(table);
    table.cellSpacing = (format && format.cellSpacing) || '0';
    table.cellPadding = (format && format.cellPadding) || '1';
    for (let i = 0; i < rows; i++) {
        let tr = document.createElement('tr') as HTMLTableRowElement;
        table.appendChild(tr);
        for (let j = 0; j < columns; j++) {
            let td = document.createElement('td') as HTMLTableCellElement;
            tr.appendChild(td);
            td.appendChild(document.createElement('br'));
            if (format) {
                buildBorderStyle(td, format);
            }
            td.style.width = getTableCellWidth(columns);
        }
    }

    execFormatWithUndo(editor, () => {
        editor.insertNode(fragment);
        if (!format) {
            editTableNode(TableOperation.StyleDefault, table);
        }
    });
}

function buildBorderStyle(node: HTMLElement, format: TableFormat) {
    format = format || {};
    node.style.borderWidth = format.borderWidth || '1px';
    node.style.borderStyle = format.borderStyle || 'solid';
    node.style.borderColor = format.borderColor || '#c6c6c6';
    node.style.borderCollapse = format.borderCollapse || 'collapse';
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
