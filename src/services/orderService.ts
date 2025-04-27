// src/services/orderService.ts
import Order from "../models/Order";

export const expirePendingOrders = async (): Promise<number> => {
  try {
    const timeoutMinutes = 5;
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const result = await Order.updateMany(
      {
        status: "pending",
        createdAt: { $lte: cutoffTime },
      },
      { $set: { status: "failed" } }
    );

    console.log(`Expired ${result.modifiedCount} pending orders to failed`);
    return result.modifiedCount;
  } catch (error) {
    console.error("Error expiring pending orders:", error);
    throw error;
  }
};