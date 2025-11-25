import prisma from "../../prisma/client.js";
import bcrypt from "bcrypt";

// Create a new tenant
export const createTenant = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: email },
    });

    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    const tenant = await prisma.user.create({
      data: {
        name: name,
        email: email,
        phone: phone || null,
        passwordHash: hashed,
        role: "tenant",
        status: "active",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.status(201).json({ message: "Tenant created successfully", tenant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get all tenants
export const getTenants = async (req, res) => {
  try {
    const { status, search } = req.query;

    // Build where clause
    const whereClause = {
      role: "tenant",
    };

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const tenants = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        tenantContracts: {
          where: {
            status: "active",
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
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ tenants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single tenant by ID
export const getTenantById = async (req, res) => {
  try {
    const { id } = req.params;

    const tenant = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: "tenant",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        tenantContracts: {
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
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        tickets: {
          select: {
            id: true,
            title: true,
            status: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!tenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    res.json({ tenant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update a tenant
export const updateTenant = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, status } = req.body;

    // Check if tenant exists
    const existingTenant = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: "tenant",
      },
    });

    if (!existingTenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Build update data object
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) {
      // Check if new email already exists
      const emailExists = await prisma.user.findFirst({
        where: {
          email: email,
          id: { not: parseInt(id) },
        },
      });
      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }
      updateData.Email = email;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (password !== undefined) {
      const hashed = await bcrypt.hash(password, 10);
      updateData.PasswordHash = hashed;
    }
    if (status !== undefined) {
      const validStatuses = ["active", "banned"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid status. Must be one of: active, banned",
        });
      }
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const tenant = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    res.json({ message: "Tenant updated successfully", tenant });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a tenant
export const deleteTenant = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if tenant exists
    const existingTenant = await prisma.user.findFirst({
      where: {
        id: parseInt(id),
        role: "tenant",
      },
      include: {
        tenantContracts: {
          where: {
            status: "active",
          },
        },
        tickets: true,
      },
    });

    if (!existingTenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Check if tenant has active contracts
    if (
      existingTenant.tenantcontracts &&
      existingTenant.tenantcontracts.length > 0
    ) {
      return res.status(400).json({
        message:
          "Cannot delete tenant with active contracts. Please end all contracts first.",
      });
    }

    // Option: Either delete or ban the tenant
    // For safety, we'll ban instead of delete if they have any historical data
    if (existingTenant.tickets && existingTenant.tickets.length > 0) {
      const tenant = await prisma.user.update({
        where: { id: parseInt(id) },
        data: { status: "banned" },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
        },
      });
      return res.json({
        message:
          "Tenant has historical data. Account has been banned instead of deleted.",
        tenant,
      });
    }

    await prisma.user.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: "Tenant deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
