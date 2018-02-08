import execFormatWithUndo from '../format/execFormatWithUndo';
import getNodeAtCursor from '../cursor/getNodeAtCursor';
import { Editor } from 'roosterjs-editor-core';
import { TableOperation } from "roosterjs-editor-types";

/**
 * Edit table with given operation. If there is no table at cursor then no op.
 * @param editor The editor instance
 * @param operation Table operation
 */
export default function editTable(editor: Editor, operation: TableOperation) {
    let td = getNodeAtCursor(editor, 'TD') as HTMLTableCellElement;
    let table = getNodeAtCursor(editor, 'TABLE', td) as HTMLTableElement;
    if (table && td) {
        let virtualTable = createVirtualTable(table, td);
        execFormatWithUndo(editor, () => {
            if (internalEditTable(virtualTable, operation)) {
                let resultTable = writeBack(virtualTable);
                if (!resultTable) {
                    editor.deleteNode(table);
                    td = null;
                } else {
                    td = editor.contains(td) ? td : getCurrentTd(virtualTable);
                }
            }
            return td;
        }, true /*preserveSelection*/);
    }
    editor.focus();
}

interface VirtualTableCell {
    td: HTMLTableCellElement;
    spanLeft: boolean;
    spanAbove: boolean;
}

interface VirtualTableRow {
    cells: VirtualTableCell[];
    tr: HTMLTableRowElement;
}

interface VirtualTable {
    rows: VirtualTableRow[];
    table: HTMLTableElement;
    row: number;
    col: number;
}

// Create virtual table from HTML table
function createVirtualTable(table: HTMLTableElement, currentTd: HTMLTableCellElement): VirtualTable {
    // 1. Create empty v-table
    let vtable = {
        table: table,
        rows: <VirtualTableRow[]>[],
        row: 0,
        col: 0,
    };

    // 2. Create empty rows
    for (let row = 0; row < table.rows.length; row++) {
        vtable.rows.push({
            cells: <VirtualTableCell[]>[],
            tr: table.rows[row],
        });
    }

    // 3. Fill the cells to each row
    for (let row = 0; row < table.rows.length; row++) {
        let tr = table.rows[row];
        for (let sourceColumn = 0, targetColumn = 0; sourceColumn < tr.cells.length; sourceColumn++) {
            // Skip the cells which already initialized
            for (; vtable.rows[row].cells[targetColumn]; targetColumn++) {}

            let td = tr.cells[sourceColumn];
            if (td == currentTd) {
                vtable.col = targetColumn;
                vtable.row = row;
            }

            for (let colSpan = 0; colSpan < td.colSpan; colSpan++, targetColumn++) {
                for (let rowSpan = 0; rowSpan < td.rowSpan; rowSpan++) {
                    vtable.rows[row + rowSpan].cells[targetColumn] = {
                        td: colSpan + rowSpan == 0 ? td : null,
                        spanLeft: colSpan > 0,
                        spanAbove: rowSpan > 0,
                    };
                }
            }
        }
    }

    return vtable;
}

