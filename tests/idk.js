import fs from 'fs';
import loader from '@assemblyscript/loader';

function __liftString(memory, pointer) {
    if (!pointer) return null;
    const
        end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1,
        memoryU16 = new Uint16Array(memory.buffer);
    let
        start = pointer >>> 1,
        string = '';
    while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
    return string + String.fromCharCode(...memoryU16.subarray(start, end));
}

(async () => {
    let wasm = fs.readFileSync('../debug/debug.wasm');
    let module = await loader.instantiate(wasm, {
        env: {
            abort(_msg, _file, line, column) {
                console.error('abort called at index.ts:' + line + ':' + column);
            },
            'console.log'(s) {
                // src/btc/env/index/consoleLog(~lib/string/String) => void
                s = __liftString(module.exports.memory, s >>> 0);
                console.log(s);
            },
        },
    });

    let CONTRACT = await loader.demangle(module).Test;

    console.log(CONTRACT);

    /*let vector1 = Vector2D(3, 4);
    let vector2 = Vector2D(4, 5);

    vector2.y += 10;
    vector2.add(vector1);

    console.log(`
      vector1=(${vector1.x}, ${vector1.y})
      vector2=(${vector2.x}, ${vector2.y})
      vector1.magnitude=${vector1.Magnitude()}
      vector2.magnitude=${vector2.Magnitude()}
    `);*/
})();
