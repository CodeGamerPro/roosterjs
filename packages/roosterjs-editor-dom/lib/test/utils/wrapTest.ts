import * as DomTestHelper from '../DomTestHelper';
import wrap from '../../utils/wrap';

describe('EditorUitls wrap()', () => {
    let testID = 'wrap';

    it('node = null, htmlFragment = ""', () => {
        let result = wrap(null, '');
        expect(result).toBeNull();
    });

    it('node = <p></p>, htmlFragment = ""', () => {
        runTest(['<p></p>', ''], '<p></p>');
    });

    it('node = text, htmlFragment = "<div style="font-size:6px"></div>"', () => {
        runTest(
            ['text', '<div style="font-size:6px"></div>'],
            '<div style="font-size:6px">text</div>'
        );
    });

    it('node = disconnected <p></p>, htmlFragment = "<div></div>"', () => {
        let node = document.createElement('p');
        let result = wrap(node, '<div></div>') as HTMLElement;
        expect(result.outerHTML).toBe('<div><p></p></div>');
    });

    function runTest(input: [string, string], output: string) {
        let result = wrap(
            DomTestHelper.createElementFromContent(testID, input[0]).firstChild,
            input[1]
        ) as HTMLElement;
        expect(result.outerHTML).toBe(output);
        DomTestHelper.removeElement(testID);
    }
});
