export interface VirtualTableCell {
    spanLeft: boolean;
    spanAbove: boolean;
}

export interface VirtualTableRow {
    cells: (HTMLTableCellElement | VirtualTableCell)[];
    tr: HTMLTableRowElement;
}

interface VirtualTable {
    rows: VirtualTableRow[];
    table: HTMLTableElement;
}

export default VirtualTable;
