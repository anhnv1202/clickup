import {
    get
} from '../get';
import {
    realTypeOf
} from '../real-type-of';
export function render(template, data = {}) {
    if (typeof template !== 'string') {
        throw new TypeError(`Invalid template! Template should be a "string" but ${realTypeOf(template)} was given.`);
    }

    function replacer(chars) {
        return (match) => {
            match = match.slice(chars, -chars).trim();
            const value = get(data, match);
            return (value ? ? '');
        };
    }
    return (template
        .replace(/\{\{\{([^}]+)\}\}\}/g, replacer(3))
        .replace(/\{\{([^}]+)\}\}/g, replacer(2)));
}
//# sourceMappingURL=placeholders.js.map