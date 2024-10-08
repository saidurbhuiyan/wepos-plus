//COVERAGE_TAG: GET /wepos/v1/orders/(?P<order_id>[\d]+)/notes
//COVERAGE_TAG: POST /wepos/v1/orders/(?P<order_id>[\d]+)/notes
//COVERAGE_TAG: DELETE /wepos/v1/orders/(?P<order_id>[\d]+)/notes/(?P<note_id>[\d]+)
//COVERAGE_TAG: DELETE /wepos/v1/orders/(?P<order_id>[\d]+)/notes/(?P<id>[\d]+)

import { test, expect, request } from '@playwright/test';
import { ApiUtils } from '@utils/apiUtils';
import { endPoints } from '@utils/apiEndPoints';
import { payloads } from '@utils/payloads';
import { schemas } from '@utils/schemas';

test.describe('order note api test', () => {
    let apiUtils: ApiUtils;
    let orderId: string;
    let orderNoteId: string;

    test.beforeAll(async () => {
        apiUtils = new ApiUtils(await request.newContext());
        [, orderId, orderNoteId] = await apiUtils.createOrderNote(payloads.createProduct(), payloads.createOrder, payloads.createOrderNote);
    });

    test.afterAll(async () => {
        await apiUtils.dispose();
    });

    test('get all order notes', { tag: ['@pro'] }, async () => {
        const [response, responseBody] = await apiUtils.get(endPoints.getAllOrderNotes(orderId));
        expect(response.ok()).toBeTruthy();
        expect(responseBody).toBeTruthy();
        expect(responseBody).toMatchSchema(schemas.orderNotesSchema.orderNotesSchema);
    });

    test('create an order note', { tag: ['@pro'] }, async () => {
        const [response, responseBody] = await apiUtils.post(endPoints.createOrderNote(orderId), { data: payloads.createOrderNote });
        expect(response.status()).toBe(201);
        expect(response.ok()).toBeTruthy();
        expect(responseBody).toBeTruthy();
        expect(responseBody).toMatchSchema(schemas.orderNotesSchema.orderNoteSchema);
    });

    test('delete an order note', { tag: ['@pro'] }, async () => {
        const [response, responseBody] = await apiUtils.delete(endPoints.deleteOrderNote(orderId, orderNoteId), { params: payloads.paramsForceDelete });
        expect(response.ok()).toBeTruthy();
        expect(responseBody).toBeTruthy();
        expect(responseBody).toMatchSchema(schemas.orderNotesSchema.orderNoteSchema);
    });
});
