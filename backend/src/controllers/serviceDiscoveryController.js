import mongoose from "mongoose";

const toRegex = value => {
  if (!value) return null;

  const escaped = String(value)
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return escaped ? new RegExp(escaped, "i") : null;
};

export async function discoverServices(req, res) {
  try {
    const {
      q = "",
      category = "",
      location = "",
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = 24
    } = req.query;

    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(
      Math.max(Number(limit) || 24, 1),
      50
    );

    const serviceMatch = {
      $or: [
        { status: { $exists: false } },
        { status: { $in: ["active", "approved", "published"] } }
      ],
      $and: [
        {
          $or: [
            { availability: { $exists: false } },
            { availability: { $ne: false } }
          ]
        }
      ]
    };

    const numericMin =
      minPrice === undefined || minPrice === ""
        ? null
        : Number(minPrice);

    const numericMax =
      maxPrice === undefined || maxPrice === ""
        ? null
        : Number(maxPrice);

    if (
      Number.isFinite(numericMin) ||
      Number.isFinite(numericMax)
    ) {
      serviceMatch.price = {};

      if (Number.isFinite(numericMin)) {
        serviceMatch.price.$gte = numericMin;
      }

      if (Number.isFinite(numericMax)) {
        serviceMatch.price.$lte = numericMax;
      }
    }

    const pipeline = [
      { $match: serviceMatch },

      {
        $lookup: {
          from: "entrepreneurs",
          localField: "entrepreneurId",
          foreignField: "_id",
          as: "entrepreneur"
        }
      },

      { $unwind: "$entrepreneur" },

      {
        $match: {
          "entrepreneur.verificationStatus": "approved",
          "entrepreneur.verified": true
        }
      }
    ];

    const queryRegex = toRegex(q);

    if (queryRegex) {
      pipeline.push({
        $match: {
          $or: [
            { name: queryRegex },
            { description: queryRegex },
            { category: queryRegex },
            { "entrepreneur.businessName": queryRegex },
            { "entrepreneur.skill": queryRegex },
            { "entrepreneur.location": queryRegex }
          ]
        }
      });
    }

    const categoryRegex = toRegex(category);

    if (categoryRegex) {
      pipeline.push({
        $match: {
          $or: [
            { category: categoryRegex },
            { "entrepreneur.skill": categoryRegex }
          ]
        }
      });
    }

    const locationRegex = toRegex(location);

    if (locationRegex) {
      pipeline.push({
        $match: {
          "entrepreneur.location": locationRegex
        }
      });
    }

    let sortStage = {
      createdAt: -1
    };

    if (sort === "lowest-price") {
      sortStage = {
        price: 1,
        createdAt: -1
      };
    }

    if (sort === "highest-price") {
      sortStage = {
        price: -1,
        createdAt: -1
      };
    }

    if (sort === "oldest") {
      sortStage = {
        createdAt: 1
      };
    }

    pipeline.push(
      { $sort: sortStage },

      {
        $facet: {
          items: [
            {
              $skip: (safePage - 1) * safeLimit
            },

            {
              $limit: safeLimit
            },

            {
              $project: {
                _id: 1,
                name: 1,
                description: 1,
                category: 1,
                price: 1,
                duration: 1,
                availability: 1,
                status: 1,
                createdAt: 1,

                entrepreneurId: {
                  _id: "$entrepreneur._id",
                  businessName: "$entrepreneur.businessName",
                  skill: "$entrepreneur.skill",
                  location: "$entrepreneur.location",
                  experience: "$entrepreneur.experience",
                  description: "$entrepreneur.description",
                  profileImage: "$entrepreneur.profileImage",
                  available: "$entrepreneur.available",
                  verified: "$entrepreneur.verified",
                  verificationStatus:
                    "$entrepreneur.verificationStatus"
                }
              }
            }
          ],

          total: [
            {
              $count: "count"
            }
          ]
        }
      }
    );

    const collection =
      mongoose.connection.collection("services");

    const [result] =
      await collection
        .aggregate(pipeline)
        .toArray();

    const total =
      result?.total?.[0]?.count || 0;

    const items =
      result?.items || [];

    res.json({
      services: items,

      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        pages: Math.ceil(
          total / safeLimit
        )
      }
    });

  } catch (error) {

    console.error(
      "Service discovery error:",
      error
    );

    res.status(500).json({
      message: "Could not discover services",
      error: error.message
    });
  }
}