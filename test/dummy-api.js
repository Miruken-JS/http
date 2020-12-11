import { Base, design } from "miruken-core";

export class EmployeeReadData extends Base {
    id;
    employeeName;
    employeeSalary;
    employeeAge;
    profileImage;
}

export class EmployeeWriteData extends Base {
    name;
    salary;
    age;
}

export class DummyResult {
    status;
    data;

    static of(dataType) {
        return class extends DummyResult {
            @design(dataType)
            data;
        }
    }

    static ofMany(dataType) {
        return class extends DummyResult {
            @design([dataType])
            data;
        }
    }
}
