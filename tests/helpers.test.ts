import { clearBuffer, fillString } from "../common/helpers";

test('fill string', () => {
    expect(fillString('str', 12, '1')).toBe('111111111str');
    expect(fillString('strstr', 3, '0')).toBe('str');
});

test('clear buffer', () => {
    const buffer = new ArrayBuffer(3);
    const view = new DataView(buffer);
    view.setInt8(0, 1);
    clearBuffer(view);
    expect(view.getInt8(0)).toBe(0);
});