function internalEditTable(
    vtable: VirtualTable,
    operation: TableOperation
): boolean {
    let currentRow = vtable.rows[vtable.row];
    let currentCell = currentRow.cells[vtable.col];
    switch (operation) {
        case TableOperation.InsertAbove:
        case TableOperation.InsertBelow:
            let newRow: VirtualTableRow = {
                cells: [],
                tr: cloneNode(currentRow.tr),
            };

            for (let cell of currentRow.cells) {
                newRow.cells.push(cloneCell(cell));
            }

            vtable.rows.splice(vtable.row + (operation == TableOperation.InsertAbove ? 0 : 1), 0, newRow);
            return true;

        case TableOperation.InsertLeft:
        case TableOperation.InsertRight:
            for (let i = 0; i < vtable.rows.length; i++) {
                let cell = getCell(vtable, i, vtable.col);
                vtable.rows[i].cells.splice(vtable.col + (operation == TableOperation.InsertLeft ? 0 : 1), 0, cloneCell(cell));
            }
            return true;

        case TableOperation.DeleteRow:
            for (let i = 0; i < currentRow.cells.length; i++) {
                let cell = currentRow.cells[i];
                let nextCell = getCell(vtable, vtable.row + 1, i);
                if (cell.td && cell.td.rowSpan > 1 && nextCell.spanAbove) {
                    nextCell.td = cell.td;
                }
            }
            vtable.rows.splice(vtable.col, 1);
            return true;

        case TableOperation.DeleteColumn:
            for (let i = 0; i < vtable.rows.length; i++) {
                let cell = getCell(vtable, i, vtable.col);
                let nextCell = getCell(vtable, i, vtable.col + 1);
                if (cell.td && cell.td.colSpan > 1 && nextCell.spanLeft) {
                    nextCell.td = cell.td;
                }
                vtable.rows[i].cells.splice(vtable.col, 1);
            }
            return true;

        case TableOperation.MergeAbove:
        case TableOperation.MergeBelow:
            let rowStep = operation == TableOperation.MergeAbove ? -1 : 1;
            for (
                let rowIndex = vtable.row + rowStep;
                rowIndex >= 0 && rowIndex < vtable.rows.length;
                rowIndex += rowStep
            ) {
                let cell = getCell(vtable, rowIndex, vtable.col);
                if (cell.td && !cell.spanAbove) {
                    let aboveCell = rowIndex < vtable.row ? cell : currentCell;
                    let belowCell = rowIndex < vtable.row ? currentCell : cell;
                    if (aboveCell.td.colSpan != belowCell.td.colSpan) {
                        return false;
                    }
                    moveChild(aboveCell.td, belowCell.td);
                    belowCell.td = null;
                    belowCell.spanAbove = true;
                    return true;
                }
            }
            return false;

            case TableOperation.MergeLeft:
        case TableOperation.MergeRight:
            let colStep = operation == TableOperation.MergeLeft ? -1 : 1;
            for (
                let colIndex = vtable.col + colStep;
                colIndex >= 0 && colIndex < vtable.rows[vtable.col].cells.length;
                colIndex += colStep
            ) {
                let cell = getCell(vtable, vtable.row, colIndex);
                if (cell.td && !cell.spanLeft) {
                    let leftCell = colIndex < vtable.col ? cell : currentCell;
                    let rightCell = colIndex < vtable.col ? currentCell : cell;
                    if (leftCell.td.rowSpan != rightCell.td.rowSpan) {
                        return false;
                    }
                    moveChild(leftCell.td, rightCell.td);
                    rightCell.td = null;
                    rightCell.spanLeft = true;
                    return true;
                }
            }
            return true;

        case TableOperation.DeleteTable:
            vtable.rows = [];
            vtable.table = null;
            return true;

        case TableOperation.SplitVertically:
            if (currentCell.td.rowSpan > 1) {
                getCell(vtable, vtable.row + 1, vtable.col).td = cloneNode(currentCell.td);
            } else {
                let splitRow = <VirtualTableRow>{
                    tr: cloneNode(currentRow.tr),
                    cells: [],
                };
                for (let i = 0; i < currentRow.cells.length; i++) {
                    let cell = currentRow.cells[i];
                    splitRow.cells.push({
                        td: i == vtable.col ? cloneNode(cell.td) : null,
                        spanAbove: i != vtable.col,
                        spanLeft: cell.spanLeft,
                    });
                }
                vtable.rows.splice(vtable.row + 1, 0, splitRow);
            }
            return true;

        case TableOperation.SplitHorizontally:
            if (currentCell.td.colSpan > 1) {
                getCell(vtable, vtable.row, vtable.col + 1).td = cloneNode(currentCell.td);
            } else {
                for (let i = 0; i < vtable.rows.length; i++) {
                    let cell = getCell(vtable, i, vtable.col);
                    vtable.rows[i].cells.splice(
                        vtable.col + 1,
                        0,
                        {
                            td: i == vtable.row ? cloneNode(cell.td) : null,
                            spanAbove: cell.spanAbove,
                            spanLeft: i != vtable.row,
                        }
                    );
                }
            }
            return true;
    }
}

function writeBack(vTable: VirtualTable): HTMLTableElement {
    let table = vTable.table;
    if (table) {
        removeChildren(table);
        for (let r = 0; r < vTable.rows.length; r++) {
            let row = vTable.rows[r];
            let tr = row.tr;
            removeChildren(tr);
            table.appendChild(tr);
            for (let c = 0; c < row.cells.length; c++) {
                let td = row.cells[c].td;
                if (td) {
                    recalcSpans(td, vTable, r, c);
                    tr.appendChild(td);
                }
            }
        }
    }

    return table;
}

function recalcSpans(td: HTMLTableCellElement, vtable: VirtualTable, row: number, col: number) {
    td.removeAttribute('colSpan');
    td.removeAttribute('rowSpan');
    for (let i = col + 1; getCell(vtable, row, i).spanLeft; td.colSpan = ++i - col) {}
    for (let i = row + 1; getCell(vtable, i, col).spanAbove; td.rowSpan = ++i - row) {}
}

function removeChildren(node: Node) {
    while (node.firstChild) {
        node.removeChild(node.firstChild);
    }
}

function getCurrentTd(vtable: VirtualTable): HTMLTableCellElement {
    let row = Math.min(vtable.rows.length - 1, vtable.row);
    let col = Math.min(vtable.rows[row].cells.length - 1, vtable.col);
    while (row >=0 && col >= 0) {
        let cell = vtable.rows[row].cells[col];
        if (cell.td) {
            return cell.td;
        } else if (cell.spanLeft) {
            col--;
        } else if (cell.spanAbove) {
            row--;
        } else {
            break;
        }
    }

    return null;
}

function getCell(vtable: VirtualTable, row: number, col: number): VirtualTableCell {
    return row < vtable.rows.length && col < vtable.rows[row].cells.length ? vtable.rows[row].cells[col] : {
        td: null,
        spanLeft: false,
        spanAbove: false,
    };
}

function cloneNode<T extends Node>(node: T): T {
    return node ? <T>node.cloneNode(false /*deep*/) : null;
}

function cloneCell(cell: VirtualTableCell): VirtualTableCell {
    return {
        td: cloneNode(cell.td),
        spanAbove: cell.spanAbove,
        spanLeft: cell.spanLeft,
    };
}

function moveChild(toNode: Node, fromNode: Node) {
    while (fromNode.firstChild) {
        toNode.appendChild(fromNode.firstChild);
    }
}
