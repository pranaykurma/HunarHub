import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Entrepreneur from "../models/Entrepreneur.js";

function orderPayload(order) {
  const obj = order.toObject ? order.toObject() : order;
  return {
    ...obj,
    id: String(obj._id),
    orderId: `HH-${String(obj._id).slice(-8).toUpperCase()}`,
    items: (obj.items || []).map((item) => ({
      ...item,
      productId: String(item.productId)
    }))
  };
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

export async function createOrders(req, res) {
  const customerId = req.user.id;
  const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
  const delivery = req.body?.delivery || {};
  const deliveryData = {
    name: String(delivery.name || "").trim(),
    phone: String(delivery.phone || "").trim(),
    address: String(delivery.address || "").trim(),
    city: String(delivery.city || "").trim(),
    pincode: String(delivery.pincode || "").trim()
  };
  if (!deliveryData.name || !deliveryData.phone || !deliveryData.address || !deliveryData.city || !deliveryData.pincode) {
    return res.status(400).json({ message: "Delivery details are required" });
  }

  if (!rawItems.length) {
    return res.status(400).json({ message: "Your cart is empty" });
  }

  const merged = new Map();
  for (const item of rawItems) {
    const productId = item?.productId || item?.id;
    const quantity = Number(item?.quantity);
    if (!isValidObjectId(productId) || !Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Invalid product or quantity in cart" });
    }
    merged.set(String(productId), (merged.get(String(productId)) || 0) + quantity);
  }

  const session = await mongoose.startSession();
  try {
    let createdOrders = [];
    await session.withTransaction(async () => {
      const ids = [...merged.keys()].map((id) => new mongoose.Types.ObjectId(id));
      const products = await Product.find({
        _id: { $in: ids },
        isActive: true
      }).populate("entrepreneurId", "businessName location skill profileImage verified").session(session);

      if (products.length !== ids.length) {
        throw new Error("One or more products are no longer available");
      }

      const productMap = new Map(products.map((product) => [String(product._id), product]));
      const groups = new Map();

      for (const [productId, quantity] of merged.entries()) {
        const product = productMap.get(productId);
        if (!product || !product.entrepreneurId) {
          throw new Error("A product's entrepreneur could not be found");
        }
        if (!product.entrepreneurId.verified) {
          throw new Error(`${product.name} is not currently available from a verified entrepreneur`);
        }
        if (product.stock < quantity) {
          throw new Error(`${product.name} has only ${product.stock} left in stock`);
        }

        const entrepreneurId = String(product.entrepreneurId._id);
        if (!groups.has(entrepreneurId)) groups.set(entrepreneurId, []);
        groups.get(entrepreneurId).push({ product, quantity });
      }

      for (const [entrepreneurId, group] of groups.entries()) {
        const items = [];
        let total = 0;

        for (const { product, quantity } of group) {
          const updated = await Product.findOneAndUpdate(
            { _id: product._id, isActive: true, stock: { $gte: quantity } },
            { $inc: { stock: -quantity } },
            { new: true, session }
          );
          if (!updated) throw new Error(`${product.name} is no longer available in the requested quantity`);

          items.push({
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity
          });
          total += product.price * quantity;
        }

        const order = await Order.create([{
          customerId,
          entrepreneurId,
          items,
          total,
          delivery: deliveryData,
          status: "pending"
        }], { session });

        createdOrders.push(order[0]);
      }
    });

    const populated = await Order.find({
      _id: { $in: createdOrders.map((order) => order._id) }
    })
      .populate("entrepreneurId", "businessName location skill profileImage verified")
      .sort({ createdAt: -1 });

    return res.status(201).json({
      message: "Order placed successfully",
      orders: populated.map(orderPayload)
    });
  } catch (error) {
    return res.status(400).json({ message: error.message || "Could not place order" });
  } finally {
    await session.endSession();
  }
}

export async function listMyOrders(req, res) {
  try {
    const orders = await Order.find({ customerId: req.user.id })
      .populate("entrepreneurId", "businessName location skill profileImage verified")
      .populate("items.productId", "name image category stock")
      .sort({ createdAt: -1 });
    res.json({ orders: orders.map(orderPayload) });
  } catch (error) {
    res.status(500).json({ message: "Could not load your orders", error: error.message });
  }
}

export async function listEntrepreneurOrders(req, res) {
  try {
    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Entrepreneur profile not found" });

    const orders = await Order.find({ entrepreneurId: entrepreneur._id })
      .populate("customerId", "name email")
      .populate("items.productId", "name image category")
      .sort({ createdAt: -1 });
    res.json({ orders: orders.map(orderPayload) });
  } catch (error) {
    res.status(500).json({ message: "Could not load entrepreneur orders", error: error.message });
  }
}

export async function listAllOrders(req, res) {
  try {
    const orders = await Order.find()
      .populate("customerId", "name email")
      .populate("entrepreneurId", "businessName location skill profileImage verified")
      .populate("items.productId", "name image category")
      .sort({ createdAt: -1 });
    res.json({ orders: orders.map(orderPayload) });
  } catch (error) {
    res.status(500).json({ message: "Could not load orders", error: error.message });
  }
}

export async function updateOrderStatus(req, res) {
  const allowed = ["pending", "processing", "shipped", "delivered", "cancelled"];
  const { status } = req.body || {};
  if (!allowed.includes(status)) return res.status(400).json({ message: "Invalid order status" });

  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (req.user.role === "entrepreneur") {
      const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
      if (!entrepreneur || String(order.entrepreneurId) !== String(entrepreneur._id)) {
        return res.status(403).json({ message: "You can only update your own orders" });
      }
    }

    order.status = status;
    await order.save();

    const populated = await Order.findById(order._id)
      .populate("customerId", "name email")
      .populate("entrepreneurId", "businessName location skill profileImage verified")
      .populate("items.productId", "name image category");

    res.json({ message: "Order status updated", order: orderPayload(populated) });
  } catch (error) {
    res.status(500).json({ message: "Could not update order status", error: error.message });
  }
}
