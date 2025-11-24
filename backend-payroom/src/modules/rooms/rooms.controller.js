import prisma from "../../prisma/client.js";

// Create a new room
export const createRoom = async (req, res) => {
  try {
    const { houseId, name, floor } = req.body;
    const ownerId = req.user.userId;

    // Validate required fields
    if (!houseId || !name || floor === undefined) {
      return res
        .status(400)
        .json({ message: "House ID, name, and floor are required" });
    }

    // Check if house exists and belongs to the owner
    const house = await prisma.houses.findFirst({
      where: {
        Id: parseInt(houseId),
        OwnerId: ownerId,
      },
    });

    if (!house) {
      return res
        .status(404)
        .json({ message: "House not found or access denied" });
    }

    const room = await prisma.rooms.create({
      data: {
        HouseId: parseInt(houseId),
        Name: name,
        Floor: parseInt(floor),
        Status: "vacant",
      },
    });

    res.status(201).json({ message: "Room created successfully", room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all rooms for owner's houses
export const getRooms = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { houseId, status } = req.query;

    // Build where clause
    const whereClause = {
      houses: {
        OwnerId: ownerId,
      },
    };

    if (houseId) {
      whereClause.HouseId = parseInt(houseId);
    }

    if (status) {
      whereClause.Status = status;
    }

    const rooms = await prisma.rooms.findMany({
      where: whereClause,
      include: {
        houses: {
          select: {
            Id: true,
            Name: true,
            Address: true,
          },
        },
        tenantcontracts: {
          where: {
            Status: "active",
          },
          include: {
            users: {
              select: {
                Id: true,
                Name: true,
                Email: true,
                Phone: true,
              },
            },
          },
        },
      },
      orderBy: [{ HouseId: "asc" }, { Floor: "asc" }],
    });

    res.json({ rooms });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single room by ID
export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;

    const room = await prisma.rooms.findFirst({
      where: {
        Id: parseInt(id),
        houses: {
          OwnerId: ownerId,
        },
      },
      include: {
        houses: {
          select: {
            Id: true,
            Name: true,
            Address: true,
          },
        },
        tenantcontracts: {
          include: {
            users: {
              select: {
                Id: true,
                Name: true,
                Email: true,
                Phone: true,
              },
            },
          },
          orderBy: {
            CreatedAt: "desc",
          },
        },
        invoices: {
          select: {
            Id: true,
            Month: true,
            Year: true,
            Total: true,
            Status: true,
          },
          orderBy: {
            CreatedAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!room) {
      return res
        .status(404)
        .json({ message: "Room not found or access denied" });
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a room
export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, floor, status } = req.body;
    const ownerId = req.user.userId;

    // Check if room exists and belongs to owner's house
    const existingRoom = await prisma.rooms.findFirst({
      where: {
        Id: parseInt(id),
        houses: {
          OwnerId: ownerId,
        },
      },
    });

    if (!existingRoom) {
      return res
        .status(404)
        .json({ message: "Room not found or access denied" });
    }

    // Build update data object
    const updateData = {};
    if (name !== undefined) updateData.Name = name;
    if (floor !== undefined) updateData.Floor = parseInt(floor);
    if (status !== undefined) {
      // Validate status enum
      const validStatuses = ["vacant", "occupied", "closing_soon"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message:
            "Invalid status. Must be one of: vacant, occupied, closing_soon",
        });
      }
      updateData.Status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const room = await prisma.rooms.update({
      where: { Id: parseInt(id) },
      data: updateData,
    });

    res.json({ message: "Room updated successfully", room });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a room
export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;

    // Check if room exists and belongs to owner's house
    const existingRoom = await prisma.rooms.findFirst({
      where: {
        Id: parseInt(id),
        houses: {
          OwnerId: ownerId,
        },
      },
      include: {
        tenantcontracts: true,
        invoices: true,
        tickets: true,
        monthlyreadings: true,
      },
    });

    if (!existingRoom) {
      return res
        .status(404)
        .json({ message: "Room not found or access denied" });
    }

    // Check if room has related data
    const hasRelatedData =
      (existingRoom.tenantcontracts &&
        existingRoom.tenantcontracts.length > 0) ||
      (existingRoom.invoices && existingRoom.invoices.length > 0) ||
      (existingRoom.tickets && existingRoom.tickets.length > 0) ||
      (existingRoom.monthlyreadings && existingRoom.monthlyreadings.length > 0);

    if (hasRelatedData) {
      return res.status(400).json({
        message:
          "Cannot delete room with existing contracts, invoices, tickets, or readings",
      });
    }

    await prisma.rooms.delete({
      where: { Id: parseInt(id) },
    });

    res.json({ message: "Room deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
