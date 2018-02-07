import VirtualTable, { VirtualTableRow, VirtualTableCell } from './VirtualTable';

export default function createVirtualTable(table: HTMLTableElement): VirtualTable {
    let virtualTable = {
        table: table,
        rows: <VirtualTableRow[]>[],
    };

    for (let r = 0; r < table.rows.length; r++) {
        virtualTable.rows.push({
            cells: <VirtualTableCell[]>[],
            tr: table.rows[r],
        });
    }

    for (let r = 0; r < table.rows.length; r++) {
        let tr = table.rows[r];
        let targetIndex = 0;
        for (let c = 0; c < tr.cells.length; c++) {
            let td = tr.cells[c];
            for (; virtualTable.rows[r].cells[targetIndex]; targetIndex++) {}

            for (let i = 0; i < td.colSpan; i++, targetIndex++) {
                for (let j = 0; j < td.rowSpan; j++) {
                    virtualTable.rows[r + j].cells[targetIndex] = i == 0 && j == 0 ? td : {
                        spanLeft: i > 0,
                        spanAbove: j > 0,
                    };
                }
            }
        }
    }

    return virtualTable
}