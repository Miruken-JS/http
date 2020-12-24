import { 
    design, $isNothing, $isFunction
} from "miruken-core";

const cache = new WeakMap();

export class Message {
    constructor(payload) {
        this.payload = payload;
    }

    payload;

    static of(payloadType) {
        if ($isNothing(payloadType)) {
            return Message;
        }

        if (!$isFunction(payloadType)) {
            throw new TypeError(`${payloadType} is not a valid class.`);
        }

        const messageType = cache.get(payloadType);
        if (!$isNothing(messageType)) {
            return messageType;
        }

        class TypedMessage extends Message {
            constructor(payload) {
                if (!($isNothing(payload) || (payload instanceof payloadType))) {
                    throw new TypeError(`Typed Message expects a ${payloadType.name} payload.`);
                }
                super(payload);
            }
            @design(payloadType)
            payload;
        }

        cache.set(payloadType, TypedMessage);
        return TypedMessage;
    }
}
