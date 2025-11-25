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
    const existing = await prisma.users.findUnique({
      where: { Email: email },
    });

    if (existing) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    const tenant = await prisma.users.create({
      data: {
        Name: name,
        Email: email,
        Phone: phone || null,
        PasswordHash: hashed,
        Role: "tenant",
        Status: "active",
      },
      select: {
        Id: true,
        Name: true,
        Email: true,
        Phone: true,
        Role: true,
        Status: true,
        CreatedAt: true,
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
      Role: "tenant",
    };

    if (status) {
      whereClause.Status = status;
    }

    if (search) {
      whereClause.OR = [
        { Name: { contains: search } },
        { Email: { contains: search } },
        { Phone: { contains: search } },
      ];
    }

    const tenants = await prisma.users.findMany({
      where: whereClause,
      select: {
        Id: true,
        Name: true,
        Email: true,
        Phone: true,
        Status: true,
        CreatedAt: true,
        tenantcontracts: {
          where: {
            Status: "active",
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
          },
        },
      },
      orderBy: { CreatedAt: "desc" },
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

    const tenant = await prisma.users.findFirst({
      where: {
        Id: parseInt(id),
        Role: "tenant",
      },
      select: {
        Id: true,
        Name: true,
        Email: true,
        Phone: true,
        Status: true,
        CreatedAt: true,
        tenantcontracts: {
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
          },
          orderBy: {
            CreatedAt: "desc",
          },
        },
        tickets: {
          select: {
            Id: true,
            Title: true,
            Status: true,
            CreatedAt: true,
          },
          orderBy: {
            CreatedAt: "desc",
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
    const existingTenant = await prisma.users.findFirst({
      where: {
        Id: parseInt(id),
        Role: "tenant",
      },
    });

    if (!existingTenant) {
      return res.status(404).json({ message: "Tenant not found" });
    }

    // Build update data object
    const updateData = {};
    if (name !== undefined) updateData.Name = name;
    if (email !== undefined) {
      // Check if new email already exists
      const emailExists = await prisma.users.findFirst({
        where: {
          Email: email,
          Id: { not: parseInt(id) },
        },
      });
      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }
      updateData.Email = email;
    }
    if (phone !== undefined) updateData.Phone = phone;
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
      updateData.Status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const tenant = await prisma.users.update({
      where: { Id: parseInt(id) },
      data: updateData,
      select: {
        Id: true,
        Name: true,
        Email: true,
        Phone: true,
        Role: true,
        Status: true,
        CreatedAt: true,
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
    const existingTenant = await prisma.users.findFirst({
      where: {
        Id: parseInt(id),
        Role: "tenant",
      },
      include: {
        tenantcontracts: {
          where: {
            Status: "active",
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
      const tenant = await prisma.users.update({
        where: { Id: parseInt(id) },
        data: { Status: "banned" },
        select: {
          Id: true,
          Name: true,
          Email: true,
          Status: true,
        },
      });
      return res.json({
        message:
          "Tenant has historical data. Account has been banned instead of deleted.",
        tenant,
      });
    }

    await prisma.users.delete({
      where: { Id: parseInt(id) },
    });

    res.json({ message: "Tenant deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// business code for owner
export const assignRoom = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { roomId, price } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Validate tenant
      const tenant = await tx.users.findUnique({ where: { Id: Number(tenantId) } });
      if (!tenant) throw new Error("Tenant not found");

      // Validate room
      const room = await tx.rooms.findUnique({ where: { Id: roomId } });
      if (!room) throw new Error("Room not found");
      if (room.Status !== "vacant") throw new Error("Room is not vacant");

      // Check tenant active contract
      const active = await tx.tenantcontracts.findFirst({
        where: { TenantId: Number(tenantId), Status: "active" }
      });
      if (active) throw new Error("Tenant already has an active contract");

      // Create contract
      const contract = await tx.tenantcontracts.create({
        data: {
          TenantId: Number(tenantId),
          RoomId: roomId,
          Price: price,
          Status: "active",
          StartDate: new Date(),
        }
      });

      // Update room → occupied
      await tx.rooms.update({
        where: { Id: roomId },
        data: { Status: "occupied" }
      });

      return contract;
    });

    res.json({ success: true, contract: result });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const moveRoom = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { newRoomId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Find active contract
      const contract = await tx.tenantcontracts.findFirst({
        where: { TenantId: Number(tenantId), Status: "active" }
      });

      if (!contract) throw new Error("Tenant has no active contract");

      // Validate new room
      const newRoom = await tx.rooms.findUnique({ where: { Id: newRoomId } });
      if (!newRoom) throw new Error("New room not found");
      if (newRoom.Status !== "vacant") throw new Error("New room is not vacant");

      // Update old room → vacant
      await tx.rooms.update({
        where: { Id: contract.RoomId },
        data: { Status: "vacant" }
      });

      // Update contract → new room
      const updatedContract = await tx.tenantcontracts.update({
        where: { Id: contract.Id },
        data: { RoomId: newRoomId }
      });

      // Update new room → occupied
      await tx.rooms.update({
        where: { Id: newRoomId },
        data: { Status: "occupied" }
      });

      return updatedContract;
    });

    res.json({ success: true, contract: result });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const checkoutTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;

    const result = await prisma.$transaction(async (tx) => {
      // Find active contract
      const contract = await tx.tenantcontracts.findFirst({
        where: { TenantId: Number(tenantId), Status: "active" }
      });

      if (!contract) throw new Error("Tenant has no active contract");

      // End contract
      const endedContract = await tx.tenantcontracts.update({
        where: { Id: contract.Id },
        data: {
          Status: "ended",
          EndDate: new Date()
        }
      });

      // Update room → vacant
      await tx.rooms.update({
        where: { Id: contract.RoomId },
        data: { Status: "vacant" }
      });

      return endedContract;
    });

    res.json({ success: true, contract: result });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

