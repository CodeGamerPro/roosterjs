const TABLE_STYLE_CLASS_PREFIX = 'roosterTableStyle';

interface TableFormat {
    className: string;
    bgColorEven: string;
    bgColorOdd: string;
    topBorder: string;
    bottomBorder: string;
    verticalBorder: string;
}

export default TableFormat;

export const TABLE_STYLE_CLASS_MAP = {
    Default: createStyle('Default', '#FFF', '#FFF', '#ABABAB', '#ABABAB', '#ABABAB'),
    LightLines: createStyle('LightLines', '#FFF', '#FFF', null, '#92C0E0'),
    TwoTones: createStyle('TwoTones', '#C0E4FF', '#FFF'),
    LightBands: createStyle('LightBands', '#D8D8D8', '#FFF'),
    Grid: createStyle('Grid', '#D8D8D8', '#FFF', '#ABABAB', '#ABABAB', '#ABABAB'),
    Clear: createStyle('Clear', '#FFF', '#FFF'),
};

export function addTableFormat(name: string, format: TableFormat) {
    (<{ [name: string]: TableFormat }>TABLE_STYLE_CLASS_MAP)[name] = format;
}

export type TableFormatName = keyof typeof TABLE_STYLE_CLASS_MAP;

export function getTableFormatFromTable(table: HTMLTableElement): TableFormat {
    let classNames = table.className.split(' ');
    for (let i = 0; i < classNames.length; i++) {
        if (classNames[i].indexOf(TABLE_STYLE_CLASS_PREFIX) == 0) {
            let className = classNames[i].substr(TABLE_STYLE_CLASS_PREFIX.length);
            return TABLE_STYLE_CLASS_MAP[<TableFormatName>className];
        }
    }
    return null;
}

export function getTableFormat(name: TableFormatName): TableFormat {
    return TABLE_STYLE_CLASS_MAP[name];
}

function createStyle(
    name: string,
    bgColorEven?: string,
    bgColorOdd?: string,
    topBorder?: string,
    bottomBorder?: string,
    verticalBorder?: string
): TableFormat {
    return {
        className: TABLE_STYLE_CLASS_PREFIX + name,
        bgColorEven: bgColorEven,
        bgColorOdd: bgColorOdd,
        topBorder: topBorder,
        bottomBorder: bottomBorder,
        verticalBorder: verticalBorder,
    };
}
