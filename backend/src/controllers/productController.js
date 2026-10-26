import Product from "../models/Product.js";
import Entrepreneur from "../models/Entrepreneur.js";

function productPayload(product) {
  return {
    _id: product._id,
    id: String(product._id),
    name: product.name,
    description: product.description || "",
    image: product.image || "",
    price: product.price,
    stock: product.stock,
    category: product.category || "Local product",
    isActive: product.isActive,
    entrepreneurId: product.entrepreneurId,
    maker: product.entrepreneurId?.businessName || "Local entrepreneur",
    location: product.entrepreneurId?.location || "",
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

export async function listPublicProducts(req, res) {
  try {
    const products = await Product.find({ isActive: true, stock: { $gt: 0 } })
      .populate({
        path: "entrepreneurId",
        match: { verificationStatus: "approved", verified: true },
        select: "businessName skill location profileImage verified"
      })
      .sort({ createdAt: -1 });

    res.json({ products: products.filter((p) => p.entrepreneurId).map(productPayload) });
  } catch (error) {
    res.status(500).json({ message: "Could not load products", error: error.message });
  }
}

export async function listMyProducts(req, res) {
  try {
    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Create your business profile first" });

    const products = await Product.find({ entrepreneurId: entrepreneur._id }).sort({ createdAt: -1 });
    res.json({ products: products.map((p) => productPayload({ ...p.toObject(), entrepreneurId: entrepreneur })) });
  } catch (error) {
    res.status(500).json({ message: "Could not load your products", error: error.message });
  }
}

export async function createProduct(req, res) {
  try {
    const { name, description, image, price, stock, category } = req.body;

    if (!name?.trim() || price === undefined || price === "" || stock === undefined || stock === "") {
      return res.status(400).json({ message: "Product name, price and stock are required" });
    }

    const numericPrice = Number(price);
    const numericStock = Number(stock);
    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ message: "Price must be a valid non-negative number" });
    }
    if (!Number.isInteger(numericStock) || numericStock < 0) {
      return res.status(400).json({ message: "Stock must be a whole number greater than or equal to 0" });
    }

    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Create your business profile first" });

    const product = await Product.create({
      entrepreneurId: entrepreneur._id,
      name: name.trim(),
      description: description?.trim() || "",
      image: image || "",
      price: numericPrice,
      stock: numericStock,
      category: category?.trim() || entrepreneur.skill,
      isActive: true
    });

    await Entrepreneur.findByIdAndUpdate(entrepreneur._id, { $addToSet: { products: product._id } });
    const populated = await Product.findById(product._id).populate("entrepreneurId", "businessName location skill profileImage verified");
    res.status(201).json({ product: productPayload(populated) });
  } catch (error) {
    res.status(500).json({ message: "Could not create product", error: error.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Entrepreneur profile not found" });

    const product = await Product.findOne({ _id: req.params.id, entrepreneurId: entrepreneur._id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    const { name, description, image, price, stock, category, isActive } = req.body;
    if (name !== undefined) product.name = String(name).trim();
    if (description !== undefined) product.description = String(description).trim();
    if (image !== undefined) product.image = String(image);
    if (category !== undefined) product.category = String(category).trim();
    if (isActive !== undefined) product.isActive = Boolean(isActive);
    if (price !== undefined) {
      const numericPrice = Number(price);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) return res.status(400).json({ message: "Price must be a valid non-negative number" });
      product.price = numericPrice;
    }
    if (stock !== undefined) {
      const numericStock = Number(stock);
      if (!Number.isInteger(numericStock) || numericStock < 0) return res.status(400).json({ message: "Stock must be a whole number greater than or equal to 0" });
      product.stock = numericStock;
    }

    await product.save();
    const populated = await Product.findById(product._id).populate("entrepreneurId", "businessName location skill profileImage verified");
    res.json({ product: productPayload(populated) });
  } catch (error) {
    res.status(500).json({ message: "Could not update product", error: error.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const entrepreneur = await Entrepreneur.findOne({ userId: req.user.id });
    if (!entrepreneur) return res.status(404).json({ message: "Entrepreneur profile not found" });

    const product = await Product.findOneAndDelete({ _id: req.params.id, entrepreneurId: entrepreneur._id });
    if (!product) return res.status(404).json({ message: "Product not found" });

    await Entrepreneur.findByIdAndUpdate(entrepreneur._id, { $pull: { products: product._id } });
    res.json({ message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ message: "Could not delete product", error: error.message });
  }
}
