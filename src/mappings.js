export function extract(key, map) {
    return function (value, options) {
        value = key(value);
        if (map && $isSomething(value)) {
            value = map(value, options);
        }
        return value;
    };
}

export function id(map) {
    return extract(v => v.id, map);
}

export function toEntry(key, map) {
    return function (value, options) {
        if (map) {
            value = map(value, options);
        }
        return [key(value), value];
    };
}

export function idEntry(map) {
    return toEntry(v => v.id, map);
}

