import { 
    HandlerBuilder, underscoreNaming
} from "miruken-callback";

import { HttpError } from "../../src/http-error";
import "../../src/xhr/handler-builder-xhr";
import "../../src/handler-authorize";

import * as dummy from "../dummy-api";

import { expect } from "chai";

const DummyApi = "http://dummy.restapiexample.com/api/v1/";

describe.skip("XMLHttpRequestHandler", () => {
    let handler;
    beforeEach(async () => {
        handler = new HandlerBuilder()
            .withXMLHttpRequestClient()
            .build()
            .$mapOptions({
                strategy: new (@underscoreNaming class {})
            })
            .$httpOptions({ baseUrl: DummyApi });
        await Promise.delay(100);
    });

    it("should perform http get all", async () => {
        const response = (await handler.$httpGet("employees", {
            responseType: dummy.DummyResult.ofMany(dummy.EmployeeReadData)
        })).resource;
        expect(response).to.be.instanceOf(dummy.DummyResult);
        for (const employee of response.data) {
            expect(employee).to.be.instanceOf(dummy.EmployeeReadData);
        }
    });

    it("should perform http get single", async () => {
        const response = (await handler.$httpGet("employee/1", {
            responseType: dummy.DummyResult.of(dummy.EmployeeReadData)
        })).resource;
        expect(response).to.be.instanceOf(dummy.DummyResult);
        expect(response.data).to.be.instanceOf(dummy.EmployeeReadData);
        expect(response.data.employeeName).to.be.a("string").that.is.not.empty;
        expect(response.data.employeeSalary).to.be.a("number").that.is.gt(0);
        expect(response.data.id).to.equal(1);
    });

    it("should perform http get unmapped", async () => {
        const response = (await handler.$httpGet("employee/1")).resource;
        expect(response).to.have.property("status");
        expect(response).to.have.property("data");
    });

    it("should return ArrayBuffer from http get", async () => {
        const response = (await handler.$httpGet("employees", {
            responseType: ArrayBuffer
        })).resource;
        expect(response).to.be.instanceOf(ArrayBuffer);
        const json = JSON.parse(new TextDecoder("utf-8").decode(response));
        expect(json).to.have.property("status");
        expect(json).to.have.property("data");
    });

    it("should return Blob from http get", async () => {
        const response = (await handler.$httpGet("employees", {
            responseType: Blob
        })).resource;
        expect(response).to.be.instanceOf(Blob);
        const json = JSON.parse(await response.text());
        expect(json).to.have.property("status");
        expect(json).to.have.property("data");
    });

    it("should perform http post", async () => {
        const employee = new dummy.EmployeeWriteData().extend({
            name:    "Phil Gunther",
            ag:      50,
            salaray: 150000
        });
        const response = (await handler.$httpPost("create", employee, {
            responseType: dummy.DummyResult
        })).resource;
        expect(response).to.be.instanceOf(dummy.DummyResult);
        expect(response.data.id).to.be.greaterThan(0);
    });

    it("should perform http put", async () => {
        const employee = new dummy.EmployeeWriteData().extend({
            name:    "Sarah Conner",
            ag:      50,
            salaray: 1200000
        });
        const create = (await handler.$httpPost("create", employee, {
            responseType: dummy.DummyResult
        })).resource;
        expect(create).to.be.instanceOf(dummy.DummyResult);
        expect(create.data.id).to.be.greaterThan(0);

        const updateAge = new dummy.EmployeeWriteData().extend({
            age: 39
        });
        const update = (await handler.$httpPut(`update/${create.data.id}`, updateAge, {
            responseType: dummy.DummyResult.of(dummy.EmployeeReadData)
        })).resource;
    });

    it.skip("should perform http basic authorization", async () => {
        const response = (await handler
            .$httpBasic("csmith", "12345")
            .$httpGet("employees", {
                responseType: dummy.DummyResult.ofMany(dummy.EmployeeReadData)
            })).resource;
        expect(response).to.be.instanceOf(dummy.DummyResult);
        for (const employee of response.data) {
            expect(employee).to.be.instanceOf(dummy.EmployeeReadData);
        }
    });
});
