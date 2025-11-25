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

    const house = await prisma.houses.create({
      data: {
        OwnerId: ownerId,
        Name: name,
        Address: address,
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

    const houses = await prisma.houses.findMany({
      where: { OwnerId: ownerId },
      include: {
        rooms: {
          select: {
            Id: true,
            Name: true,
            Status: true,
          },
        },
      },
      orderBy: { CreatedAt: "desc" },
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

    const house = await prisma.houses.findFirst({
      where: {
        Id: parseInt(id),
        OwnerId: ownerId,
      },
      include: {
        rooms: {
          select: {
            Id: true,
            Name: true,
            Floor: true,
            Status: true,
            CreatedAt: true,
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
    const existingHouse = await prisma.houses.findFirst({
      where: {
        Id: parseInt(id),
        OwnerId: ownerId,
      },
    });

    if (!existingHouse) {
      return res
        .status(404)
        .json({ message: "House not found or access denied" });
    }

    // Build update data object
    const updateData = {};
    if (name !== undefined) updateData.Name = name;
    if (address !== undefined) updateData.Address = address;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const house = await prisma.houses.update({
      where: { Id: parseInt(id) },
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
    const existingHouse = await prisma.houses.findFirst({
      where: {
        Id: parseInt(id),
        OwnerId: ownerId,
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

    await prisma.houses.delete({
      where: { Id: parseInt(id) },
    });

    res.json({ message: "House deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
