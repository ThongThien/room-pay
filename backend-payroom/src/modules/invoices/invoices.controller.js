import prisma from "../../prisma/client.js";

// Get all invoices (owner sees all, tenant sees only theirs)
export const getInvoices = async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { status, month, year, roomId, contractId } = req.query;

    let whereClause = {};

    if (userRole === "owner") {
      // Owner sees invoices from their houses
      whereClause = {
        rooms: {
          houses: {
            OwnerId: userId,
          },
        },
      };

      // Apply additional filters for owner
      if (roomId) {
        whereClause.RoomId = parseInt(roomId);
      }
      if (contractId) {
        whereClause.ContractId = parseInt(contractId);
      }
    } else if (userRole === "tenant") {
      // Tenant sees only their own invoices
      whereClause = {
        tenantcontracts: {
          TenantId: userId,
        },
      };
    }

    // Common filters for both roles
    if (status) {
      whereClause.Status = status;
    }
    if (month) {
      whereClause.Month = parseInt(month);
    }
    if (year) {
      whereClause.Year = parseInt(year);
    }

    const invoices = await prisma.invoices.findMany({
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
        },
        invoiceitems: {
          select: {
            Id: true,
            Name: true,
            Amount: true,
          },
        },
        monthlyreadings: {
          select: {
            Id: true,
            ElectricOld: true,
            ElectricNew: true,
            WaterOld: true,
            WaterNew: true,
            Status: true,
          },
        },
      },
      orderBy: [{ Year: "desc" }, { Month: "desc" }, { CreatedAt: "desc" }],
    });

    res.json({ invoices });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single invoice by ID
export const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    let whereClause = {
      Id: parseInt(id),
    };

    if (userRole === "owner") {
      // Owner can only see invoices from their houses
      whereClause.rooms = {
        houses: {
          OwnerId: userId,
        },
      };
    } else if (userRole === "tenant") {
      // Tenant can only see their own invoices
      whereClause.tenantcontracts = {
        TenantId: userId,
      };
    }

    const invoice = await prisma.invoices.findFirst({
      where: whereClause,
      include: {
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
        },
        invoiceitems: {
          select: {
            Id: true,
            Name: true,
            Amount: true,
          },
          orderBy: {
            Id: "asc",
          },
        },
        monthlyreadings: {
          select: {
            Id: true,
            ElectricOld: true,
            ElectricNew: true,
            ElectricImage: true,
            WaterOld: true,
            WaterNew: true,
            WaterImage: true,
            Status: true,
            CreatedAt: true,
          },
        },
      },
    });

    if (!invoice) {
      return res
        .status(404)
        .json({ message: "Invoice not found or access denied" });
    }

    res.json({ invoice });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get invoice statistics (for tenant)
export const getMyInvoiceStats = async (req, res) => {
  try {
    const tenantId = req.user.userId;

    const stats = await prisma.invoices.aggregate({
      where: {
        tenantcontracts: {
          TenantId: tenantId,
        },
      },
      _sum: {
        Total: true,
      },
      _count: {
        Id: true,
      },
    });

    const statusBreakdown = await prisma.invoices.groupBy({
      by: ["Status"],
      where: {
        tenantcontracts: {
          TenantId: tenantId,
        },
      },
      _count: {
        Id: true,
      },
      _sum: {
        Total: true,
      },
    });

    res.json({
      totalInvoices: stats._count.Id || 0,
      totalAmount: stats._sum.Total || 0,
      byStatus: statusBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get invoice statistics (for owner)
export const getOwnerInvoiceStats = async (req, res) => {
  try {
    const ownerId = req.user.userId;
    const { houseId, year } = req.query;

    let whereClause = {
      rooms: {
        houses: {
          OwnerId: ownerId,
        },
      },
    };

    if (houseId) {
      whereClause.rooms.houses.Id = parseInt(houseId);
    }

    if (year) {
      whereClause.Year = parseInt(year);
    }

    const stats = await prisma.invoices.aggregate({
      where: whereClause,
      _sum: {
        Total: true,
      },
      _count: {
        Id: true,
      },
    });

    const statusBreakdown = await prisma.invoices.groupBy({
      by: ["Status"],
      where: whereClause,
      _count: {
        Id: true,
      },
      _sum: {
        Total: true,
      },
    });

    const monthlyBreakdown = await prisma.invoices.groupBy({
      by: ["Month", "Year"],
      where: whereClause,
      _count: {
        Id: true,
      },
      _sum: {
        Total: true,
      },
      orderBy: [{ Year: "desc" }, { Month: "desc" }],
      take: 12,
    });

    res.json({
      totalInvoices: stats._count.Id || 0,
      totalAmount: stats._sum.Total || 0,
      byStatus: statusBreakdown,
      byMonth: monthlyBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


