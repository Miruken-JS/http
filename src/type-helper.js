const { toString } = Object.prototype;

export class TypeHelper {
    static hasFormData = typeof FormData === "function";
    static isFormData(value) {
        return this.hasFormData && value instanceof FormData;
    }

    static hasURLSearchParams = typeof URLSearchParams === "function";
    static isURLSearchParams(value) {
        return this.hasURLSearchParams && value instanceof URLSearchParams;
    }

    static hasArrayBuffer = typeof ArrayBuffer === "function";
    static isArrayBuffer(value) {
        return this.hasArrayBuffer && (value instanceof ArrayBuffer || 
            toString.call(value) === '[object ArrayBuffer]');
    }
    
    static hasBlob = typeof Blob === "function";
    static isBlob(value) {
        return this.hasBlob && (value instanceof Blob || 
            toString.call(value) === '[object Blob]');
    }
}