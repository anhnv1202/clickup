import {
    get
} from '../get';
import {
    isDirective
} from './is-directive';
import {
    render
} from './placeholders';
import {
    realTypeOf,
    isObject,
    isArray
} from '../real-type-of';
import {
    removeUndefined
} from '../remove-undefined';
import validate from './validate';
import {
    arrify
} from '../arrify';
const directives = {};
const directiveRegExp = /^@[a-z][a-zA-Z0-9]+$/;

function registerDirective(name, fn) {
    if (!directiveRegExp.exec(name)) {
        throw new Error(`"${name}" is an invalid directive name`);
    }
    directives[name] = fn;
}

function registerStringDirective(name, fn) {
    registerDirective(name, (value, payload) => {
        const str = resolve(value, payload);
        if (typeof str !== 'string') {
            throw new Error(`${name}: expected string, got ${realTypeOf(str)}`);
        }
        return fn(str, payload);
    });
}

function runDirective(obj, payload) {
    const name = Object.keys(obj).find((key) => key.startsWith('@'));
    const directiveFn = directives[name];
    const value = obj[name];
    if (typeof directiveFn !== 'function') {
        throw new Error(`${name} is not a valid directive, got ${realTypeOf(directiveFn)}`);
    }
    return directiveFn(value, payload);
}
registerDirective('@if', (opts, payload) => {
    let condition = false;
    if (!isObject(opts)) {
        throw new Error('@if requires an object with an "exists" key');
    }
    if (!opts.exists && !opts.blank) {
        throw new Error('@if requires an "exists" key or a "blank" key');
    } else if (opts.exists !== undefined) {
        const value = resolve(opts.exists, payload);
        condition = value !== undefined && value !== null;
    } else if (opts.blank !== undefined) {
        const value = resolve(opts.blank, payload);
        condition = value !== undefined && value !== null && value != '';
    }
    if (condition && opts.then !== undefined) {
        return resolve(opts.then, payload);
    } else if (!condition && opts.else) {
        return resolve(opts.else, payload);
    }
});
registerDirective('@case', (opts, payload) => {
    if (!isObject(opts)) {
        throw new Error('@case requires an object with a "operator" key');
    }
    if (!opts.operator) {
        throw new Error('@case requires a "operator" key');
    }
    const operator = opts.operator;
    if (opts.value) {
        const value = resolve(opts.value, payload);
        if (typeof value === 'string') {
            switch (operator) {
                case 'lower':
                    return value.toLowerCase();
                case 'upper':
                    return value.toUpperCase();
                default:
                    throw new Error('operator key should have a value of "lower" or "upper"');
            }
        }
        return value;
    }
});
export const MAX_PATTERN_LENGTH = 10;
export const MAX_REPLACEMENT_LENGTH = 10;
registerDirective('@replace', (opts, payload) => {
    if (!isObject(opts)) {
        throw new Error('@replace requires an object with a "pattern" key');
    }
    if (!opts.pattern) {
        throw new Error('@replace requires a "pattern" key');
    }
    if (opts.replacement == null) {
        opts.replacement = '';
    }
    if (opts.ignorecase == null) {
        opts.ignorecase = false;
    }
    if (opts.global == null) {
        opts.global = true;
    }
    let pattern = opts.pattern;
    const replacement = opts.replacement;
    const ignorecase = opts.ignorecase;
    const isGlobal = opts.global;
    if (opts.value) {
        const value = resolve(opts.value, payload);
        if (typeof value === 'string' &&
            typeof pattern === 'string' &&
            typeof replacement === 'string' &&
            typeof ignorecase === 'boolean' &&
            typeof isGlobal === 'boolean') {
            if (pattern.length > MAX_PATTERN_LENGTH) {
                throw new Error(`@replace requires a "pattern" less than ${MAX_PATTERN_LENGTH} characters`);
            }
            if (replacement.length > MAX_REPLACEMENT_LENGTH) {
                throw new Error(`@replace requires a "replacement" less than ${MAX_REPLACEMENT_LENGTH} characters`);
            }
            pattern = pattern.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
            let flags = '';
            if (isGlobal) {
                flags += 'g';
            }
            if (ignorecase) {
                flags += 'i';
            }
            return value.replace(new RegExp(pattern, flags), replacement);
        }
    }
});
registerDirective('@arrayPath', (data, payload) => {
    if (!Array.isArray(data)) {
        throw new Error(`@arrayPath expected array, got ${realTypeOf(data)}`);
    }
    const [path, itemShape] = data;
    const root = typeof path === 'string' ? get(payload, path.replace('$.', '')) : resolve(path, payload);
    if (['object', 'array'].includes(realTypeOf(root)) &&
        realTypeOf(itemShape) === 'object' &&
        Object.keys(itemShape).length > 0) {
        return arrify(root).map((item) => resolve(itemShape, item));
    }
    return root;
});
registerStringDirective('@path', (path, payload) => {
    return get(payload, path.replace('$.', ''));
});
registerStringDirective('@template', (template, payload) => {
    return render(template, payload);
});
registerDirective('@literal', (value, payload) => {
    return resolve(value, payload);
});
registerDirective('@json', (opts, payload) => {
    if (!isObject(opts)) {
        throw new Error('@json requires an object with a "value" key');
    }
    if (!opts.mode) {
        throw new Error('@json requires a "mode" key');
    }
    if (!opts.value) {
        throw new Error('@json requires a "value" key');
    }
    const value = resolve(opts.value, payload);
    if (opts.mode === 'encode') {
        return JSON.stringify(value);
    } else if (opts.mode === 'decode') {
        if (typeof value === 'string') {
            return JSON.parse(value);
        }
        return value;
    }
});

function resolve(mapping, payload) {
    if (!isObject(mapping) && !isArray(mapping)) {
        return mapping;
    }
    if (isDirective(mapping)) {
        return runDirective(mapping, payload);
    }
    if (Array.isArray(mapping)) {
        return mapping.map((value) => resolve(value, payload));
    }
    const resolved = {};
    for (const key of Object.keys(mapping)) {
        resolved[key] = resolve(mapping[key], payload);
    }
    return resolved;
}

function transform(mapping, data = {}) {
    const realType = realTypeOf(data);
    if (realType !== 'object') {
        throw new Error(`data must be an object, got ${realType}`);
    }
    validate(mapping);
    const resolved = resolve(mapping, data);
    const cleaned = removeUndefined(resolved);
    return cleaned;
}

function transformBatch(mapping, data = []) {
    const realType = realTypeOf(data);
    if (!isArray(data)) {
        throw new Error(`data must be an array, got ${realType}`);
    }
    validate(mapping);
    const resolved = data.map((d) => resolve(mapping, d));
    return removeUndefined(resolved);
}
export {
    transform,
    transformBatch
};
//# sourceMappingURL=index.js.map