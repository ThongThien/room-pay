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
    const room = await prisma.room.findFirst({
      where: {
        id: parseInt(roomId),
        house: {
          ownerId: ownerId,
        },
      },
    });

    if (!room) {
      return res
        .status(404)
        .json({ message: "Room not found or access denied" });
    }

    // Check if tenant exists
    const tenant = await prisma.user.findFirst({
      where: {
        id: parseInt(tenantId),
        role: "tenant",
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Check if room already has an active contract
    const activeContract = await prisma.tenantContract.findFirst({
      where: {
        roomId: parseInt(roomId),
        status: "active",
      },
    });

    if (activeContract) {
      return res.status(400).json({
        message: "Room already has an active contract",
      });
    }

    // Check if tenant already has an active contract
    const tenantActiveContract = await prisma.tenantContract.findFirst({
      where: {
        tenantId: parseInt(tenantId),
        status: "active",
      },
    });

    if (tenantActiveContract) {
      return res.status(400).json({
        message: "Tenant already has an active contract",
      });
    }

    const contract = await prisma.tenantContract.create({
      data: {
        roomId: parseInt(roomId),
        tenantId: parseInt(tenantId),
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        price: parseFloat(price),
        status: "active",
        fileUrl: fileUrl || null,
      },
      include: {
        room: {
          include: {
            house: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Update room status to occupied
    await prisma.room.update({
      where: { id: parseInt(roomId) },
      data: { status: "occupied" },
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
      room: {
        house: {
          ownerId: ownerId,
        },
      },
    };

    if (status) {
      whereClause.status = status;
    }

    if (roomId) {
      whereClause.roomId = parseInt(roomId);
    }

    if (tenantId) {
      whereClause.tenantId = parseInt(tenantId);
    }

    if (houseId) {
      whereClause.rooms = {
        ...whereClause.rooms,
        houseId: parseInt(houseId),
      };
    }

    const contracts = await prisma.tenantContract.findMany({
      where: whereClause,
      include: {
        room: {
          include: {
            house: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        invoices: {
          select: {
            id: true,
            month: true,
            year: true,
            total: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
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

    const contract = await prisma.tenantContract.findFirst({
      where: {
        id: parseInt(id),
        room: {
          house: {
            ownerId: ownerId,
          },
        },
      },
      include: {
        room: {
          include: {
            house: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
        invoices: {
          select: {
            id: true,
            month: true,
            year: true,
            total: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
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
    const existingContract = await prisma.tenantContract.findFirst({
      where: {
        id: parseInt(id),
        room: {
          house: {
            ownerId: ownerId,
          },
        },
      },
      include: {
        room: true,
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
      updateData.status = status;

      // Update room status when contract ends
      if (status === "ended" && existingContract.status === "active") {
        await prisma.room.update({
          where: { id: existingContract.roomId },
          data: { status: "vacant" },
        });
      } else if (status === "active" && existingContract.status === "ended") {
        await prisma.room.update({
          where: { id: existingContract.roomId },
          data: { status: "occupied" },
        });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const contract = await prisma.tenantContract.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        room: {
          include: {
            house: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
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
    const existingContract = await prisma.tenantContract.findFirst({
      where: {
        id: parseInt(id),
        room: {
          house: {
            ownerId: ownerId,
          },
        },
      },
      include: {
        invoices: true,
        room: true,
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
    if (existingContract.status === "active") {
      await prisma.room.update({
        where: { id: existingContract.roomId },
        data: { status: "vacant" },
      });
    }

    await prisma.tenantContract.delete({
      where: { id: parseInt(id) },
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
    const existingContract = await prisma.tenantContract.findFirst({
      where: {
        id: parseInt(id),
        room: {
          house: {
            ownerId: ownerId,
          },
        },
      },
    });

    if (!existingContract) {
      return res
        .status(404)
        .json({ message: "Contract not found or access denied" });
    }

    if (existingContract.status === "ended") {
      return res.status(400).json({ message: "Contract is already ended" });
    }

    const contract = await prisma.tenantContract.update({
      where: { id: parseInt(id) },
      data: {
        status: "ended",
        endDate: endDate ? new Date(endDate) : new Date(),
      },
      include: {
        room: {
          include: {
            house: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    // Update room status to vacant
    await prisma.room.update({
      where: { id: existingContract.roomId },
      data: { status: "vacant" },
    });

    res.json({ message: "Contract ended successfully", contract });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
