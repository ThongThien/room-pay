import prisma from "../../prisma/client.js";

// Create a new ticket (tenant only)
export const createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    const tenantId = req.user.userId;

    // Validate required fields
    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required",
      });
    }

    // Get tenant's active contract to find their room
    const activeContract = await prisma.tenantcontracts.findFirst({
      where: {
        TenantId: tenantId,
        Status: "active",
      },
      include: {
        rooms: {
          include: {
            houses: true,
          },
        },
      },
    });

    if (!activeContract) {
      return res.status(404).json({
        message: "You don't have an active contract",
      });
    }

    const ticket = await prisma.tickets.create({
      data: {
        TenantId: tenantId,
        RoomId: activeContract.RoomId,
        Title: title,
        Description: description,
        Status: "pending",
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
        rooms: {
          include: {
            houses: {
              select: {
                Id: true,
                Name: true,
                Address: true,
                OwnerId: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: "Ticket created successfully",
      ticket,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get tickets (tenant sees theirs, owner sees all from their properties)
export const getTickets = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { status, roomId } = req.query;

    let whereClause = {};

    if (userRole === "tenant") {
      // Tenant sees only their tickets
      whereClause.TenantId = userId;
    } else if (userRole === "owner") {
      // Owner sees tickets from their properties
      whereClause.rooms = {
        houses: {
          OwnerId: userId,
        },
      };

      if (roomId) {
        whereClause.RoomId = parseInt(roomId);
      }
    }

    // Common filters
    if (status) {
      whereClause.Status = status;
    }

    const tickets = await prisma.tickets.findMany({
      where: whereClause,
      include: {
        users: {
          select: {
            Id: true,
            Name: true,
            Email: true,
            Phone: true,
          },
        },
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
      },
      orderBy: [
        { Status: "asc" }, // pending first
        { CreatedAt: "desc" },
      ],
    });

    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single ticket by ID
export const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    let whereClause = {
      Id: parseInt(id),
    };

    if (userRole === "tenant") {
      // Tenant can only see their own tickets
      whereClause.TenantId = userId;
    } else if (userRole === "owner") {
      // Owner can only see tickets from their properties
      whereClause.rooms = {
        houses: {
          OwnerId: userId,
        },
      };
    }

    const ticket = await prisma.tickets.findFirst({
      where: whereClause,
      include: {
        users: {
          select: {
            Id: true,
            Name: true,
            Email: true,
            Phone: true,
          },
        },
        rooms: {
          include: {
            houses: {
              select: {
                Id: true,
                Name: true,
                Address: true,
                OwnerId: true,
                users: {
                  select: {
                    Name: true,
                    Email: true,
                    Phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res
        .status(404)
        .json({ message: "Ticket not found or access denied" });
    }

    res.json({ ticket });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update ticket status (owner only)
export const updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const ownerId = req.user.userId;

    // Validate status
    const validStatuses = ["pending", "processing", "done"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be one of: pending, processing, done",
      });
    }

    // Check if ticket exists and belongs to owner's property
    const existingTicket = await prisma.tickets.findFirst({
      where: {
        Id: parseInt(id),
        rooms: {
          houses: {
            OwnerId: ownerId,
          },
        },
      },
    });

    if (!existingTicket) {
      return res
        .status(404)
        .json({ message: "Ticket not found or access denied" });
    }

    const ticket = await prisma.tickets.update({
      where: { Id: parseInt(id) },
      data: { Status: status },
      include: {
        users: {
          select: {
            Id: true,
            Name: true,
            Email: true,
            Phone: true,
          },
        },
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
      },
    });

    res.json({
      message: "Ticket status updated successfully",
      ticket,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete ticket (tenant can delete their own pending tickets)
export const deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    let whereClause = {
      Id: parseInt(id),
    };

    if (userRole === "tenant") {
      // Tenant can only delete their own pending tickets
      whereClause.TenantId = userId;
      whereClause.Status = "pending";
    } else if (userRole === "owner") {
      // Owner can delete tickets from their properties
      whereClause.rooms = {
        houses: {
          OwnerId: userId,
        },
      };
    }

    const existingTicket = await prisma.tickets.findFirst({
      where: whereClause,
    });

    if (!existingTicket) {
      if (userRole === "tenant") {
        return res.status(404).json({
          message:
            "Ticket not found or cannot delete (only pending tickets can be deleted)",
        });
      }
      return res
        .status(404)
        .json({ message: "Ticket not found or access denied" });
    }

    await prisma.tickets.delete({
      where: { Id: parseInt(id) },
    });

    res.json({ message: "Ticket deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get ticket statistics
export const getTicketStats = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    let whereClause = {};

    if (userRole === "tenant") {
      whereClause.TenantId = userId;
    } else if (userRole === "owner") {
      whereClause.rooms = {
        houses: {
          OwnerId: userId,
        },
      };
    }

    const statusBreakdown = await prisma.tickets.groupBy({
      by: ["Status"],
      where: whereClause,
      _count: {
        Id: true,
      },
    });

    const total = await prisma.tickets.count({
      where: whereClause,
    });

    res.json({
      total,
      byStatus: statusBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
