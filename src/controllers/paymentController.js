import { StatusCodes } from "http-status-codes";

import razorpay from '../config/razorpayConfig.js';
import { CURRENCY, RECEIPT_SECRET } from "../config/serverConfig.js";
import { createPaymentService, updatePaymentStatusService } from "../services/paymentService.js";
import { internalErrorResponse } from "../utils/common/responseObjects.js";
export const createOrderController = async (req, res) => {
    try {
        const options = {
            amount: req.body.amount,
            currency: CURRENCY,
            receipt: RECEIPT_SECRET
        };

        const order = await razorpay.orders.create(options);

        console.log(order);

        await createPaymentService(order.id, order.amount, req.user._id)

        if(!order) {
            throw new Error('Failed to create order');
        }

        return res.status(StatusCodes.CREATED).json({
            success: true,
            message: 'Order created successfully',
            data: order
        });

    } catch (error) {
        console.log('Error in createOrderController', error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(internalErrorResponse(error));
            
    }
}

export const capturePaymentController = async (req, res) => {
    try {
        console.log('Request body', req.body);
        const response = await updatePaymentStatusService(req.body.orderId, req.body.status, req.body.paymentId, req.body.signature, req.user._id);
        return res.status(StatusCodes.OK).json({
            success: true,
            message: req.body.status === 'success' ? 'Payment captured successfully' : 'Payment status updated',
            data: response
        });

    } catch (error) {
        console.log('Error in capturePaymentController', error);
        return res
            .status(StatusCodes.INTERNAL_SERVER_ERROR)
            .json(internalErrorResponse(error));
            
    }
}
