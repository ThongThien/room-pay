import prisma from "../../prisma/client.js";

export const submitReading = async (req, res) => {
  try {
    const { cycleId, electricOld, electricNew, waterOld, waterNew } = req.body;
    const tenantId = req.user.userId;

    // Validate input
    if (
      !cycleId ||
      electricOld === undefined ||
      electricNew === undefined ||
      waterOld === undefined ||
      waterNew === undefined
    ) {
      return res.status(400).json({
        message: "Cycle ID and all meter readings are required",
      });
    }

    // Get tenant contract
    const activeContract = await prisma.tenantContract.findFirst({
      where: { tenantId, status: "active" },
      include: { room: true },
    });

    if (!activeContract)
      return res.status(404).json({
        message: "You don't have an active contract",
      });

    // Check cycle
    const cycle = await prisma.readingCycle.findFirst({
      where: { id: Number(cycleId), status: "open" },
    });

    if (!cycle)
      return res.status(404).json({
        message: "Reading cycle not found or is already closed",
      });

    // Check existing reading
    const existingReading = await prisma.monthlyReading.findFirst({
      where: {
        roomId: activeContract.roomId,
        cycleId: Number(cycleId),
      },
    });

    if (existingReading)
      return res.status(400).json({
        message: "Reading for this cycle already submitted",
      });

    // Validate reading increase
    if (Number(electricNew) < Number(electricOld))
      return res.status(400).json({
        message: "New electric reading must be >= old reading",
      });

    if (Number(waterNew) < Number(waterOld))
      return res.status(400).json({
        message: "New water reading must be >= old reading",
      });

    // File uploads
    const electricImage = req.files?.electricImage?.[0]?.path ?? null;
    const waterImage = req.files?.waterImage?.[0]?.path ?? null;

    // Create reading
    const reading = await prisma.monthlyReading.create({
      data: {
        roomId: activeContract.roomId,
        cycleId: Number(cycleId),
        electricOld: Number(electricOld),
        electricNew: Number(electricNew),
        waterOld: Number(waterOld),
        waterNew: Number(waterNew),
        electricImage,
        waterImage,
        status: "submitted",
      },
      include: {
        room: {
          include: {
            house: {
              select: { name: true, address: true },
            },
          },
        },
        readingCycle: true,
      },
    });

    res.status(201).json({
      message: "Meter reading submitted successfully",
      reading,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -----------------------------------------------------
// Get tenant reading history
// -----------------------------------------------------
export const getMyReadings = async (req, res) => {
  try {
    const tenantId = req.user.userId;

    const activeContract = await prisma.tenantContract.findFirst({
      where: { tenantId, status: "active" },
    });

    if (!activeContract)
      return res.status(404).json({
        message: "You don't have an active contract",
      });

    const readings = await prisma.monthlyReading.findMany({
      where: { roomId: activeContract.roomId },
      include: {
        readingCycle: true,
        room: {
          include: {
            house: { select: { name: true, address: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ readings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -----------------------------------------------------
// Get current open reading cycle
// -----------------------------------------------------
export const getCurrentCycle = async (req, res) => {
  try {
    const cycle = await prisma.readingCycle.findFirst({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
    });

    if (!cycle)
      return res.status(404).json({
        message: "No open reading cycle available",
      });

    const tenantId = req.user.userId;
    const activeContract = await prisma.tenantContract.findFirst({
      where: { tenantId, status: "active" },
    });

    let alreadySubmitted = false;

    if (activeContract) {
      const existingReading = await prisma.monthlyReading.findFirst({
        where: {
          roomId: activeContract.roomId,
          cycleId: cycle.id,
        },
      });
      alreadySubmitted = !!existingReading;
    }

    res.json({ cycle, alreadySubmitted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -----------------------------------------------------
// Get last confirmed reading for tenant
// -----------------------------------------------------
export const getLastReading = async (req, res) => {
  try {
    const tenantId = req.user.userId;

    const activeContract = await prisma.tenantContract.findFirst({
      where: { tenantId, status: "active" },
    });

    if (!activeContract)
      return res.status(404).json({
        message: "You don't have an active contract",
      });

    const lastReading = await prisma.monthlyReading.findFirst({
      where: { roomId: activeContract.roomId, status: "confirmed" },
      orderBy: { createdAt: "desc" },
      include: { readingCycle: true },
    });

    res.json({
      lastReading: lastReading ?? null,
      message: lastReading ? undefined : "No previous reading found",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -----------------------------------------------------
// BUSINESS – Owner: Create reading cycle
// -----------------------------------------------------
export const createCycle = async (req, res) => {
  try {
    const { month, year, deadline } = req.body;

    const exists = await prisma.readingCycle.findFirst({
      where: { month, year },
    });

    if (exists)
      throw new Error("Cycle for this month already exists");

    const cycle = await prisma.readingCycle.create({
      data: {
        month,
        year,
        deadline: deadline ? new Date(deadline) : null,
        status: "open",
      },
    });

    res.json({ success: true, cycle });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// -----------------------------------------------------
// BUSINESS – Owner confirm readings manually
// -----------------------------------------------------
export const confirmReading = async (req, res) => {
  try {
    const { cycleId, roomId } = req.params;
    const {
      electricOld,
      electricNew,
      waterOld,
      waterNew,
      electricImage,
      waterImage,
    } = req.body;

    const cycle = await prisma.readingCycle.findUnique({
      where: { id: Number(cycleId) },
    });

    if (!cycle) return res.status(404).json({ message: "Cycle not found" });

    const exist = await prisma.monthlyReading.findFirst({
      where: {
        cycleId: Number(cycleId),
        roomId: Number(roomId),
      },
    });

    let reading;

    // No reading → create new
    if (!exist) {
      reading = await prisma.monthlyReading.create({
        data: {
          cycleId: Number(cycleId),
          roomId: Number(roomId),
          electricOld: electricOld ?? 0,
          electricNew: electricNew ?? 0,
          waterOld: waterOld ?? 0,
          waterNew: waterNew ?? 0,
          electricImage: electricImage || null,
          waterImage: waterImage || null,
          status: "confirmed",
        },
      });

      return res.json({
        message: "Reading created & confirmed by owner",
        reading,
      });
    }

    // Update existing
    reading = await prisma.monthlyReading.update({
      where: { id: exist.id },
      data: {
        electricOld: electricOld ?? exist.electricOld,
        electricNew: electricNew ?? exist.electricNew,
        waterOld: waterOld ?? exist.waterOld,
        waterNew: waterNew ?? exist.waterNew,
        electricImage: electricImage || exist.electricImage,
        waterImage: waterImage || exist.waterImage,
        status: "confirmed",
      },
    });

    return res.json({
      message:
        exist.status === "submitted"
          ? "Reading updated & confirmed"
          : "Reading updated (already confirmed)",
      reading,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// -----------------------------------------------------
// BUSINESS – Get rooms missing readings in a cycle
// -----------------------------------------------------
export const getRoomsMissingReadings = async (req, res) => {
  try {
    const { cycleId } = req.params;

    const allRooms = await prisma.room.findMany();

    const submitted = await prisma.monthlyReading.findMany({
      where: { cycleId: Number(cycleId) },
      select: { roomId: true },
    });

    const submittedIds = submitted.map((x) => x.roomId);

    const missing = allRooms.filter((r) => !submittedIds.includes(r.id));

    res.json({ success: true, missing });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};