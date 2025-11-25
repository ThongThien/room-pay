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
        room: {
          house: {
            ownerId: userId,
          },
        },
      };

      // Apply additional filters for owner
      if (roomId) {
        whereClause.roomId = parseInt(roomId);
      }
      if (contractId) {
        whereClause.contractId = parseInt(contractId);
      }
    } else if (userRole === "tenant") {
      // Tenant sees only their own invoices
      whereClause = {
        tenantContract: {
          tenantId: userId,
        },
      };
    }

    // Common filters for both roles
    if (status) {
      whereClause.status = status;
    }
    if (month) {
      whereClause.month = parseInt(month);
    }
    if (year) {
      whereClause.year = parseInt(year);
    }

    const invoices = await prisma.invoice.findMany({
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
        tenantContract: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        invoiceItems: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
        },
        monthlyReading: {
          select: {
            id: true,
            electricOld: true,
            electricNew: true,
            waterOld: true,
            waterNew: true,
            status: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
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
      id: parseInt(id),
    };

    if (userRole === "owner") {
      // Owner can only see invoices from their houses
      whereClause.rooms = {
        house: {
          ownerid: userId,
        },
      };
    } else if (userRole === "tenant") {
      // Tenant can only see their own invoices
      whereClause.tenantcontracts = {
        tenantid: userId,
      };
    }

    const invoice = await prisma.invoice.findFirst({
      where: whereClause,
      include: {
        room: {
          include: {
            house: {
              select: {
                id: true,
                name: true,
                address: true,
                ownerid: true,
              },
            },
          },
        },
        tenantContract: {
          include: {
            tenant: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        invoiceItems: {
          select: {
            id: true,
            name: true,
            amount: true,
          },
          orderBy: {
            id: "asc",
          },
        },
        monthlyReading: {
          select: {
            id: true,
            electricOld: true,
            electricNew: true,
            electricImage: true,
            waterOld: true,
            waterNew: true,
            waterImage: true,
            status: true,
            createdAt: true,
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

    const stats = await prisma.invoice.aggregate({
      where: {
        tenantContract: {
          tenantid: tenantId,
        },
      },
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    });

    const statusBreakdown = await prisma.invoice.groupBy({
      by: ["Status"],
      where: {
        tenantContract: {
          tenantid: tenantId,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    });

    res.json({
      totalInvoices: stats._count.Id || 0,
      totalamount: stats._sum.Total || 0,
      bystatus: statusBreakdown,
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
      room: {
        house: {
          ownerid: ownerId,
        },
      },
    };

    if (houseId) {
      whereClause.rooms.houses.Id = parseInt(houseId);
    }

    if (year) {
      whereClause.year = parseInt(year);
    }

    const stats = await prisma.invoice.aggregate({
      where: whereClause,
      _sum: {
        total: true,
      },
      _count: {
        id: true,
      },
    });

    const statusBreakdown = await prisma.invoice.groupBy({
      by: ["Status"],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
    });

    const monthlyBreakdown = await prisma.invoice.groupBy({
      by: ["Month", "Year"],
      where: whereClause,
      _count: {
        id: true,
      },
      _sum: {
        total: true,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 12,
    });

    res.json({
      totalInvoices: stats._count.Id || 0,
      totalamount: stats._sum.Total || 0,
      bystatus: statusBreakdown,
      bymonth: monthlyBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


