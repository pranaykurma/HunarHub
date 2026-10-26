import Category from "../models/Category.js";

export async function listCategories(req, res) {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ message: "Could not load categories", error: error.message });
  }
}

export async function createCategory(req, res) {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "Category name is required" });
    const category = await Category.create({
      name,
      description: String(req.body.description || "").trim(),
      active: req.body.active !== false
    });
    res.status(201).json({ category });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Category already exists" });
    res.status(500).json({ message: "Could not create category", error: error.message });
  }
}

export async function updateCategory(req, res) {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { active: Boolean(req.body.active) },
      { new: true, runValidators: true }
    );
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json({ category });
  } catch (error) {
    res.status(500).json({ message: "Could not update category", error: error.message });
  }
}
