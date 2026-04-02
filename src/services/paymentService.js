import crypto from 'crypto';

import { RAZORPAY_KEY_SECRET } from "../config/serverConfig.js";
import paymentRepository from "../repositories/paymentRepository.js";
import userRepository from "../repositories/userRepository.js";

export const createPaymentService = async (orderId, amount) => {
    const payment = await paymentRepository.create({
        orderId,
        amount
    });
    return payment;
};

export const updatePaymentStatusService = async (orderId, status, paymentId, signature, userId) => {
    if (status !== 'success') {
        await paymentRepository.updateOrder(orderId, {
            status: 'failed',
            paymentId: paymentId || undefined
        });
        return null;
    }

    const sharesponse = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
    console.log('sharesponse', sharesponse, signature);
    if (sharesponse !== signature) {
        await paymentRepository.updateOrder(orderId, { status: 'failed', paymentId });
        throw new Error('Payment verification failed');
    }

    await paymentRepository.updateOrder(orderId, { status: 'success', paymentId });
    const updatedUser = await userRepository.update(userId, { plan: 'Paid' });

    return {
        _id: updatedUser._id,
        username: updatedUser.username,
        avatar: updatedUser.avatar,
        email: updatedUser.email,
        plan: updatedUser.plan
    };
};
