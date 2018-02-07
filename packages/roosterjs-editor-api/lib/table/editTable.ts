import VirtualTable, { VirtualTableRow, VirtualTableCell } from "./VirtualTable";
import { TableOperation } from "roosterjs-editor-types";

export default function editTable(
    vtable: VirtualTable,
    currentCell: HTMLTableCellElement,
    operation: TableOperation
): boolean {
    let position = getCurrentPosition(vtable, currentCell);
    if (!position) {
        return false;
    }

    let [ currentRowIndex, currentColumnIndex, currentRow ] = position;

    switch (operation) {
        case TableOperation.InsertAbove:
        case TableOperation.InsertBelow:
            let newRow: VirtualTableRow = {
                cells: [],
                tr: currentRow.tr.cloneNode(false /*deep*/) as HTMLTableRowElement,
            };

            for (let cell of currentRow.cells) {
                newRow.cells.push(
                    cell instanceof HTMLTableCellElement ?
                        (<HTMLTableCellElement>cell).cloneNode(false /*deep*/) as HTMLTableCellElement :
                        {
                            spanLeft: (<VirtualTableCell>cell).spanLeft,
                            spanAbove: (<VirtualTableCell>cell).spanAbove,
                        }
                );
            }

            vtable.rows.splice(currentRowIndex + (operation == TableOperation.InsertAbove ? 0 : 1), 0, newRow);
            return true;

        case TableOperation.InsertLeft:
        case TableOperation.InsertRight:
            for (let i = 0; i < vtable.rows.length; i++) {
                let cell = vtable.rows[i].cells[currentColumnIndex];
                let newCell = cell instanceof HTMLTableCellElement ?
                    (<HTMLTableCellElement>cell).cloneNode(false /*deep*/) as HTMLTableCellElement :
                    <VirtualTableCell>{
                        spanLeft: (<VirtualTableCell>cell).spanLeft,
                        spanAbove: (<VirtualTableCell>cell).spanAbove,
                    };
                vtable.rows[i].cells.splice(currentColumnIndex + (operation == TableOperation.InsertLeft ? 0 : 1), 0, newCell);
            }
            return true;

        case TableOperation.DeleteRow:
            let nextRow = vtable.rows[currentRowIndex + 1];
            if (nextRow) {
                for (let i = 0; i < currentRow.cells.length; i++) {
                    let cell = currentRow.cells[i];
                    if (cell instanceof HTMLTableCellElement && (<HTMLTableCellElement>cell).rowSpan > 1 && (<VirtualTableCell>nextRow.cells[i]).spanAbove) {
                        nextRow.cells[i] = cell;
                    }
                }
            }
            vtable.rows.splice(currentRowIndex, 1);
            return true;

        case TableOperation.DeleteColumn:
            for (let i = 0; i < vtable.rows.length; i++) {
                let row = vtable.rows[i];
                let cell = row.cells[currentColumnIndex];
                let nextCell = row.cells[currentColumnIndex + 1];
                if (cell instanceof HTMLTableCellElement && (<HTMLTableCellElement>cell).colSpan > 1 && nextCell && (<VirtualTableCell>nextCell).spanLeft) {
                    row.cells[currentColumnIndex + 1] = cell;
                }
                row.cells.splice(currentColumnIndex, 1);
            }
            return true;

        case TableOperation.MergeAbove:
        case TableOperation.MergeBelow:
            let rowStep = operation == TableOperation.MergeAbove ? -1 : 1;
            let rowIndex = currentRowIndex + rowStep;
            for (; rowIndex >= 0 && !(vtable.rows[rowIndex].cells[currentColumnIndex] instanceof HTMLTableCellElement); rowIndex += rowStep) {}
            let aboveTd = <HTMLTableCellElement>vtable.rows[Math.min(rowIndex, currentRowIndex)].cells[currentColumnIndex];
            let belowTd = <HTMLTableCellElement>vtable.rows[Math.max(rowIndex, currentRowIndex)].cells[currentColumnIndex];

            if (aboveTd instanceof HTMLTableCellElement && belowTd instanceof HTMLTableCellElement && belowTd.colSpan == 1) {
                while (belowTd.firstChild) {
                    aboveTd.appendChild(belowTd.firstChild);
                }

                vtable.rows[Math.max(rowIndex, currentRowIndex)].cells[currentColumnIndex] = <VirtualTableCell>{
                    spanAbove: true,
                    spanLeft: false,
                };
                return true;
            }
            return false;

        case TableOperation.MergeLeft:
        case TableOperation.MergeRight:
            let colStep = operation == TableOperation.MergeLeft ? -1 : 1;
            let colIndex = currentColumnIndex + colStep;
            for (; colIndex >= 0 && !(vtable.rows[currentRowIndex].cells[colIndex] instanceof HTMLTableCellElement); colIndex += colStep) {}
            let leftTd = <HTMLTableCellElement>vtable.rows[currentRowIndex].cells[Math.min(colIndex, currentColumnIndex)];
            let rightTd = <HTMLTableCellElement>vtable.rows[currentRowIndex].cells[Math.max(colIndex, currentColumnIndex)];

            if (leftTd instanceof HTMLTableCellElement && rightTd instanceof HTMLTableCellElement && rightTd.rowSpan == 1) {
                while (rightTd.firstChild) {
                    leftTd.appendChild(rightTd.firstChild);
                }

                vtable.rows[currentRowIndex].cells[Math.max(colIndex, currentColumnIndex)] = <VirtualTableCell>{
                    spanAbove: false,
                    spanLeft: true,
                };
                return true;
            }
            return false;

        case TableOperation.DeleteTable:
            vtable.rows = [];
            vtable.table = null;
            return true;
    }
}

function getCurrentPosition(vtable: VirtualTable, cell: HTMLTableCellElement): [number, number, VirtualTableRow] {
    let r = 0;
    let c = 0;
    let row: VirtualTableRow;

    for (; r < vtable.rows.length; r++) {
        row = vtable.rows[r];
        for (c = 0; c < row.cells.length; c++) {
            if (cell == row.cells[c]) {
                return [r, c, row];
            }
        }
    }

    return null;
}
