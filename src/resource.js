import { Base } from "miruken-core";
import { ignore } from "miruken-map";
import { Request } from "./servicebus";

export const Resource = Base.extend({
    id:         undefined,
    rowVersion: undefined,
    created:    undefined,
    createdBy:  undefined,
    modified:   undefined,
    modifiedBy: undefined,

    @ignore
    get isNew() {
        return this.id == null || this.id <= 0;
    }
}, {
    coerce(response) {
        return Reflect.construct(this, arguments);
    }
});

export const ResourceAction = Request.extend({
    $type: undefined,   // Ensures $type comes first (Needed by JSON.NET)
    constructor(data) {
        if (data instanceof this.responseType) {
            this.resource = data;
        } else {
            this.base(data);
        }
    }
}, {
    coerce(resourceType) {
        if (this === ResourceAction) {
            if (!resourceType || !(resourceType.prototype instanceof Resource)) {
                throw new TypeError("ResourceAction's must provide a Resource type");
            }
            const action = ResourceAction.extend();
            action.implement({
                resource: undefined,

                @ignore
                get responseType() {
                    return resourceType;
                }
            });
            return action;
        }
        return Reflect.construct(this, arguments);
    }
});
