import prisma from "../../prisma/client.js";

// Create a new house
export const createHouse = async (req, res) => {
  try {
    const { name, address } = req.body;
    const ownerId = req.user.userId;

    // Validate required fields
    if (!name || !address) {
      return res.status(400).json({ message: "Name and address are required" });
    }

    const house = await prisma.house.create({
      data: {
        ownerId: ownerId,
        name: name,
        address: address,
      },
    });

    res.status(201).json({ message: "House created successfully", house });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all houses for the logged-in owner
export const getHouses = async (req, res) => {
  try {
    const ownerId = req.user.userId;

    const houses = await prisma.house.findMany({
      where: { ownerId: ownerId },
      include: {
        rooms: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ houses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single house by ID
export const getHouseById = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;

    const house = await prisma.house.findFirst({
      where: {
        id: parseInt(id),
        ownerId: ownerId,
      },
      include: {
        rooms: {
          select: {
            id: true,
            name: true,
            floor: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    if (!house) {
      return res
        .status(404)
        .json({ message: "House not found or access denied" });
    }

    res.json({ house });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a house
export const updateHouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    const ownerId = req.user.userId;

    // Check if house exists and belongs to the owner
    const existingHouse = await prisma.house.findFirst({
      where: {
        id: parseInt(id),
        ownerId: ownerId,
      },
    });

    if (!existingHouse) {
      return res
        .status(404)
        .json({ message: "House not found or access denied" });
    }

    // Build update data object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const house = await prisma.house.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    res.json({ message: "House updated successfully", house });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a house
export const deleteHouse = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;

    // Check if house exists and belongs to the owner
    const existingHouse = await prisma.house.findFirst({
      where: {
        id: parseInt(id),
        ownerId: ownerId,
      },
      include: {
        rooms: true,
      },
    });

    if (!existingHouse) {
      return res
        .status(404)
        .json({ message: "House not found or access denied" });
    }

    // Check if house has rooms
    if (existingHouse.rooms && existingHouse.rooms.length > 0) {
      return res.status(400).json({
        message:
          "Cannot delete house with existing rooms. Please delete all rooms first.",
      });
    }

    await prisma.house.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "House deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
