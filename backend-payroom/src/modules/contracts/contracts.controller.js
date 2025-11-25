import prisma from "../../prisma/client.js";

// Create a new contract
export const createContract = async (req, res) => {
  try {
    const { roomId, tenantId, startDate, endDate, price, fileUrl } = req.body;
    const ownerId = req.user.userId;

    // Validate required fields
    if (!roomId || !tenantId || !startDate || !price) {
      return res.status(400).json({
        message: "Room ID, tenant ID, start date, and price are required",
      });
    }

    // Check if room exists and belongs to the owner
    const room = await prisma.rooms.findFirst({
      where: {
        Id: parseInt(roomId),
        houses: {
          OwnerId: ownerId,
        },
      },
    });

    if (!room) {
      return res
        .status(404)
        .json({ message: "Room not found or access denied" });
    }

    // Check if tenant exists
    const tenant = await prisma.users.findFirst({
      where: {
        Id: parseInt(tenantId),
        Role: "tenant",
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Check if room already has an active contract
    const activeContract = await prisma.tenantcontracts.findFirst({
      where: {
        RoomId: parseInt(roomId),
        Status: "active",
      },
    });

    if (activeContract) {
      return res.status(400).json({
        message: "Room already has an active contract",
      });
    }

    // Check if tenant already has an active contract
    const tenantActiveContract = await prisma.tenantcontracts.findFirst({
      where: {
        TenantId: parseInt(tenantId),
        Status: "active",
      },
    });

    if (tenantActiveContract) {
      return res.status(400).json({
        message: "Tenant already has an active contract",
      });
    }

    const contract = await prisma.tenantcontracts.create({
      data: {
        RoomId: parseInt(roomId),
        TenantId: parseInt(tenantId),
        StartDate: new Date(startDate),
        EndDate: endDate ? new Date(endDate) : null,
        Price: parseFloat(price),
        Status: "active",
        FileUrl: fileUrl || null,
      },
      include: {
        rooms: {
          include: {
            houses: {
              select: {
                Id: true,
                Name: true,
                Address: true,
              },
            },
          },
        },
        users: {
          select: {
            Id: true,
            Name: true,
            Email: true,
            Phone: true,
          },
        },
      },
    });

    // Update room status to occupied
    await prisma.rooms.update({
      where: { Id: parseInt(roomId) },
      data: { Status: "occupied" },
    });

    res
      .status(201)
      .json({ message: "Contract created successfully", contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all contracts for owner's properties
export const getContracts = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { status, roomId, tenantId, houseId } = req.query;

    // Build where clause
    const whereClause = {
      rooms: {
        houses: {
          OwnerId: ownerId,
        },
      },
    };

    if (status) {
      whereClause.Status = status;
    }

    if (roomId) {
      whereClause.RoomId = parseInt(roomId);
    }

    if (tenantId) {
      whereClause.TenantId = parseInt(tenantId);
    }

    if (houseId) {
      whereClause.rooms = {
        ...whereClause.rooms,
        HouseId: parseInt(houseId),
      };
    }

    const contracts = await prisma.tenantcontracts.findMany({
      where: whereClause,
      include: {
        rooms: {
          include: {
            houses: {
              select: {
                Id: true,
                Name: true,
                Address: true,
              },
            },
          },
        },
        users: {
          select: {
            Id: true,
            Name: true,
            Email: true,
            Phone: true,
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
        },
      },
      orderBy: { CreatedAt: "desc" },
    });

    res.json({ contracts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single contract by ID
export const getContractById = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;

    const contract = await prisma.tenantcontracts.findFirst({
      where: {
        Id: parseInt(id),
        rooms: {
          houses: {
            OwnerId: ownerId,
          },
        },
      },
      include: {
        rooms: {
          include: {
            houses: {
              select: {
                Id: true,
                Name: true,
                Address: true,
              },
            },
          },
        },
        users: {
          select: {
            Id: true,
            Name: true,
            Email: true,
            Phone: true,
            Status: true,
          },
        },
        invoices: {
          select: {
            Id: true,
            Month: true,
            Year: true,
            Total: true,
            Status: true,
            CreatedAt: true,
          },
          orderBy: {
            CreatedAt: "desc",
          },
        },
      },
    });

    if (!contract) {
      return res
        .status(404)
        .json({ message: "Contract not found or access denied" });
    }

    res.json({ contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a contract
export const updateContract = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, price, status, fileUrl } = req.body;
    const ownerId = req.user.userId;

    // Check if contract exists and belongs to owner's property
    const existingContract = await prisma.tenantcontracts.findFirst({
      where: {
        Id: parseInt(id),
        rooms: {
          houses: {
            OwnerId: ownerId,
          },
        },
      },
      include: {
        rooms: true,
      },
    });

    if (!existingContract) {
      return res
        .status(404)
        .json({ message: "Contract not found or access denied" });
    }

    // Build update data object
    const updateData = {};
    if (startDate !== undefined) updateData.StartDate = new Date(startDate);
    if (endDate !== undefined)
      updateData.EndDate = endDate ? new Date(endDate) : null;
    if (price !== undefined) updateData.Price = parseFloat(price);
    if (fileUrl !== undefined) updateData.FileUrl = fileUrl;

    if (status !== undefined) {
      const validStatuses = ["active", "ended"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Must be one of: active, ended",
        });
      }
      updateData.Status = status;

      // Update room status when contract ends
      if (status === "ended" && existingContract.Status === "active") {
        await prisma.rooms.update({
          where: { Id: existingContract.RoomId },
          data: { Status: "vacant" },
        });
      } else if (status === "active" && existingContract.Status === "ended") {
        await prisma.rooms.update({
          where: { Id: existingContract.RoomId },
          data: { Status: "occupied" },
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const contract = await prisma.tenantcontracts.update({
      where: { Id: parseInt(id) },
      data: updateData,
      include: {
        rooms: {
          include: {
            houses: {
              select: {
                Id: true,
                Name: true,
                Address: true,
              },
            },
          },
        },
        users: {
          select: {
            Id: true,
            Name: true,
            Email: true,
            Phone: true,
          },
        },
      },
    });

    res.json({ message: "Contract updated successfully", contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a contract
export const deleteContract = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.userId;

    // Check if contract exists and belongs to owner's property
    const existingContract = await prisma.tenantcontracts.findFirst({
      where: {
        Id: parseInt(id),
        rooms: {
          houses: {
            OwnerId: ownerId,
          },
        },
      },
      include: {
        invoices: true,
        rooms: true,
      },
    });

    if (!existingContract) {
      return res
        .status(404)
        .json({ message: "Contract not found or access denied" });
    }

    // Check if contract has invoices
    if (existingContract.invoices && existingContract.invoices.length > 0) {
      return res.status(400).json({
        message:
          "Cannot delete contract with existing invoices. Consider ending the contract instead.",
      });
    }

    // Update room status to vacant if contract was active
    if (existingContract.Status === "active") {
      await prisma.rooms.update({
        where: { Id: existingContract.RoomId },
        data: { Status: "vacant" },
      });
    }

    await prisma.tenantcontracts.delete({
      where: { Id: parseInt(id) },
    });

    res.json({ message: "Contract deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// End a contract (helper endpoint)
export const endContract = async (req, res) => {
  try {
    const { id } = req.params;
    const { endDate } = req.body;
    const ownerId = req.user.userId;

    // Check if contract exists and belongs to owner's property
    const existingContract = await prisma.tenantcontracts.findFirst({
      where: {
        Id: parseInt(id),
        rooms: {
          houses: {
            OwnerId: ownerId,
          },
        },
      },
    });

    if (!existingContract) {
      return res
        .status(404)
        .json({ message: "Contract not found or access denied" });
    }

    if (existingContract.Status === "ended") {
      return res.status(400).json({ message: "Contract is already ended" });
    }

    const contract = await prisma.tenantcontracts.update({
      where: { Id: parseInt(id) },
      data: {
        Status: "ended",
        EndDate: endDate ? new Date(endDate) : new Date(),
      },
      include: {
        rooms: {
          include: {
            houses: {
              select: {
                Id: true,
                Name: true,
                Address: true,
              },
            },
          },
        },
        users: {
          select: {
            Id: true,
            Name: true,
            Email: true,
            Phone: true,
          },
        },
      },
    });

    // Update room status to vacant
    await prisma.rooms.update({
      where: { Id: existingContract.RoomId },
      data: { Status: "vacant" },
    });

    res.json({ message: "Contract ended successfully", contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
