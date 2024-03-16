let arrayRe;
try {
    arrayRe = new RegExp(`\\[(?="|'|\\d)|\\.|(?<="|'|\\d)]+`, 'g');
} catch (e) {
    arrayRe = /\[|\.|]+/g;
}
export function get(obj, path) {
    if (path === '' || path === '.')
        return obj;
    if (path === null || path == undefined)
        return undefined;
    const pathArray = Array.isArray(path) ?
        path :
        path
        .split(arrayRe)
        .filter((f) => f)
        .map((s) => s.replace(/'|"/g, ''));
    return pathArray.reduce((prevObj, key) => prevObj && prevObj[key], obj);
}
//# sourceMappingURL=get.js.map